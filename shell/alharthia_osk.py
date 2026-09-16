#!/usr/bin/env python3
"""
Alharthia OS — system-wide on-screen keyboard.

Shows the SAME Gboard-style keyboard as the interface (ui/osk.html) above every
program: Terminal, LibreOffice, Chromium, Scratch…

* The keyboard is a layer-shell panel that never takes focus, so keys go to the
  program in front. Keys are typed with `wtype` (Wayland virtual keyboard).
* It appears automatically when a text field gets focus (AT-SPI accessibility
  events) and when a terminal comes to the front.
* A thin top bar is shown above programs with: back to the interface, the
  program name, and a keyboard button (show / hide).
* Settings (languages, size, theme, on/off) come from the interface through
  ~/.config/alharthia/osk.json, written by alharthia_server.py.
"""
import json, os, queue, shutil, subprocess, sys, threading, time

try:
    import gi
    gi.require_version("Gtk", "3.0")
    gi.require_version("GtkLayerShell", "0.1")
    try:
        gi.require_version("WebKit2", "4.1")
    except ValueError:
        gi.require_version("WebKit2", "4.0")
    from gi.repository import Gtk, Gdk, GLib, GtkLayerShell, Pango, WebKit2
except Exception as e:  # noqa
    print("alharthia-osk disabled:", e, file=sys.stderr)
    sys.exit(0)

try:
    gi.require_version("Atspi", "2.0")
    from gi.repository import Atspi
except Exception:  # noqa
    Atspi = None

HERE = os.path.dirname(os.path.abspath(__file__))
PAGE = os.path.join(HERE, "ui", "osk.html")
CONF = os.path.join(os.path.expanduser("~"), ".config", "alharthia")
SETTINGS = os.path.join(CONF, "osk.json")
STATE = os.path.join(CONF, "osk-state.json")
SHELL_IDS = {"alharthia-shell", "alharthia-osk", "python3", ""}
TERMINALS = {"foot", "footclient", "lxterminal", "xterm", "org.gnome.Terminal", "kitty", "alacritty"}
NAMES = {"foot": "الطرفية", "lxterminal": "الطرفية", "xterm": "الطرفية", "chromium": "Chromium",
         "libreoffice-writer": "LibreOffice Writer", "libreoffice-calc": "LibreOffice Calc",
         "libreoffice-impress": "LibreOffice Impress", "libreoffice-startcenter": "LibreOffice",
         "mpv": "مشغل الوسائط", "vlc": "VLC"}
TOPBAR_H = 44
GUESS_H = {"s": 300, "m": 362, "l": 430}


def log(*a):
    if os.environ.get("ALH_DEBUG"):
        print("[osk]", *a, file=sys.stderr, flush=True)


