#!/usr/bin/env python3
"""
Alharthia OS — local system service.

Serves the classroom UI (ui/index.html) on http://127.0.0.1:8765 and exposes a
small JSON API that connects the UI to the real system: files, Wi-Fi,
Bluetooth, USB storage, app launching/installing, volume and power.

Runs as the logged-in teacher user. Anything that needs root goes through
/usr/lib/alharthia/alharthia-helper (allow-listed in sudoers).
Only standard-library Python is used, so it works on any Raspberry Pi OS.
"""
import json, os, re, secrets, shutil, socket, subprocess, sys, threading, time, uuid, mimetypes
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, quote

VERSION = "1.7.0"
HOST, PORT = "127.0.0.1", int(os.environ.get("ALH_PORT", "8765"))
BASE = os.path.dirname(os.path.abspath(__file__))
UI_DIR = os.path.join(BASE, "ui")
CATALOG = json.load(open(os.path.join(BASE, "catalog.json"), encoding="utf-8"))
HOME = os.path.expanduser("~")
USER = os.environ.get("USER") or os.path.basename(HOME)
HELPER = os.environ.get("ALH_HELPER", "/usr/lib/alharthia/alharthia-helper")
TOKEN = secrets.token_urlsafe(24)

# Arabic folder layout inside the teacher's home
FOLDERS = {
    "docs": "Documents",
    "boards": "Documents/السبورات",
    "down": "Downloads",
    "pics": "Pictures",
    "vids": "Videos",
    "bt": "Received",
}
MEDIA_ROOTS = [f"/media/{USER}", "/media", f"/run/media/{USER}"]


def ensure_folders():
    for rel in FOLDERS.values():
        os.makedirs(os.path.join(HOME, rel), exist_ok=True)


def run(cmd, timeout=20, check=False):
    """Run a command, never raise for a missing binary."""
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        if check and p.returncode != 0:
            raise RuntimeError((p.stderr or p.stdout).strip() or f"{cmd[0]} failed")
        return p.returncode, p.stdout, p.stderr
    except FileNotFoundError:
        if check:
            raise RuntimeError(f"الأمر {cmd[0]} غير موجود")
        return 127, "", f"{cmd[0]} not found"
    except subprocess.TimeoutExpired:
        if check:
            raise RuntimeError("انتهت مهلة الأمر")
        return 124, "", "timeout"


def has(binary):
    return shutil.which(binary) is not None


# ---------------------------------------------------------------- paths
def allowed_roots():
    roots = [os.path.realpath(HOME)]
    for m in MEDIA_ROOTS:
        if os.path.isdir(m):
            roots.append(os.path.realpath(m))
    return roots


def safe_path(p, must_exist=True):
    if not p:
        raise PermissionError("مسار فارغ")
    real = os.path.realpath(os.path.expanduser(p))
    if not any(real == r or real.startswith(r + os.sep) for r in allowed_roots()):
        raise PermissionError("المسار خارج المجلدات المسموحة")
    if must_exist and not os.path.exists(real):
        raise FileNotFoundError("الملف غير موجود")
    return real


def entry(path):
    st = os.stat(path)
    name = os.path.basename(path)
    ext = os.path.splitext(name)[1].lower().lstrip(".")
    return {"name": name, "path": path, "dir": os.path.isdir(path), "size": st.st_size,
            "mtime": int(st.st_mtime * 1000), "ext": ext}


def dir_size(path, limit=20000):
    total, n = 0, 0
    for root, dirs, files in os.walk(path):
        for f in files:
            try:
                total += os.lstat(os.path.join(root, f)).st_size
            except OSError:
                pass
            n += 1
            if n > limit:
                return total
    return total


# ---------------------------------------------------------------- storage
def lsblk():
    code, out, _ = run(["lsblk", "-J", "-b", "-o", "NAME,PATH,SIZE,FSTYPE,LABEL,MOUNTPOINT,RM,TRAN,MODEL,TYPE,HOTPLUG"])
    if code != 0:
        return []
    try:
        return json.loads(out).get("blockdevices", [])
    except ValueError:
        return []


def usb_devices():
    res = []
    for disk in lsblk():
        usb = disk.get("tran") == "usb" or str(disk.get("rm")) in ("1", "True", "true") or str(disk.get("hotplug")) in ("1", "True", "true")
        if not usb or disk.get("type") != "disk":
            continue
        parts = disk.get("children") or [disk]
        for p in parts:
            if not p.get("fstype"):
                continue
            mp = p.get("mountpoint")
            used = free = None
            if mp and os.path.isdir(mp):
                du = shutil.disk_usage(mp)
                used, free = du.used, du.free
            res.append({"dev": p.get("path"), "disk": disk.get("path"), "label": p.get("label") or disk.get("model") or "USB",
                        "model": (disk.get("model") or "").strip(), "fstype": p.get("fstype"), "size": int(p.get("size") or 0),
                        "mount": mp, "used": used, "free": free})
    return res


def automount():
    """Mount any unmounted USB partitions (udisks2) so they show up in the explorer."""
    for d in usb_devices():
        if not d["mount"] and has("udisksctl"):
            run(["udisksctl", "mount", "--no-user-interaction", "-b", d["dev"]], timeout=15)


def nvme_info():
    info = {"model": "", "temp": None, "health": None}
    for dev in lsblk():
        if dev.get("path", "").startswith("/dev/nvme"):
            info["model"] = (dev.get("model") or "").strip()
    try:
        for hw in os.listdir("/sys/class/hwmon"):
            base = f"/sys/class/hwmon/{hw}"
            if open(f"{base}/name").read().strip() == "nvme":
                info["temp"] = int(open(f"{base}/temp1_input").read()) / 1000
    except OSError:
        pass
    return info


