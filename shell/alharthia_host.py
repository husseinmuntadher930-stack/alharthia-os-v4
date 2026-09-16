#!/usr/bin/env python3
"""
Alharthia OS — full-screen host window.

* Shows the classroom UI in a native Qt window (Qt WebEngine = the Chromium
  engine) so the interface looks exactly like the HTML design.
* Contains the Alharthia browser: same top bar / tabs / address bar as the
  interface, and the Alharthia on-screen keyboard inside every web page.
* Tells the system keyboard (alharthia_osk.py) when the interface is in front.
* Falls back to Chromium in kiosk mode if Qt WebEngine for Python is missing.
"""
import json, os, shutil, subprocess, sys, time, urllib.request

URL = os.environ.get("ALH_URL", "http://127.0.0.1:8765/")
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.expanduser("~/.local/share/alharthia")
DOWNLOADS = os.path.expanduser("~/Downloads")
CONF = os.path.expanduser("~/.config/alharthia")
OSK_SETTINGS = os.path.join(CONF, "osk.json")
FOCUS_FILE = os.path.expanduser("~/.cache/alharthia/shell-focus")
INJECT = os.path.join(HERE, "ui", "osk-inject.js")
WINDOWED = "--windowed" in sys.argv


def log(*a):
    print("[host]", *a, file=sys.stderr, flush=True)


def wait_for_service(timeout=40):
    t0 = time.time()
    while time.time() - t0 < timeout:
        try:
            urllib.request.urlopen(URL, timeout=2).read(64)
            return True
        except Exception:
            time.sleep(0.4)
    return False


