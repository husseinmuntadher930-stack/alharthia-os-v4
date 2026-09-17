#!/usr/bin/env python3
"""
Alharthia OS — receive files over Bluetooth (OBEX Object Push server).

Registers the "OBEX Object Push" service directly with BlueZ (ProfileManager1)
and stores every pushed file in ~/Received of the classroom user.
It does not depend on obexd, so it works the same on every BlueZ version.

Run as root (system service):  ALH_USER=teacher python3 alharthia_btrecv.py
"""
import itertools, json, os, pwd, re, socket, struct, sys, threading, time

OPP_UUID = "00001105-0000-1000-8000-00805f9b34fb"
PROFILE_PATH = "/org/alharthia/opp"
USER = os.environ.get("ALH_USER", "teacher")
MAX_PKT = 0x7FFF

# OBEX opcodes / responses / headers
OP_CONNECT, OP_DISCONNECT, OP_PUT, OP_PUT_FINAL, OP_ABORT = 0x80, 0x81, 0x02, 0x82, 0xFF
RSP_CONTINUE, RSP_OK, RSP_BAD, RSP_FORBIDDEN, RSP_NOT_IMPL = 0x90, 0xA0, 0xC0, 0xC3, 0xD1
H_NAME, H_TYPE, H_LENGTH, H_BODY, H_END_BODY = 0x01, 0x42, 0xC3, 0x48, 0x49


STATUS_FILE = os.environ.get("ALH_BT_STATUS", "/run/alharthia/bt-transfers.json")
TRANSFERS = {}
T_LOCK = threading.Lock()
T_IDS = itertools.count(1)
T_LAST = [0.0]


def status_write(force=False):
    """Live transfer list for the interface (read by alharthia_server.py)."""
    now = time.time()
    if not force and now - T_LAST[0] < 0.3:
        return
    T_LAST[0] = now
    with T_LOCK:
        for k in [k for k, t in TRANSFERS.items() if t["state"] != "receiving" and now - t["t"] > 60]:
            TRANSFERS.pop(k, None)
        data = list(TRANSFERS.values())
    try:
        os.makedirs(os.path.dirname(STATUS_FILE), exist_ok=True)
        tmp = STATUS_FILE + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump({"now": now, "items": data}, f, ensure_ascii=False)
        os.chmod(tmp, 0o644)
        os.replace(tmp, STATUS_FILE)
    except OSError as e:
        log("status write failed", e)


def log(*a):
    print("[btrecv]", *a, file=sys.stderr, flush=True)


def dest_dir():
    try:
        pw = pwd.getpwnam(USER)
        d = os.path.join(pw.pw_dir, "Received")
        uid, gid = pw.pw_uid, pw.pw_gid
    except KeyError:
        d, uid, gid = os.path.expanduser("~/Received"), -1, -1
    os.makedirs(d, exist_ok=True)
    return d, uid, gid


def parse_headers(data):
    """Yields (header_id, value) from raw OBEX header bytes."""
    i, n = 0, len(data)
    while i < n:
        hi = data[i]
        kind = hi & 0xC0
        if kind in (0x00, 0x40):
            if i + 3 > n:
                return
            ln = struct.unpack(">H", data[i + 1:i + 3])[0]
            if ln < 3 or i + ln > n:
                return
            raw = data[i + 3:i + ln]
            if kind == 0x00:
                val = raw.decode("utf-16-be", "ignore").rstrip("\x00")
            else:
                val = raw
            yield hi, val
            i += ln
        elif kind == 0x80:
            if i + 2 > n:
                return
            yield hi, data[i + 1]
            i += 2
        else:
            if i + 5 > n:
                return
            yield hi, struct.unpack(">I", data[i + 1:i + 5])[0]
            i += 5


def safe_name(name):
    name = os.path.basename((name or "").replace("\\", "/")).strip()
    name = re.sub(r'[\x00-\x1f<>:"|?*]', "_", name)
    if not name or name in (".", ".."):
        name = time.strftime("bluetooth-%Y%m%d-%H%M%S")
    return name[:180]


def unique_path(folder, name):
    base, ext = os.path.splitext(name)
    p, k = os.path.join(folder, name), 1
    while os.path.exists(p):
        p = os.path.join(folder, f"{base} ({k}){ext}")
        k += 1
    return p