def root_fstype():
    code, out, _ = run(["findmnt", "-n", "-o", "FSTYPE,SOURCE", "/"])
    parts = out.split()
    return (parts[0] if parts else "ext4"), (parts[1] if len(parts) > 1 else "")


# ---------------------------------------------------------------- wifi
def nm_split(line):
    return re.split(r"(?<!\\):", line)


def wifi_state():
    if not has("nmcli"):
        return {"available": False, "enabled": False, "current": None, "nets": []}
    _, radio, _ = run(["nmcli", "-t", "radio", "wifi"])
    enabled = radio.strip() == "enabled"
    nets, current = [], None
    if enabled:
        _, out, _ = run(["nmcli", "-t", "-f", "IN-USE,SSID,SIGNAL,SECURITY", "dev", "wifi", "list", "--rescan", "auto"], timeout=25)
        seen = {}
        for line in out.splitlines():
            f = nm_split(line)
            if len(f) < 4 or not f[1]:
                continue
            ssid = f[1].replace("\\:", ":")
            n = {"ssid": ssid, "signal": int(f[2] or 0), "secure": f[3] not in ("", "--"), "active": f[0] == "*"}
            if n["active"]:
                current = ssid
            if ssid not in seen or n["signal"] > seen[ssid]["signal"] or n["active"]:
                seen[ssid] = n
        nets = sorted(seen.values(), key=lambda n: (not n["active"], -n["signal"]))
    _, ip, _ = run(["hostname", "-I"])
    return {"available": True, "enabled": enabled, "current": current, "nets": nets, "ip": ip.split()[0] if ip.split() else ""}


# ---------------------------------------------------------------- bluetooth
def btctl(*args, timeout=6):
    return run(["bluetoothctl", *args], timeout=timeout)


def bt_state():
    if not has("bluetoothctl"):
        return {"available": False}
    _, show, _ = btctl("show")
    def field(k):
        m = re.search(rf"^\s*{k}:\s*(.+)$", show, re.M)
        return m.group(1).strip() if m else ""
    paired = []
    _, out, _ = btctl("devices", "Paired")
    if "Paired" in out and "Invalid" in out:
        _, out, _ = btctl("paired-devices")
    for line in out.splitlines():
        m = re.match(r"Device ([0-9A-F:]{17}) (.+)", line.strip())
        if m:
            _, info, _ = btctl("info", m.group(1))
            paired.append({"mac": m.group(1), "name": m.group(2), "connected": "Connected: yes" in info,
                           "icon": (re.search(r"Icon:\s*(\S+)", info) or [None, ""])[1]})
    return {"available": bool(show.strip()), "powered": field("Powered") == "yes", "discoverable": field("Discoverable") == "yes",
            "name": field("Alias") or field("Name"), "paired": paired,
            "receiving": os.path.exists("/opt/alharthia/alharthia_btrecv.py") or os.path.exists("/usr/libexec/bluetooth/obexd")}


BT_SCAN = {"proc": None, "until": 0}


def bt_scan_start(seconds=40):
    """Keeps discovery running in the background so devices show up as soon as they are found."""
    p = BT_SCAN["proc"]
    BT_SCAN["until"] = time.time() + seconds
    if p and p.poll() is None:
        return
    try:
        p = subprocess.Popen(["bluetoothctl"], stdin=subprocess.PIPE, stdout=subprocess.DEVNULL,
                             stderr=subprocess.DEVNULL, text=True, start_new_session=True)
        p.stdin.write("scan on\n"); p.stdin.flush()
    except OSError:
        return
    BT_SCAN["proc"] = p

    def stopper():
        while time.time() < BT_SCAN["until"] and p.poll() is None:
            time.sleep(1)
        try:
            p.stdin.write("scan off\nquit\n"); p.stdin.flush()
            p.wait(timeout=5)
        except Exception:  # noqa
            p.kill()
    threading.Thread(target=stopper, daemon=True).start()


def bt_scanning():
    p = BT_SCAN["proc"]
    return bool(p and p.poll() is None and time.time() < BT_SCAN["until"])


def bt_scan(seconds=0):
    _, out, _ = btctl("devices", timeout=4)
    _, pout, _ = btctl("devices", "Paired", timeout=4)
    paired = set(re.findall(r"([0-9A-F:]{17})", pout))
    devs = []
    for line in out.splitlines():
        m = re.match(r"Device ([0-9A-F:]{17}) (.+)", line.strip())
        if m and m.group(1) not in paired and not re.fullmatch(r"[0-9A-F-]{17}", m.group(2)):
            devs.append({"mac": m.group(1), "name": m.group(2)})
    return devs


RECEIVED_SEEN = {}
RECEIVED_DONE = set()


def received_since(ts):
    folder = os.path.join(HOME, FOLDERS["bt"])
    items = []
    for name in os.listdir(folder):
        if name.startswith("."):
            continue
        p = os.path.join(folder, name)
        try:
            st = os.stat(p)
        except OSError:
            continue
        if st.st_mtime * 1000 > ts and os.path.isfile(p):
            # ignore files still being written
            if p in RECEIVED_DONE:
                continue
            if RECEIVED_SEEN.get(p) != st.st_size:
                RECEIVED_SEEN[p] = st.st_size
                continue
            RECEIVED_DONE.add(p)
            items.append(entry(p))
    return items