def read_json(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def write_focus(active):
    try:
        os.makedirs(os.path.dirname(FOCUS_FILE), exist_ok=True)
        with open(FOCUS_FILE, "w") as f:
            f.write("1" if active else "0")
    except OSError:
        pass


# Qt's own input methods must stay out of the way: the interface has its own keyboard
os.environ["QT_IM_MODULE"] = "compose"


def load_qt():
    for mod in ("PyQt6", "PySide6"):
        try:
            core = __import__(mod + ".QtCore", fromlist=["x"])
            gui = __import__(mod + ".QtGui", fromlist=["x"])
            widgets = __import__(mod + ".QtWidgets", fromlist=["x"])
            wew = __import__(mod + ".QtWebEngineWidgets", fromlist=["x"])
            wec = __import__(mod + ".QtWebEngineCore", fromlist=["x"])
            return dict(mod=mod, Qt=core.Qt, QUrl=core.QUrl, QTimer=core.QTimer, QColor=gui.QColor,
                        QApplication=widgets.QApplication, QWidget=widgets.QWidget,
                        QVBoxLayout=widgets.QVBoxLayout, QStackedWidget=widgets.QStackedWidget,
                        QWebEngineView=wew.QWebEngineView, QWebEngineProfile=wec.QWebEngineProfile,
                        QWebEnginePage=wec.QWebEnginePage, QWebEngineSettings=wec.QWebEngineSettings,
                        QWebEngineScript=wec.QWebEngineScript)
        except ImportError:
            continue
    return None


def enum_int(v):
    return int(getattr(v, "value", v))


def run_qt(Q):
    os.environ.setdefault("QTWEBENGINE_CHROMIUM_FLAGS",
                          "--touch-events=enabled --enable-gpu-rasterization --ignore-gpu-blocklist "
                          "--enable-features=OverlayScrollbar --disable-pinch --autoplay-policy=no-user-gesture-required")
    Qt, QUrl = Q["Qt"], Q["QUrl"]
    Page, Script = Q["QWebEnginePage"], Q["QWebEngineScript"]
    app = Q["QApplication"](sys.argv)
    app.setApplicationName("Alharthia OS")
    app.setDesktopFileName("alharthia-shell")
    app.setLayoutDirection(Qt.LayoutDirection.RightToLeft)

    os.makedirs(DATA, exist_ok=True)
    profile = Q["QWebEngineProfile"]("alharthia", app)
    profile.setPersistentStoragePath(os.path.join(DATA, "web"))
    profile.setCachePath(os.path.join(DATA, "cache"))
    profile.setHttpCacheMaximumSize(128 * 1024 * 1024)
    try:
        profile.setHttpAcceptLanguage("ar,en;q=0.8,fr;q=0.6")
    except Exception:  # noqa
        pass

    def on_download(d):
        os.makedirs(DOWNLOADS, exist_ok=True)
        try:
            d.setDownloadDirectory(DOWNLOADS)
        except Exception:  # noqa
            pass
        d.accept()
    profile.downloadRequested.connect(on_download)

    WA = Q["QWebEngineSettings"].WebAttribute

    def setup_settings(page, shell=False):
        st = page.settings()
        on = ["LocalStorageEnabled", "FullScreenSupportEnabled", "ScrollAnimatorEnabled", "PdfViewerEnabled",
              "PluginsEnabled", "DnsPrefetchEnabled", "JavascriptCanOpenWindows"]
        if shell:
            on += ["JavascriptCanAccessClipboard"]
        for attr in on:
            if hasattr(WA, attr):
                st.setAttribute(getattr(WA, attr), True)
        if hasattr(WA, "PlaybackRequiresUserGesture"):
            st.setAttribute(WA.PlaybackRequiresUserGesture, False)

    APP_WORLD = enum_int(Script.ScriptWorldId.ApplicationWorld)
    inject_src = {"code": "", "mtime": 0}

    def inject_code():
        try:
            m = os.path.getmtime(INJECT)
            if m != inject_src["mtime"]:
                with open(INJECT, encoding="utf-8") as f:
                    inject_src["code"] = f.read()
                inject_src["mtime"] = m
        except OSError:
            pass
        st = read_json(OSK_SETTINGS, {})
        return "window.__ALH_OSK=%s;\n%s" % (json.dumps(st, ensure_ascii=False), inject_src["code"])

    # ------------------------------------------------------------ browser
    class TabPage(Page):
        def __init__(self, browser):
            super().__init__(profile, browser.win)
            self.browser = browser
            setup_settings(self)
            sc = Script()
            sc.setName("alharthia-osk")
            sc.setSourceCode(inject_code())
            sc.setInjectionPoint(Script.InjectionPoint.DocumentReady)
            sc.setWorldId(APP_WORLD)
            sc.setRunsOnSubFrames(False)
            self.scripts().insert(sc)
            self.fullScreenRequested.connect(self.on_full)
            try:
                self.featurePermissionRequested.connect(self.on_perm)
            except Exception:  # noqa
                pass

        def on_full(self, req):
            req.accept()
            self.browser.set_fullscreen(req.toggleOn())

        def on_perm(self, origin, feature):
            ok = {"MediaAudioCapture", "MediaVideoCapture", "MediaAudioVideoCapture", "Notifications"}
            name = getattr(feature, "name", str(feature))
            pol = Page.PermissionPolicy.PermissionGrantedByUser if name in ok else Page.PermissionPolicy.PermissionDeniedByUser
            self.setFeaturePermission(origin, feature, pol)

        def createWindow(self, _type):
            return self.browser.new_tab(None).page

        def javaScriptConsoleMessage(self, *a):
            pass

    class ChromePage(Page):
        def __init__(self, browser):
            super().__init__(profile, browser.win)
            self.browser = browser
            setup_settings(self, shell=True)

        def javaScriptConsoleMessage(self, level, message, line, source):
            if message.startswith("ALHCMD:"):
                try:
                    self.browser.command(json.loads(message[7:]))
                except Exception as e:  # noqa
                    log("chrome command failed", e)

    class Tab:
        seq = 0

        def __init__(self, browser, url):
            Tab.seq += 1
            self.id = Tab.seq
            self.view = Q["QWebEngineView"]()
            self.page = TabPage(browser)
            self.view.setPage(self.page)
            self.progress = 0
            self.loading = False
            p = self.page
            p.titleChanged.connect(lambda *_: browser.push())
            p.urlChanged.connect(lambda *_: browser.push())
            p.loadStarted.connect(lambda: self.set_loading(True, browser))
            p.loadProgress.connect(lambda v: self.set_progress(v, browser))
            p.loadFinished.connect(lambda ok: self.set_loading(False, browser))
            p.renderProcessTerminated.connect(lambda *a: p.triggerAction(Page.WebAction.Reload))
            if url:
                self.view.load(QUrl(url))

        def set_loading(self, on, browser):
            self.loading = on
            self.progress = 5 if on else 100
            browser.push()

        def set_progress(self, v, browser):
            self.progress = v
            browser.push(throttle=True)

        def info(self):
            h = self.page.history()
            return {"id": self.id, "title": self.page.title(), "url": self.page.url().toString(),
                    "loading": self.loading, "progress": self.progress,
                    "canBack": h.canGoBack(), "canFwd": h.canGoForward()}

    class Browser:
        def __init__(self, shell):
            self.shell = shell
            self.win = Q["QWidget"]()
            self.win.setWindowTitle("Chromium — Alharthia")
            lay = Q["QVBoxLayout"](self.win)
            lay.setContentsMargins(0, 0, 0, 0)
            lay.setSpacing(0)
            self.chrome = Q["QWebEngineView"]()
            self.chrome_page = ChromePage(self)
            self.chrome_page.setBackgroundColor(Q["QColor"]("#0a1433"))
            self.chrome.setPage(self.chrome_page)
            self.chrome.setContextMenuPolicy(Qt.ContextMenuPolicy.NoContextMenu)
            self.chrome_h = 158
            self.chrome.setFixedHeight(self.chrome_h)
            self.stack = Q["QStackedWidget"]()
            lay.addWidget(self.chrome)
            lay.addWidget(self.stack, 1)
            self.tabs = []
            self.active = None
            self.ready = False
            self.expanded = False
            self.full = False
            self.push_timer = Q["QTimer"]()
            self.push_timer.setSingleShot(True)
            self.push_timer.timeout.connect(self._push)
            self.chrome.load(QUrl(URL + "browser.html"))
            self.osk_mtime = 0
            self.osk_timer = Q["QTimer"]()
            self.osk_timer.timeout.connect(self.watch_osk)
            self.osk_timer.start(1500)

        # tabs
        def new_tab(self, url, select=True):
            t = Tab(self, url)
            self.tabs.append(t)
            self.stack.addWidget(t.view)
            if select:
                self.select(t.id)
            self.push()
            return t

        def tab(self, tid=None):
            tid = self.active if tid is None else tid
            return next((t for t in self.tabs if t.id == tid), None)

        def select(self, tid):
            t = self.tab(tid)
            if not t:
                return
            self.active = tid
            self.stack.setCurrentWidget(t.view)
            t.view.setFocus()
            self.push()

        def close_tab(self, tid):
            t = self.tab(tid)
            if not t:
                return
            i = self.tabs.index(t)
            self.tabs.remove(t)
            self.stack.removeWidget(t.view)
            try:
                t.page.triggerAction(Page.WebAction.Stop)
                t.page.setAudioMuted(True)
            except Exception:  # noqa
                pass
            t.page.deleteLater()
            t.view.deleteLater()
            if not self.tabs:
                self.new_tab(URL + "newtab.html")
                self.go_home()
                return
            if self.active == tid:
                self.select(self.tabs[max(0, i - 1)].id)
            self.push()

        def push(self, throttle=False):
            if not self.push_timer.isActive():
                self.push_timer.start(120 if throttle else 0)

        def _push(self):
            if not self.ready:
                return
            st = {"tabs": [t.info() for t in self.tabs], "active": self.active}
            self.chrome_page.runJavaScript("window.BR&&BR.state(%s)" % json.dumps(st, ensure_ascii=False))

        # window
        def open(self, url=None):
            if url or not self.tabs:
                cur = self.tab()
                if url and cur and cur.page.url().toString().startswith(URL + "newtab.html"):
                    cur.view.load(QUrl(url))
                else:
                    self.new_tab(url or URL + "newtab.html")
            if WINDOWED:
                self.win.resize(1600, 900)
                self.win.show()
            else:
                self.win.showFullScreen()
            self.win.raise_()
            self.win.activateWindow()

        def go_home(self):
            self.set_fullscreen(False)
            self.win.hide()
            self.shell.raise_()
            self.shell.activateWindow()

        def set_fullscreen(self, on):
            self.full = on
            self.chrome.setVisible(not on)

        def set_expanded(self, on, h):
            self.expanded = on
            if on:
                self.stack.hide()
                self.chrome.setMinimumHeight(0)
                self.chrome.setMaximumHeight(16777215)
            else:
                self.chrome_h = max(60, int(h or self.chrome_h))
                self.chrome.setFixedHeight(self.chrome_h)
                self.stack.show()
                t = self.tab()
                if t:
                    t.view.setFocus()

        def run_in_tab(self, code, t=None):
            t = t or self.tab()
            if t:
                try:
                    t.page.runJavaScript(code, APP_WORLD)
                except TypeError:
                    t.page.runJavaScript(code, APP_WORLD, lambda *_: None)

        def watch_osk(self):
            try:
                m = os.path.getmtime(OSK_SETTINGS)
            except OSError:
                return
            if m == self.osk_mtime:
                return
            self.osk_mtime = m
            st = read_json(OSK_SETTINGS, {})
            js = json.dumps(st, ensure_ascii=False)
            code = inject_code()
            for t in self.tabs:
                for sc in t.page.scripts().find("alharthia-osk"):
                    t.page.scripts().remove(sc)
                    sc.setSourceCode(code)
                    t.page.scripts().insert(sc)
                self.run_in_tab("window.__alhOskApply&&__alhOskApply(%s)" % js, t)
            if self.ready:
                self.chrome_page.runJavaScript("window.BR&&BR.settings(%s)" % js)

        def command(self, c):
            cmd = c.get("cmd")
            t = self.tab()
            if cmd == "ready":
                self.ready = True
                self.set_expanded(False, c.get("h"))
                self.osk_mtime = 0
                self.watch_osk()
                self.push()
            elif cmd == "height" and not self.expanded:
                self.set_expanded(False, c.get("h"))
            elif cmd == "expand":
                self.set_expanded(bool(c.get("on")), c.get("h"))
            elif cmd == "nav":
                url = str(c.get("url") or "")
                if url:
                    if t:
                        t.view.load(QUrl(url))
                        t.view.setFocus()
                    else:
                        self.new_tab(url)
            elif cmd == "newtab":
                self.new_tab(URL + "newtab.html")
            elif cmd == "close":
                self.close_tab(c.get("id"))
            elif cmd == "select":
                self.select(c.get("id"))
            elif cmd == "back" and t:
                t.page.triggerAction(Page.WebAction.Back)
            elif cmd == "fwd" and t:
                t.page.triggerAction(Page.WebAction.Forward)
            elif cmd == "reload" and t:
                t.page.triggerAction(Page.WebAction.Reload)
            elif cmd == "stop" and t:
                t.page.triggerAction(Page.WebAction.Stop)
            elif cmd in ("zoomIn", "zoomOut") and t:
                z = t.view.zoomFactor() * (1.15 if cmd == "zoomIn" else 1 / 1.15)
                t.view.setZoomFactor(max(0.4, min(3.0, z)))
            elif cmd == "full":
                self.set_fullscreen(not self.full)
            elif cmd == "kbd":
                self.run_in_tab("window.__alhOskToggle&&__alhOskToggle()")
            elif cmd == "home":
                self.go_home()
            elif cmd == "apps":
                self.go_home()
                self.shell.page().runJavaScript("window.go&&go('apps')")

    # ------------------------------------------------------------ interface window
    class ShellPage(Page):
        browser = None

        def javaScriptConsoleMessage(self, level, message, line, source):
            if message.startswith("ALHCMD:") and self.browser:
                try:
                    c = json.loads(message[7:])
                except ValueError:
                    return
                if c.get("cmd") == "browser":
                    self.browser.open(c.get("url"))

    page = ShellPage(profile, app)
    setup_settings(page, shell=True)
    flag = Script()
    flag.setName("alharthia-host")
    flag.setSourceCode("window.ALH_HOST=1;")
    flag.setInjectionPoint(Script.InjectionPoint.DocumentCreation)
    flag.setWorldId(enum_int(Script.ScriptWorldId.MainWorld))
    page.scripts().insert(flag)
    page.fullScreenRequested.connect(lambda req: req.accept())
    page.setBackgroundColor(Q["QColor"]("#0a1433"))

    view = Q["QWebEngineView"]()
    view.setPage(page)
    view.setContextMenuPolicy(Qt.ContextMenuPolicy.NoContextMenu)
    view.setWindowTitle("Alharthia OS")
    view.load(QUrl(URL))
    page.renderProcessTerminated.connect(lambda *_: view.load(QUrl(URL)))

    browser = Browser(view)
    ShellPage.browser = browser

    # let the system keyboard know when the interface (or its browser) is in front
    def on_state(state):
        write_focus(state == Qt.ApplicationState.ApplicationActive)
    app.applicationStateChanged.connect(on_state)
    beat = Q["QTimer"]()
    beat.timeout.connect(lambda: write_focus(app.applicationState() == Qt.ApplicationState.ApplicationActive))
    beat.start(4000)
    write_focus(True)

    if WINDOWED:
        view.resize(1600, 900)
        view.show()
    else:
        view.showFullScreen()
    code = app.exec()
    try:
        os.remove(FOCUS_FILE)
    except OSError:
        pass
    return code


def run_chromium():
    exe = shutil.which("chromium") or shutil.which("chromium-browser")
    if not exe:
        print("No Qt WebEngine and no Chromium found", file=sys.stderr)
        return 1
    try:
        os.remove(FOCUS_FILE)
    except OSError:
        pass
    args = [exe, "--kiosk", f"--app={URL}", f"--user-data-dir={os.path.join(DATA, 'chromium')}",
            "--noerrdialogs", "--disable-infobars", "--no-first-run", "--touch-events=enabled",
            "--password-store=basic", "--disable-pinch", "--overscroll-history-navigation=0",
            "--enable-features=OverlayScrollbar", "--disable-session-crashed-bubble",
            "--check-for-update-interval=31536000", "--ozone-platform-hint=auto",
            "--class=alharthia-shell"]
    if WINDOWED:
        args.remove("--kiosk")
    return subprocess.call(args)


def main():
    if not wait_for_service():
        print("Alharthia service did not start", file=sys.stderr)
    Q = None if os.environ.get("ALH_FORCE_CHROMIUM") else load_qt()
    if Q:
        log("using", Q["mod"], "Qt WebEngine")
    sys.exit(run_qt(Q) if Q else run_chromium())


if __name__ == "__main__":
    main()