def load_json(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


# ------------------------------------------------------------------ typing
class Typer(threading.Thread):
    """Runs wtype commands in order without blocking the UI."""

    def __init__(self):
        super().__init__(daemon=True)
        self.q = queue.Queue()
        self.exe = shutil.which("wtype")
        if not self.exe:
            print("alharthia-osk: wtype is not installed, keys cannot be typed", file=sys.stderr)

    def run(self):
        while True:
            args = self.q.get()
            if not self.exe:
                continue
            try:
                subprocess.run([self.exe, *args], timeout=5, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except Exception as e:  # noqa
                log("wtype failed", e)

    def text(self, t):
        if t:
            self.q.put(["--", t])

    def key(self, k):
        self.q.put(["-k", k])

    def combo(self, mods, val, is_key):
        mods = [m for m in mods if m in ("ctrl", "alt", "shift", "logo")]
        args = []
        for m in mods:
            args += ["-M", m]
        args += ["-k", val] if is_key else ([val] if not val.startswith("-") else ["-k", "minus"])
        for m in reversed(mods):
            args += ["-m", m]
        self.q.put(args)


# ------------------------------------------------------------------ windows
FOCUS_FILE = os.path.join(os.path.expanduser("~"), ".cache", "alharthia", "shell-focus")


def shell_focus():
    """True/False from the interface window itself (alharthia_host.py), None if unknown."""
    try:
        if time.time() - os.path.getmtime(FOCUS_FILE) > 15:
            return None
        with open(FOCUS_FILE) as f:
            return f.read().strip() == "1"
    except OSError:
        return None


def lswt_front():
    if not shutil.which("lswt"):
        return None
    try:
        raw = subprocess.run(["lswt", "-j"], capture_output=True, text=True, timeout=3).stdout or "[]"
        data = json.loads(raw)
    except Exception:  # noqa
        return None
    items = data.get("toplevels", []) if isinstance(data, dict) else data
    act = lambda t: t.get("activated", t.get("active", t.get("focused")))
    active_known = any(act(t) is not None for t in items)
    for t in items:
        app_id = t.get("app-id") or t.get("app_id") or ""
        if app_id in SHELL_IDS or t.get("minimized"):
            continue
        if not active_known or act(t):
            return app_id, t.get("title") or ""
    return None


def front_app():
    """(app_id, title) of the active program, or None when the interface is in front."""
    focus = shell_focus()
    if focus is True:
        return None
    f = lswt_front()
    if focus is False:
        return f or ("", "")
    return f


def wlrctl(*args):
    if shutil.which("wlrctl"):
        subprocess.Popen(["wlrctl", "toplevel", *args], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True
    return False


CSS = b"""
#topbar { background: #0f1a36; }
#topbar label { color: #ffffff; font-weight: bold; font-size: 15px; }
#topbar button { background: rgba(255,255,255,.10); color: #ffffff; border: 0; border-radius: 10px;
                 padding: 4px 14px; min-height: 32px; font-size: 15px; box-shadow: none; text-shadow: none; }
#topbar button:active, #topbar button.on { background: #f0703e; }
#topbar button.off { opacity: .5; }
"""


class OSK:
    def __init__(self):
        self.typer = Typer()
        self.typer.start()
        self.settings = load_json(SETTINGS, {})
        self.settings_mtime = 0
        self.visible = False
        self.ready = False
        self.front = None
        self.height = GUESS_H.get(self.settings.get("size", "m"), 362)
        Gtk.Widget.set_default_direction(Gtk.TextDirection.RTL)
        prov = Gtk.CssProvider()
        prov.load_from_data(CSS)
        Gtk.StyleContext.add_provider_for_screen(Gdk.Screen.get_default(), prov, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION)
        self.build_keyboard()
        self.build_topbar()
        self.watch_settings()
        GLib.timeout_add(900, self.poll_front)
        GLib.timeout_add(1500, self.watch_settings)
        self.setup_atspi()

    # -- keyboard panel
    def build_keyboard(self):
        win = Gtk.Window(title="alharthia-osk")
        GtkLayerShell.init_for_window(win)
        GtkLayerShell.set_namespace(win, "alharthia-osk")
        GtkLayerShell.set_layer(win, GtkLayerShell.Layer.TOP)
        for edge in (GtkLayerShell.Edge.BOTTOM, GtkLayerShell.Edge.LEFT, GtkLayerShell.Edge.RIGHT):
            GtkLayerShell.set_anchor(win, edge, True)
        if hasattr(GtkLayerShell, "set_keyboard_mode"):
            GtkLayerShell.set_keyboard_mode(win, GtkLayerShell.KeyboardMode.NONE)
        else:
            GtkLayerShell.set_keyboard_interactivity(win, False)
        win.set_size_request(-1, self.height)
        win.set_accept_focus(False)

        ucm = WebKit2.UserContentManager()
        ucm.register_script_message_handler("osk")
        ucm.connect("script-message-received::osk", self.on_message)
        view = WebKit2.WebView.new_with_user_content_manager(ucm)
        st = view.get_settings()
        st.set_allow_file_access_from_file_urls(True)
        st.set_enable_developer_extras(bool(os.environ.get("ALH_DEBUG")))
        if hasattr(st, "set_hardware_acceleration_policy"):
            st.set_hardware_acceleration_policy(WebKit2.HardwareAccelerationPolicy.NEVER)
        view.connect("context-menu", lambda *a: True)
        view.load_uri("file://" + PAGE)
        win.add(view)
        self.kb, self.view = win, view

    def js(self, code):
        if hasattr(self.view, "evaluate_javascript"):
            self.view.evaluate_javascript(code, -1, None, None, None, None, None)
        else:
            self.view.run_javascript(code, None, None, None)

    def on_message(self, _ucm, res):
        try:
            raw = res.to_string() if hasattr(res, "to_string") else res.get_js_value().to_string()
            msg = json.loads(raw)
        except Exception as e:  # noqa
            log("bad message", e)
            return
        t = msg.get("type")
        if t == "text":
            self.typer.text(str(msg.get("v", "")))
        elif t == "key":
            self.typer.key(str(msg.get("v", "")))
        elif t == "combo":
            self.typer.combo(msg.get("mods") or [], str(msg.get("v", "")), bool(msg.get("isKey")))
        elif t == "height":
            h = int(msg.get("v") or 0)
            if h > 80 and h != self.height:
                self.height = h
                self.kb.set_size_request(-1, h)
                self.kb.resize(1, h)
                if self.visible:
                    GtkLayerShell.set_exclusive_zone(self.kb, h)
        elif t == "hide":
            self.hide_keyboard()
        elif t == "state":
            try:
                os.makedirs(CONF, exist_ok=True)
                with open(STATE, "w", encoding="utf-8") as f:
                    json.dump({"lang": msg.get("lang"), "emojiRecent": msg.get("emojiRecent") or []}, f, ensure_ascii=False)
            except OSError:
                pass
        elif t == "ready":
            self.ready = True
            self.push_settings()

    def push_settings(self):
        if not self.ready:
            return
        st = dict(self.settings)
        own = load_json(STATE, {})
        if own.get("lang") and own.get("lang") in st.get("langs", ["ar", "en", "fr"]):
            st.setdefault("lang", own["lang"])
        self.js("OSKX.apply(%s)" % json.dumps(st, ensure_ascii=False))

    def watch_settings(self):
        try:
            m = os.path.getmtime(SETTINGS)
        except OSError:
            return True
        if m != self.settings_mtime:
            self.settings_mtime = m
            self.settings = load_json(SETTINGS, self.settings)
            self.push_settings()
            if self.settings.get("mode") == "off" and self.visible:
                self.hide_keyboard()
            self.sync_button()
        return True

    def show_keyboard(self):
        if self.visible or not self.front:
            return
        self.visible = True
        if self.ready:
            self.js("OSKX.open()")
        self.kb.show_all()
        GtkLayerShell.set_exclusive_zone(self.kb, self.height)
        self.sync_button()

    def hide_keyboard(self):
        if not self.visible:
            return
        self.visible = False
        GtkLayerShell.set_exclusive_zone(self.kb, 0)
        self.kb.hide()
        if self.ready:
            self.js("OSKX.close()")
        self.sync_button()

    def toggle_keyboard(self, *_):
        if self.visible:
            self.hide_keyboard()
        else:
            self.show_keyboard()

    # -- top bar above programs
    def build_topbar(self):
        win = Gtk.Window(title="alharthia-topbar")
        GtkLayerShell.init_for_window(win)
        GtkLayerShell.set_namespace(win, "alharthia-topbar")
        GtkLayerShell.set_layer(win, GtkLayerShell.Layer.TOP)
        for edge in (GtkLayerShell.Edge.TOP, GtkLayerShell.Edge.LEFT, GtkLayerShell.Edge.RIGHT):
            GtkLayerShell.set_anchor(win, edge, True)
        GtkLayerShell.set_exclusive_zone(win, TOPBAR_H)
        if hasattr(GtkLayerShell, "set_keyboard_mode"):
            GtkLayerShell.set_keyboard_mode(win, GtkLayerShell.KeyboardMode.NONE)
        win.set_size_request(-1, TOPBAR_H)
        win.set_name("topbar")
        box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        box.set_margin_start(8); box.set_margin_end(8); box.set_margin_top(6); box.set_margin_bottom(6)
        home = Gtk.Button(label="⌂  الواجهة")
        home.set_tooltip_text("الرجوع للواجهة")
        home.connect("clicked", lambda *_: self.go_home())
        self.title = Gtk.Label(label="")
        self.title.set_ellipsize(Pango.EllipsizeMode.END)
        self.kbd_btn = Gtk.Button(label="⌨  الكيبورد")
        self.kbd_btn.set_tooltip_text("إظهار / إخفاء الكيبورد")
        self.kbd_btn.connect("clicked", self.toggle_keyboard)
        close = Gtk.Button(label="✕")
        close.set_tooltip_text("إغلاق البرنامج")
        close.connect("clicked", lambda *_: self.close_front())
        box.pack_start(home, False, False, 0)
        box.pack_start(self.title, True, True, 0)
        box.pack_end(close, False, False, 0)
        box.pack_end(self.kbd_btn, False, False, 0)
        win.add(box)
        self.bar = win
        self.bar_close = close
        self.bar_home = home

    def sync_button(self):
        ctx = self.kbd_btn.get_style_context()
        (ctx.add_class if self.visible else ctx.remove_class)("on")
        off = self.settings.get("mode") == "off"
        (ctx.add_class if off and not self.visible else ctx.remove_class)("off")

    def go_home(self):
        self.hide_keyboard()
        if not wlrctl("focus", "app_id:alharthia-shell") and self.front:
            wlrctl("minimize", "app_id:" + self.front[0])

    def close_front(self):
        if self.front and self.front[0]:
            self.hide_keyboard()
            wlrctl("close", "app_id:" + self.front[0])

    def poll_front(self):
        f = front_app()
        prev = self.front
        self.front = f
        if not f:
            if prev:
                self.hide_keyboard()
                self.bar.hide()
            return True
        if not prev:
            self.bar.show_all()
            has_wlrctl = bool(shutil.which("wlrctl"))
            self.bar_close.set_visible(has_wlrctl)
            self.bar_home.set_visible(has_wlrctl)
        app, title = f
        self.title.set_text(NAMES.get(app) or title or app or "برنامج")
        if (not prev or prev[0] != app) and app in TERMINALS and self.settings.get("mode", "auto") != "off":
            self.show_keyboard()
        return True

    # -- auto show when a text field gets focus
    def setup_atspi(self):
        if not Atspi:
            return
        try:
            Atspi.init()
            self.listener = Atspi.EventListener.new(self.on_focus)
            self.listener.register("object:state-changed:focused")
        except Exception as e:  # noqa
            log("atspi disabled", e)

    def on_focus(self, event):
        try:
            if not event.detail1 or self.settings.get("mode", "auto") == "off":
                return
            acc = event.source
            states = acc.get_state_set()
            editable = states.contains(Atspi.StateType.EDITABLE)
            role = acc.get_role()
            if editable or role in (Atspi.Role.ENTRY, Atspi.Role.PASSWORD_TEXT, Atspi.Role.TERMINAL):
                GLib.idle_add(self.show_keyboard)
        except Exception as e:  # noqa
            log("focus event", e)


def main():
    if not os.path.exists(PAGE):
        print("alharthia-osk: missing", PAGE, file=sys.stderr)
        return
    OSK()
    Gtk.main()


if __name__ == "__main__":
    main()