# ---------------------------------------------------------------- apps & jobs
JOBS = {}


def find_bin(spec):
    for b in spec.get("bin", []):
        path = shutil.which(b)
        if path:
            return path
    return None


def app_installed(app_id):
    spec = CATALOG["store"].get(app_id)
    if not spec:
        return False
    if "web" in spec:
        return None  # web apps are tracked by the UI only
    if "flatpak" in spec:
        code, out, _ = run(["flatpak", "info", spec["flatpak"]])
        return code == 0
    return find_bin(spec) is not None


def launch(app_id=None, path=None, url=None):
    env = dict(os.environ)
    if url:
        spec = CATALOG["builtin"]["chromium"]
        exe = find_bin(spec)
        if not exe:
            raise RuntimeError("Chromium غير مثبت")
        cmd = [exe, *spec["args"], url]
    else:
        spec = CATALOG["builtin"].get(app_id) or CATALOG["store"].get(app_id)
        if not spec:
            raise RuntimeError("تطبيق غير معروف")
        if "web" in spec:
            return launch(url=spec["web"])
        exe = find_bin(spec)
        if not exe:
            raise RuntimeError("البرنامج غير مثبت")
        cmd = [exe, *spec.get("args", [])]
        if path:
            cmd.append(safe_path(path))
    subprocess.Popen(cmd, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    return {"ok": True}


def start_job(kind, args):
    jid = uuid.uuid4().hex[:10]
    job = {"id": jid, "kind": kind, "state": "running", "progress": 0.02, "log": "", "error": None}
    JOBS[jid] = job

    def worker():
        try:
            cmd = ["sudo", "-n", HELPER, kind, *args]
            if os.environ.get("ALH_FAKE_HELPER"):
                cmd = [sys.executable, "-c", "import time\nfor i in range(10):\n print('progress',i*10,flush=True);time.sleep(.3)"]
            p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
            for line in p.stdout:
                job["log"] = (job["log"] + line)[-4000:]
                m = re.search(r"(\d{1,3})%", line) or re.search(r"progress (\d+)", line)
                if m:
                    job["progress"] = max(job["progress"], min(0.98, int(m.group(1)) / 100))
                elif "Unpacking" in line or "Setting up" in line or "Get:" in line:
                    job["progress"] = min(0.95, job["progress"] + 0.01)
            p.wait()
            if p.returncode != 0:
                raise RuntimeError(job["log"].strip().splitlines()[-1] if job["log"].strip() else f"exit {p.returncode}")
            job["progress"] = 1.0
            job["state"] = "done"
        except Exception as e:  # noqa
            job["state"] = "error"
            job["error"] = str(e)

    threading.Thread(target=worker, daemon=True).start()
    return job


def install_args(app_id):
    spec = CATALOG["store"].get(app_id)
    if not spec:
        raise RuntimeError("تطبيق غير معروف")
    if "flatpak" in spec:
        return ["flatpak-install", spec["flatpak"]]
    return ["install", app_id]


def remove_args(app_id):
    spec = CATALOG["store"].get(app_id)
    if not spec:
        raise RuntimeError("تطبيق غير معروف")
    if "flatpak" in spec:
        return ["flatpak-remove", spec["flatpak"]]
    return ["remove", app_id]


# ---------------------------------------------------------------- system info
def read(path, default=""):
    try:
        return open(path, encoding="utf-8", errors="ignore").read().strip("\x00\n ")
    except OSError:
        return default


def sys_info():
    mem = read("/proc/meminfo")
    total = re.search(r"MemTotal:\s+(\d+)", mem)
    temp = read("/sys/class/thermal/thermal_zone0/temp")
    osr = dict(re.findall(r'^(\w+)="?([^"\n]*)"?$', read("/etc/os-release"), re.M))
    up = float(read("/proc/uptime", "0").split()[0] or 0)
    du = shutil.disk_usage("/")
    return {"model": read("/proc/device-tree/model") or socket.gethostname(), "ram": int(total.group(1)) * 1024 if total else 0,
            "temp": int(temp) / 1000 if temp.isdigit() else None, "os": osr.get("PRETTY_NAME", ""), "kernel": os.uname().release,
            "hostname": socket.gethostname(), "uptime": up, "disk_total": du.total, "disk_used": du.used, "version": VERSION,
            "user": USER, "arch": os.uname().machine}


def volume(value=None):
    if value is not None and has("wpctl"):
        run(["wpctl", "set-volume", "@DEFAULT_AUDIO_SINK@", f"{max(0, min(100, int(value))) / 100:.2f}"])
    if has("wpctl"):
        _, out, _ = run(["wpctl", "get-volume", "@DEFAULT_AUDIO_SINK@"])
        m = re.search(r"([\d.]+)", out)
        if m:
            return {"value": round(float(m.group(1)) * 100), "muted": "MUTED" in out}
    return {"value": None}


def _sink_kind(name, desc):
    t = (name + " " + desc).lower()
    if "bluez" in t or "bluetooth" in t:
        return "bt"
    if "hdmi" in t:
        return "hdmi"
    if "usb" in t:
        return "usb"
    if "headphone" in t or "analog" in t:
        return "jack"
    return "speaker"


def audio_list():
    sinks = []
    if has("pactl"):
        _, cur, _ = run(["pactl", "get-default-sink"], timeout=4)
        cur = cur.strip()
        code, out, _ = run(["pactl", "-f", "json", "list", "sinks"], timeout=5)
        try:
            for x in json.loads(out) if code == 0 else []:
                name, desc = x.get("name", ""), x.get("description", "") or x.get("name", "")
                sinks.append({"id": name, "name": desc, "kind": _sink_kind(name, desc), "default": name == cur})
        except ValueError:
            pass
        if sinks:
            return {"available": True, "sinks": sinks, "tool": "pactl"}
    if has("wpctl"):
        _, out, _ = run(["wpctl", "status"], timeout=5)
        sec = False
        for line in out.splitlines():
            if re.search(r"Sinks:", line):
                sec = True
                continue
            if sec:
                m = re.search(r"(\*)?\s*(\d+)\.\s+(.+?)(\s+\[vol:.*\])?\s*$", line)
                if not m:
                    if re.search(r"(Sources|Filters|Streams):", line) or not line.strip(" │├└─"):
                        break
                    continue
                desc = m.group(3).strip()
                sinks.append({"id": m.group(2), "name": desc, "kind": _sink_kind("", desc), "default": bool(m.group(1))})
        return {"available": bool(sinks), "sinks": sinks, "tool": "wpctl"}
    return {"available": False, "sinks": []}


def audio_set(sink_id):
    if not re.fullmatch(r"[\w.:@-]{1,200}", sink_id):
        raise PermissionError("جهاز غير صالح")
    if has("pactl") and not sink_id.isdigit():
        run(["pactl", "set-default-sink", sink_id], timeout=5)
        _, out, _ = run(["pactl", "list", "short", "sink-inputs"], timeout=5)
        for line in out.splitlines():
            sid = line.split("\t")[0].strip()
            if sid.isdigit():
                run(["pactl", "move-sink-input", sid, sink_id], timeout=5)
    elif has("wpctl"):
        run(["wpctl", "set-default", sink_id], timeout=5)


# ---------------------------------------------------------------- terminal (inside the interface)
TERMS = {}
TERM_LOCK = threading.Lock()
TERM_KEEP = 512 * 1024


class Term:
    def __init__(self, cols, rows):
        import pty
        self.id = uuid.uuid4().hex[:12]
        self.buf = bytearray()
        self.base = 0          # absolute offset of buf[0]
        self.cond = threading.Condition()
        self.alive = True
        shell = os.environ.get("SHELL") or "/bin/bash"
        if not os.path.exists(shell):
            shell = "/bin/sh"
        pid, fd = pty.fork()
        if pid == 0:
            try:
                os.chdir(HOME)
                env = dict(os.environ, TERM="xterm-256color", COLORTERM="truecolor",
                           LANG=os.environ.get("LANG") or "C.UTF-8")
                env.pop("ALH_DEBUG", None)
                os.execvpe(shell, [shell, "-l"], env)
            finally:
                os._exit(127)
        self.pid, self.fd = pid, fd
        self.resize(cols, rows)
        threading.Thread(target=self.reader, daemon=True).start()

    def resize(self, cols, rows):
        import fcntl, struct, termios
        cols = max(10, min(400, int(cols or 80)))
        rows = max(4, min(200, int(rows or 24)))
        try:
            fcntl.ioctl(self.fd, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))
        except OSError:
            pass

    def reader(self):
        while True:
            try:
                data = os.read(self.fd, 65536)
            except OSError:
                data = b""
            with self.cond:
                if not data:
                    self.alive = False
                    self.cond.notify_all()
                    break
                self.buf += data
                if len(self.buf) > TERM_KEEP * 2:
                    cut = len(self.buf) - TERM_KEEP
                    del self.buf[:cut]
                    self.base += cut
                self.cond.notify_all()
        try:
            os.waitpid(self.pid, 0)
        except OSError:
            pass
        try:
            os.close(self.fd)
        except OSError:
            pass

    def end(self):
        return self.base + len(self.buf)

    def read_from(self, pos, timeout=15):
        with self.cond:
            if pos >= self.end() and self.alive:
                self.cond.wait(timeout)
            pos = max(pos, self.base)
            return bytes(self.buf[pos - self.base:]), self.end(), self.alive

    def write(self, text):
        if self.alive:
            try:
                os.write(self.fd, text.encode("utf-8", "replace"))
            except OSError:
                pass

    def close(self):
        import signal
        for sig in (signal.SIGHUP, signal.SIGKILL):
            try:
                os.kill(self.pid, sig)
            except OSError:
                break
            time.sleep(0.2)
            if not self.alive:
                break