class Session:
    """One OBEX Object Push connection."""

    def __init__(self, sock, peer="", peer_name=""):
        self.sock = sock
        self.peer = peer
        self.peer_name = peer_name or peer
        self.tr = None
        self.seq = sock.type == socket.SOCK_SEQPACKET
        self.buf = b""
        self.file = None
        self.tmp = None
        self.name = None
        self.size = None
        self.got = 0

    # -- low level
    def recv_packet(self):
        if self.seq:
            pkt = self.sock.recv(0xFFFF)
            return pkt or None
        while len(self.buf) < 3:
            chunk = self.sock.recv(0xFFFF)
            if not chunk:
                return None
            self.buf += chunk
        ln = struct.unpack(">H", self.buf[1:3])[0]
        if ln < 3:
            return None
        while len(self.buf) < ln:
            chunk = self.sock.recv(0xFFFF)
            if not chunk:
                return None
            self.buf += chunk
        pkt, self.buf = self.buf[:ln], self.buf[ln:]
        return pkt

    def send(self, code, extra=b""):
        self.sock.sendall(struct.pack(">BH", code, 3 + len(extra)) + extra)

    # -- file handling
    def open_file(self):
        folder, _, _ = dest_dir()
        self.name = safe_name(self.name)
        self.tmp = os.path.join(folder, "." + self.name + ".part")
        self.file = open(self.tmp, "wb")
        self.got = 0
        self.tr = {"id": next(T_IDS), "name": self.name, "from": self.peer_name, "size": self.size or 0,
                   "got": 0, "state": "receiving", "started": time.time(), "t": time.time(), "path": ""}
        with T_LOCK:
            TRANSFERS[self.tr["id"]] = self.tr
        status_write(True)
        log("receiving", self.name, "from", self.peer, "size", self.size)

    def progress(self):
        if self.tr:
            self.tr["got"] = self.got
            self.tr["t"] = time.time()
            status_write()

    def end_transfer(self, state, path=""):
        if self.tr:
            self.tr.update(state=state, got=self.got, path=path, t=time.time())
            self.tr = None
            status_write(True)

    def finish_file(self):
        if not self.file:
            return
        self.file.close()
        folder, uid, gid = dest_dir()
        final = unique_path(folder, self.name)
        os.replace(self.tmp, final)
        try:
            if uid >= 0:
                os.chown(final, uid, gid)
            os.chmod(final, 0o644)
        except OSError:
            pass
        log("saved", final, self.got, "bytes")
        self.end_transfer("done", final)
        self.file = self.tmp = None
        self.name = self.size = None

    def drop_file(self):
        if self.file:
            self.end_transfer("failed")
            try:
                self.file.close()
                os.remove(self.tmp)
            except OSError:
                pass
        self.file = self.tmp = None
        self.name = self.size = None

    # -- protocol
    def run(self):
        try:
            while True:
                pkt = self.recv_packet()
                if pkt is None:
                    break
                op = pkt[0]
                if op == OP_CONNECT:
                    # version 1.0, flags 0, our max packet size
                    self.send(RSP_OK, struct.pack(">BBH", 0x10, 0, MAX_PKT))
                elif op in (OP_PUT, OP_PUT_FINAL):
                    self.handle_put(op, pkt[3:])
                elif op == OP_DISCONNECT:
                    self.drop_file()
                    self.send(RSP_OK)
                    break
                elif op == OP_ABORT:
                    self.drop_file()
                    self.send(RSP_OK)
                else:
                    self.send(RSP_NOT_IMPL if op & 0x80 else RSP_CONTINUE)
        except OSError as e:
            log("connection error", e)
        finally:
            self.drop_file()
            try:
                self.sock.close()
            except OSError:
                pass

    def handle_put(self, op, data):
        body = []
        for hi, val in parse_headers(data):
            if hi == H_NAME:
                self.name = val
            elif hi == H_LENGTH:
                self.size = val
            elif hi in (H_BODY, H_END_BODY):
                body.append(val)
        if self.file is None:
            if op == OP_PUT_FINAL and not body:
                # a PUT without body is a "delete" request: not allowed
                self.send(RSP_FORBIDDEN)
                return
            self.open_file()
        for b in body:
            self.file.write(b)
            self.got += len(b)
        self.progress()
        if op == OP_PUT_FINAL:
            self.finish_file()
            self.send(RSP_OK)
        else:
            self.send(RSP_CONTINUE)


def serve(sock, peer="", peer_name=""):
    threading.Thread(target=Session(sock, peer, peer_name).run, daemon=True).start()


def main():
    import dbus
    import dbus.service
    import dbus.mainloop.glib
    from gi.repository import GLib

    dbus.mainloop.glib.DBusGMainLoop(set_as_default=True)
    bus = dbus.SystemBus()

    class Profile(dbus.service.Object):
        @dbus.service.method("org.bluez.Profile1", in_signature="", out_signature="")
        def Release(self):
            log("released by bluez")

        @dbus.service.method("org.bluez.Profile1", in_signature="oha{sv}", out_signature="")
        def NewConnection(self, device, fd, props):
            fd = fd.take()
            try:
                sock = socket.socket(fileno=fd)
            except OSError as e:
                log("bad socket", e)
                os.close(fd)
                return
            sock.setblocking(True)
            peer = str(device).rsplit("/", 1)[-1].replace("dev_", "").replace("_", ":")
            name = ""
            try:
                props_if = dbus.Interface(bus.get_object("org.bluez", device), "org.freedesktop.DBus.Properties")
                name = str(props_if.Get("org.bluez.Device1", "Alias"))
            except Exception:  # noqa
                pass
            log("new connection from", peer, name)
            serve(sock, peer, name)

        @dbus.service.method("org.bluez.Profile1", in_signature="o", out_signature="")
        def RequestDisconnection(self, device):
            pass

    Profile(bus, PROFILE_PATH)
    opts = {
        "Name": "Alharthia File Receive",
        "Role": "server",
        "Channel": dbus.UInt16(9),
        "PSM": dbus.UInt16(0),            # RFCOMM only
        "RequireAuthentication": False,
        "RequireAuthorization": False,
        "AutoConnect": False,
    }

    def register():
        try:
            mgr = dbus.Interface(bus.get_object("org.bluez", "/org/bluez"), "org.bluez.ProfileManager1")
            mgr.RegisterProfile(PROFILE_PATH, OPP_UUID, opts)
            log("OBEX Object Push registered — files go to", dest_dir()[0])
        except dbus.exceptions.DBusException as e:
            log("register failed:", e.get_dbus_message() or e)
            if "already registered" in str(e).lower():
                log("another program (obexd?) already owns Object Push — stop it first")
        return False

    def owner_changed(new_owner):
        if new_owner:
            GLib.timeout_add(1500, register)

    bus.watch_name_owner("org.bluez", owner_changed)
    dest_dir()
    status_write(True)
    GLib.MainLoop().run()


if __name__ == "__main__":
    main()