def term_get(tid):
    t = TERMS.get(tid or "")
    if not t:
        raise FileNotFoundError("الجلسة انتهت")
    return t


# ---------------------------------------------------------------- HTTP
class Handler(BaseHTTPRequestHandler):
    server_version = "Alharthia/" + VERSION

    def log_message(self, fmt, *args):
        if os.environ.get("ALH_DEBUG"):
            sys.stderr.write("[http] " + (fmt % args) + "\n")

    # -- helpers
    def send_json(self, obj, status=200):
        data = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def fail(self, msg, status=400):
        self.send_json({"error": str(msg)}, status)

    def body(self):
        n = int(self.headers.get("Content-Length") or 0)
        return self.rfile.read(n) if n else b""

    def jbody(self):
        raw = self.body()
        return json.loads(raw.decode() or "{}") if raw else {}

    def host_ok(self):
        return self.headers.get("Host", "") in (f"{HOST}:{PORT}", f"localhost:{PORT}")

    def token_ok(self, q):
        return secrets.compare_digest(self.headers.get("X-Alharthia-Token", "") or (q.get("t") or [""])[0], TOKEN)

    def send_file(self, path, download=False):
        ctype = mimetypes.guess_type(path)[0] or "application/octet-stream"
        size = os.path.getsize(path)
        rng = re.fullmatch(r"bytes=(\d*)-(\d*)", self.headers.get("Range", "").strip())
        if rng and size and (rng.group(1) or rng.group(2)):
            if rng.group(1):
                start = int(rng.group(1)); end = int(rng.group(2)) if rng.group(2) else size - 1
            else:
                start = max(0, size - int(rng.group(2))); end = size - 1
            end = min(end, size - 1)
            if start > end:
                self.send_response(416)
                self.send_header("Content-Range", f"bytes */{size}")
                self.end_headers()
                return
            self.send_response(206)
            self.send_header("Content-Type", ctype)
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
            self.send_header("Content-Length", str(end - start + 1))
            self.end_headers()
            with open(path, "rb") as f:
                f.seek(start)
                left = end - start + 1
                while left > 0:
                    chunk = f.read(min(256 * 1024, left))
                    if not chunk:
                        break
                    try:
                        self.wfile.write(chunk)
                    except (BrokenPipeError, ConnectionResetError):
                        return
                    left -= len(chunk)
            return
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(size))
        if download:
            self.send_header("Content-Disposition", "attachment; filename*=UTF-8''" + quote(os.path.basename(path)))
        self.end_headers()
        with open(path, "rb") as f:
            try:
                shutil.copyfileobj(f, self.wfile, 256 * 1024)
            except (BrokenPipeError, ConnectionResetError):
                pass

    # -- static UI
    def serve_static(self, rel):
        if rel in ("", "/", "/index.html"):
            html = open(os.path.join(UI_DIR, "index.html"), encoding="utf-8").read()
            inject = f'<script>window.ALH_TOKEN="{TOKEN}";window.ALH_NATIVE=true;</script>'
            html = html.replace("<head>", "<head>" + inject, 1)
            data = html.encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(data)
            return
        real = os.path.realpath(os.path.join(UI_DIR, rel.lstrip("/")))
        if not real.startswith(os.path.realpath(UI_DIR) + os.sep) or not os.path.isfile(real):
            return self.fail("not found", 404)
        if real.endswith(".mjs"):
            data = open(real, "rb").read()
            self.send_response(200)
            self.send_header("Content-Type", "text/javascript")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "max-age=86400")
            self.end_headers()
            self.wfile.write(data)
            return
        self.send_file(real)

    # -- routing
    def do_GET(self):
        self.route("GET")

    def do_POST(self):
        self.route("POST")

    def route(self, method):
        if not self.host_ok():
            return self.fail("bad host", 403)
        u = urlparse(self.path)
        q = parse_qs(u.query)
        if not u.path.startswith("/api/"):
            if method != "GET":
                return self.fail("method", 405)
            return self.serve_static(u.path)
        if not self.token_ok(q):
            return self.fail("unauthorized", 401)
        name = u.path[5:].replace("/", "_")
        fn = getattr(self, f"api_{name}", None)
        if not fn:
            return self.fail("unknown endpoint", 404)
        try:
            res = fn(method, q)
            if res is not None:
                self.send_json(res)
        except PermissionError as e:
            self.fail(e, 403)
        except FileNotFoundError as e:
            self.fail(e, 404)
        except Exception as e:  # noqa
            self.fail(e, 500)

    # -- endpoints
    def api_ping(self, m, q):
        return {"ok": True, "version": VERSION, "user": USER, "home": HOME,
                "folders": {k: os.path.join(HOME, v) for k, v in FOLDERS.items()}}

    def api_sys(self, m, q):
        return sys_info()

    # files
    def api_fs_roots(self, m, q):
        automount()
        du = shutil.disk_usage(HOME)
        roots = [{"id": "internal", "name": "الذاكرة الداخلية", "path": HOME, "total": du.total, "used": du.used, "free": du.free}]
        for d in usb_devices():
            if d["mount"]:
                roots.append({"id": "usb:" + d["dev"], "dev": d["dev"], "name": d["label"], "path": d["mount"],
                              "total": d["size"], "used": d["used"], "free": d["free"], "fstype": d["fstype"]})
        return {"roots": roots, "folders": {k: os.path.join(HOME, v) for k, v in FOLDERS.items()}}

    def api_fs_list(self, m, q):
        path = safe_path(q.get("path", [HOME])[0])
        items = []
        for name in os.listdir(path):
            if name.startswith("."):
                continue
            try:
                items.append(entry(os.path.join(path, name)))
            except OSError:
                pass
        for it in items:
            if it["dir"]:
                try:
                    it["count"] = len([n for n in os.listdir(it["path"]) if not n.startswith(".")])
                except OSError:
                    it["count"] = 0
        return {"path": path, "items": items}

    def api_fs_search(self, m, q):
        root = safe_path(q.get("path", [HOME])[0])
        exts = set(q.get("ext", [""])[0].lower().split(","))
        text = q.get("q", [""])[0].lower()
        res = []
        for base, dirs, files in os.walk(root):
            dirs[:] = [d for d in dirs if not d.startswith(".")]
            for f in files:
                if f.startswith("."):
                    continue
                e = os.path.splitext(f)[1].lower().lstrip(".")
                if (exts == {""} or e in exts) and (not text or text in f.lower()):
                    try:
                        res.append(entry(os.path.join(base, f)))
                    except OSError:
                        pass
                if len(res) >= 300:
                    return {"items": res}
        return {"items": res}

    def api_fs_file(self, m, q):
        path = safe_path(q.get("path", [""])[0])
        if os.path.isdir(path):
            raise PermissionError("هذا مجلد")
        self.send_file(path, download=q.get("dl", ["0"])[0] == "1")

    def api_fs_upload(self, m, q):
        folder = safe_path(q.get("dir", [HOME])[0])
        name = os.path.basename(q.get("name", ["ملف"])[0]) or "ملف"
        target = os.path.join(folder, name)
        if q.get("unique", ["1"])[0] == "1":
            stem, ext = os.path.splitext(name)
            i = 2
            while os.path.exists(target):
                target = os.path.join(folder, f"{stem} ({i}){ext}")
                i += 1
        n = int(self.headers.get("Content-Length") or 0)
        with open(target + ".part", "wb") as f:
            remaining = n
            while remaining > 0:
                chunk = self.rfile.read(min(remaining, 256 * 1024))
                if not chunk:
                    break
                f.write(chunk)
                remaining -= len(chunk)
        os.replace(target + ".part", target)
        return entry(target)

    def api_fs_mkdir(self, m, q):
        b = self.jbody()
        parent = safe_path(b["path"])
        target = os.path.join(parent, os.path.basename(b["name"]))
        os.makedirs(target, exist_ok=False)
        return entry(target)

    def api_fs_delete(self, m, q):
        for p in self.jbody().get("paths", []):
            real = safe_path(p)
            if real in allowed_roots() or real == os.path.join(HOME, FOLDERS["docs"]):
                raise PermissionError("ما ينحذف هذا المجلد")
            shutil.rmtree(real) if os.path.isdir(real) and not os.path.islink(real) else os.remove(real)
        return {"ok": True}

    def api_fs_rename(self, m, q):
        b = self.jbody()
        real = safe_path(b["path"])
        target = os.path.join(os.path.dirname(real), os.path.basename(b["name"]))
        if os.path.exists(target):
            raise RuntimeError("يوجد ملف بنفس الاسم")
        os.rename(real, target)
        return entry(target)

    def api_fs_copy(self, m, q):
        b = self.jbody()
        dest = safe_path(b["dest"])
        for p in b.get("paths", []):
            src = safe_path(p)
            name = os.path.basename(src)
            target = os.path.join(dest, name)
            stem, ext = os.path.splitext(name)
            i = 2
            while os.path.exists(target):
                target = os.path.join(dest, f"{stem} ({i}){ext}")
                i += 1
            if b.get("move"):
                shutil.move(src, target)
            elif os.path.isdir(src):
                shutil.copytree(src, target)
            else:
                shutil.copy2(src, target)
        run(["sync"], timeout=60)
        return {"ok": True}

    # storage
    def api_storage(self, m, q):
        du = shutil.disk_usage("/")
        fstype, source = root_fstype()
        cats = {}
        for k in ("docs", "down", "pics", "vids", "bt"):
            cats[k] = dir_size(os.path.join(HOME, FOLDERS[k]))
        cats["boards"] = dir_size(os.path.join(HOME, FOLDERS["boards"]))
        cats["docs"] = max(0, cats["docs"] - cats["boards"])
        tmp = dir_size(os.path.join(HOME, ".cache"))
        return {"internal": {"total": du.total, "used": du.used, "free": du.free, "fstype": fstype, "source": source,
                             "nvme": source.startswith("/dev/nvme"), **nvme_info()},
                "cats": cats, "cache": tmp, "usb": usb_devices()}

    def api_storage_clean(self, m, q):
        cache = os.path.join(HOME, ".cache")
        freed = dir_size(cache)
        for name in os.listdir(cache) if os.path.isdir(cache) else []:
            if name in ("fontconfig",):
                continue
            p = os.path.join(cache, name)
            shutil.rmtree(p, ignore_errors=True) if os.path.isdir(p) else os.remove(p)
        return {"freed": freed}

    def api_storage_eject(self, m, q):
        dev = self.jbody()["dev"]
        if not re.fullmatch(r"/dev/sd[a-z]\d*", dev):
            raise PermissionError("جهاز غير مسموح")
        run(["sync"], timeout=60)
        run(["udisksctl", "unmount", "--no-user-interaction", "-b", dev], timeout=30, check=True)
        disk = re.sub(r"\d+$", "", dev)
        run(["udisksctl", "power-off", "--no-user-interaction", "-b", disk], timeout=30)
        return {"ok": True}

    def api_storage_format(self, m, q):
        b = self.jbody()
        fs = b.get("fs", "exfat").lower()
        label = re.sub(r"[^A-Za-z0-9_ -]", "", b.get("label", "USB"))[:11] or "USB"
        dev = b["dev"]
        if not re.fullmatch(r"/dev/sd[a-z]\d*", dev) or fs not in ("exfat", "vfat", "ntfs", "ext4"):
            raise PermissionError("خيار غير مسموح")
        return start_job("format", [dev, fs, label])

    # wifi
    def api_wifi(self, m, q):
        return wifi_state()

    def api_wifi_power(self, m, q):
        on = self.jbody().get("on")
        run(["nmcli", "radio", "wifi", "on" if on else "off"], check=True)
        return {"ok": True}

    def api_wifi_connect(self, m, q):
        b = self.jbody()
        cmd = ["nmcli", "dev", "wifi", "connect", b["ssid"]]
        if b.get("password"):
            cmd += ["password", b["password"]]
        run(cmd, timeout=45, check=True)
        return {"ok": True}

    def api_wifi_forget(self, m, q):
        run(["nmcli", "connection", "delete", "id", self.jbody()["ssid"]], check=True)
        return {"ok": True}

    # bluetooth
    def api_bt(self, m, q):
        return bt_state()

    def api_bt_power(self, m, q):
        on = self.jbody().get("on")
        if on and has("rfkill"):
            run(["rfkill", "unblock", "bluetooth"])
        btctl("power", "on" if on else "off", timeout=10)
        return {"ok": True}

    def api_bt_discoverable(self, m, q):
        on = self.jbody().get("on")
        btctl("pairable", "on" if on else "off")
        btctl("discoverable", "on" if on else "off")
        return {"ok": True}

    def api_bt_name(self, m, q):
        btctl("system-alias", self.jbody()["name"][:40])
        return {"ok": True}

    def api_bt_transfers(self, m, q):
        try:
            with open("/run/alharthia/bt-transfers.json", encoding="utf-8") as f:
                data = json.load(f)
        except (OSError, ValueError):
            return {"items": []}
        home = os.path.join(HOME, "")
        items = []
        for t in data.get("items", []):
            if t.get("path") and not str(t["path"]).startswith(home):
                t["path"] = ""
            items.append(t)
        return {"items": items, "now": data.get("now")}

    def api_bt_scan(self, m, q):
        if m == "POST":
            bt_scan_start()
        return {"devices": bt_scan(), "scanning": bt_scanning()}

    def _mac(self):
        mac = self.jbody()["mac"]
        if not re.fullmatch(r"[0-9A-F:]{17}", mac):
            raise PermissionError("عنوان غير صالح")
        return mac

    def api_bt_pair(self, m, q):
        mac = self._mac()
        btctl("pair", mac, timeout=30)
        btctl("trust", mac)
        btctl("connect", mac, timeout=20)
        return {"ok": True}

    def api_bt_connect(self, m, q):
        b = self.jbody()
        mac = b["mac"]
        if not re.fullmatch(r"[0-9A-F:]{17}", mac):
            raise PermissionError("عنوان غير صالح")
        btctl("connect" if b.get("on") else "disconnect", mac, timeout=20)
        return {"ok": True}

    def api_bt_remove(self, m, q):
        btctl("remove", self._mac())
        return {"ok": True}

    def api_bt_received(self, m, q):
        return {"items": received_since(float(q.get("since", ["0"])[0])), "now": int(time.time() * 1000)}

    # apps
    def api_apps_installed(self, m, q):
        return {"installed": [k for k in CATALOG["store"] if app_installed(k)],
                "builtin": {k: find_bin(v) is not None for k, v in CATALOG["builtin"].items()}}

    def api_apps_launch(self, m, q):
        b = self.jbody()
        return launch(b.get("id"), b.get("path"), b.get("url"))

    def api_apps_install(self, m, q):
        return start_job(*install_args(self.jbody()["id"]))

    def api_apps_remove(self, m, q):
        return start_job(*remove_args(self.jbody()["id"]))

    def api_jobs(self, m, q):
        job = JOBS.get(q.get("id", [""])[0])
        if not job:
            raise FileNotFoundError("مهمة غير موجودة")
        return job

    # misc
    def api_volume(self, m, q):
        if m == "POST":
            return volume(self.jbody().get("value"))
        return volume()

    def api_keyboard(self, m, q):
        b = self.jbody()
        langs = [l for l in b.get("langs", []) if l in ("ar", "en", "fr")] or ["ar", "en"]
        conf = os.path.join(HOME, ".config", "alharthia")
        os.makedirs(conf, exist_ok=True)
        with open(os.path.join(conf, "keyboard-langs"), "w") as f:
            f.write(" ".join(langs))
        # settings for the system-wide keyboard (alharthia_osk.py watches this file)
        st = {"langs": langs, "lang": b.get("lang") if b.get("lang") in langs else langs[0],
              "mode": b.get("mode") if b.get("mode") in ("auto", "always", "off") else "auto",
              "size": b.get("size") if b.get("size") in ("s", "m", "l") else "m",
              "preview": bool(b.get("preview", True)), "termKeys": bool(b.get("termKeys", True)),
              "dark": bool(b.get("dark")), "ar": bool(b.get("ar", True)), "clickSound": bool(b.get("clickSound")),
              "acc": str(b.get("acc") or "#f0703e")[:32],
              "emojiRecent": [str(e)[:16] for e in (b.get("emojiRecent") or [])][:32]}
        tmp = os.path.join(conf, "osk.json.tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(st, f, ensure_ascii=False)
        os.replace(tmp, os.path.join(conf, "osk.json"))
        if has("alharthia-keyboard-setup"):
            run(["alharthia-keyboard-setup"])
        return {"ok": True, "langs": langs}

    def api_audio(self, m, q):
        if m == "POST":
            audio_set(str(self.jbody().get("id", "")))
        return audio_list()

    def api_term_open(self, m, q):
        b = self.jbody()
        with TERM_LOCK:
            for tid in [k for k, t in TERMS.items() if not t.alive]:
                TERMS.pop(tid, None)
            if len(TERMS) >= 8:
                raise PermissionError("فاتحة جلسات كثيرة — سد وحدة منها")
            t = Term(b.get("cols"), b.get("rows"))
            TERMS[t.id] = t
        return {"id": t.id}

    def api_term_write(self, m, q):
        b = self.jbody()
        term_get(b.get("id")).write(str(b.get("data", ""))[:65536])
        return {"ok": True}

    def api_term_resize(self, m, q):
        b = self.jbody()
        term_get(b.get("id")).resize(b.get("cols"), b.get("rows"))
        return {"ok": True}

    def api_term_close(self, m, q):
        t = TERMS.pop(self.jbody().get("id", ""), None)
        if t:
            t.close()
        return {"ok": True}

    def api_term_stream(self, m, q):
        """Server-sent events: the terminal output as base64 chunks."""
        import base64
        t = term_get(q.get("id", [""])[0])
        try:
            pos = int(self.headers.get("Last-Event-ID") or q.get("from", ["0"])[0] or 0)
        except ValueError:
            pos = 0
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        try:
            while True:
                data, pos, alive = t.read_from(pos)
                if data:
                    self.wfile.write(b"id: %d\ndata: %s\n\n" % (pos, base64.b64encode(data)))
                elif alive:
                    self.wfile.write(b": ping\n\n")
                if not alive:
                    self.wfile.write(b"event: exit\ndata: 0\n\n")
                    self.wfile.flush()
                    return None
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, OSError):
            return None

    def api_share(self, m, q):
        import alharthia_share as sh
        if m == "POST":
            b = self.jbody()
            if "airplay" in b:
                sh.airplay(bool(b["airplay"]))
                return sh.status()
            if "video" in b:
                sh.video_start() if b["video"] else sh.video_stop()
                return sh.status()
            return sh.start() if b.get("on") else sh.stop()
        return sh.status()

    def api_share_incoming(self, m, q):
        import alharthia_share as sh
        data = sh.incoming_frame()
        if not data:
            return self.fail("ماكو عرض", 404)
        self.send_response(200)
        self.send_header("Content-Type", "image/jpeg")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        try:
            self.wfile.write(data)
        except OSError:
            pass

    def api_screenshot(self, m, q):
        folder = os.path.join(HOME, FOLDERS["pics"])
        os.makedirs(folder, exist_ok=True)
        name = time.strftime("لقطة-%Y-%m-%d-%H%M%S.png")
        path = os.path.join(folder, name)
        tool = next((t for t in ("grim", "wayshot", "scrot") if has(t)), None)
        if not tool:
            raise RuntimeError("أداة اللقطات غير مثبتة — ثبّت grim")
        args = {"grim": [tool, path], "wayshot": [tool, "-f", path], "scrot": [tool, path]}[tool]
        code, out, err = run(args, timeout=20)
        if code != 0 or not os.path.exists(path):
            raise RuntimeError((err or out).strip()[:200] or "تعذر التقاط الشاشة")
        return {"ok": True, "path": path, "name": name}

    def api_time_tz(self, m, q):
        tz = self.jbody()["tz"]
        if not re.fullmatch(r"[A-Za-z_]+(/[A-Za-z_]+)?", tz):
            raise PermissionError("منطقة غير صالحة")
        job = start_job("timezone", [tz])
        return job

    def api_power(self, m, q):
        action = self.jbody().get("action")
        cmd = {"off": ["systemctl", "poweroff"], "reboot": ["systemctl", "reboot"]}.get(action)
        if not cmd:
            raise PermissionError("أمر غير معروف")
        threading.Timer(1.5, lambda: subprocess.Popen(cmd)).start()
        return {"ok": True}


# ---------------------------------------------------------------- bluetooth: trust every paired device
BT_TRUSTED = set()


def bt_trust(mac):
    if mac in BT_TRUSTED:
        return
    _, info, _ = btctl("info", mac, timeout=4)
    if "Paired: yes" in info or "Bonded: yes" in info:
        if "Trusted: yes" not in info:
            btctl("trust", mac, timeout=4)
        BT_TRUSTED.add(mac)


def bt_sweep():
    _, out, _ = btctl("devices", "Paired", timeout=4)
    if "Invalid" in out or not out.strip():
        _, out2, _ = btctl("paired-devices", timeout=4)
        out = out + "\n" + out2
    for mac in set(re.findall(r"Device ([0-9A-F:]{17})", out)):
        bt_trust(mac)


def bt_watch():
    """Trusts any phone the moment it pairs or connects, so it can send files straight away."""
    import pty, select
    while True:
        if not has("bluetoothctl"):
            return
        try:
            bt_sweep()
        except Exception:  # noqa
            pass
        try:
            master, slave = pty.openpty()
            p = subprocess.Popen(["bluetoothctl"], stdin=slave, stdout=slave, stderr=slave, close_fds=True,
                                 start_new_session=True)
            os.close(slave)
            buf, last = b"", time.time()
            while p.poll() is None:
                r, _, _ = select.select([master], [], [], 5)
                if r:
                    try:
                        chunk = os.read(master, 4096)
                    except OSError:
                        break
                    buf = (buf + chunk)[-8192:]
                    text = buf.decode("utf-8", "ignore")
                    for mac in set(re.findall(r"Device ([0-9A-F:]{17}) (?:Paired|Bonded|Connected|ServicesResolved): yes", text)):
                        BT_TRUSTED.discard(mac)
                        bt_trust(mac)
                    if "\n" in text:
                        buf = buf[buf.rfind(b"\n") + 1:]
                if time.time() - last > 20:
                    last = time.time()
                    bt_sweep()
            try:
                os.close(master)
            except OSError:
                pass
        except Exception:  # noqa
            pass
        time.sleep(5)


def main():
    ensure_folders()
    threading.Thread(target=bt_watch, daemon=True).start()
    srv = ThreadingHTTPServer((HOST, PORT), Handler)
    srv.daemon_threads = True
    print(f"Alharthia service on http://{HOST}:{PORT}/", flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
