#!/usr/bin/env python3
"""
Alharthia OS — wireless screen sharing over the classroom Wi-Fi.

Two directions, both through a small web server on the Pi (no app needed):
  * "عرض شاشتي"    : other devices open http://<pi>:8766/?k=KEY and watch this screen.
  * "استقبال شاشة" : a laptop opens the same page, picks "شارك شاشتك" and its screen
                     is shown on the Pi (browser screen capture, frame by frame).

Used by alharthia_server.py; it has no state of its own besides the server thread.
"""
import html, json, os, queue, secrets, shutil, socket, struct, subprocess, threading, time
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

PORT = int(os.environ.get("ALH_SHARE_PORT", "8766"))
FRAME_MIN_MS = 220          # how often the screen is captured at most
VIEWER_TIMEOUT = 8          # seconds without a frame request = viewer left
IN_TIMEOUT = 6              # seconds without an incoming frame = sender stopped

STATE = {
    "srv": None, "thread": None, "on": False, "key": "", "pin": "",
    "viewers": {}, "frame": b"", "frame_t": 0.0, "lock": threading.Lock(),
    "in_frame": b"", "in_t": 0.0, "in_name": "", "quality": 55, "scale": 0.6,
}


# ------------------------------------------------------------------ live H.264 video
HLS_DIR = "/run/alharthia/hls"
VIDEO = {
    "rec": None, "ff": None, "on": False, "init": b"", "clients": set(),
    "lock": threading.Lock(), "err": "", "fps": 30, "height": 720,
}


def video_tools():
    return bool(shutil.which("wf-recorder") and shutil.which("ffmpeg"))


def _read_boxes(pipe):
    """Yields complete top-level MP4 boxes from the ffmpeg pipe."""
    buf = b""
    while True:
        while len(buf) < 8:
            chunk = pipe.read(65536)
            if not chunk:
                return
            buf += chunk
        size = struct.unpack(">I", buf[:4])[0]
        if size < 8 or size > 64 * 1024 * 1024:
            return
        while len(buf) < size:
            chunk = pipe.read(min(1 << 20, size - len(buf)))
            if not chunk:
                return
            buf += chunk
        yield buf[:4 + 4], buf[:size]
        buf = buf[size:]


def _pump():
    """Splits the fragmented MP4 into an init segment + fragments and fans them out."""
    ff = VIDEO["ff"]
    init, pending = b"", b""
    for head, box in _read_boxes(ff.stdout):
        kind = box[4:8]
        if kind in (b"ftyp", b"moov"):
            init += box
            if kind == b"moov":
                VIDEO["init"] = init
            continue
        if kind == b"moof":
            pending = box
            continue
        if kind == b"mdat" and pending:
            frag = pending + box
            pending = b""
            with VIDEO["lock"]:
                dead = []
                for q in VIDEO["clients"]:
                    try:
                        q.put_nowait(frag)
                    except queue.Full:
                        dead.append(q)
                for q in dead:
                    VIDEO["clients"].discard(q)
    VIDEO["on"] = False


def _rec_cmds(fps, h):
    """wf-recorder writing Matroska to stdout — several spellings, most compatible first."""
    core = ["-c", "libx264", "-x", "yuv420p", "-r", str(fps),
            "-p", "preset=ultrafast", "-p", "tune=zerolatency", "-p", "crf=30",
            "-p", "g=" + str(fps), "-F", "scale=-2:%d" % h]
    prof = ["-p", "profile=baseline", "-p", "level=3.1"]
    outs = [["--muxer=matroska", "--file=/dev/stdout"], ["-m", "matroska", "-f", "/dev/stdout"],
            ["-m", "matroska", "-f", "pipe:1"]]
    cmds = []
    for o in outs:
        cmds.append(["wf-recorder"] + o + core + prof)
        cmds.append(["wf-recorder"] + o + core)
    return cmds


def video_start():
    if VIDEO["on"]:
        return True
    if VIDEO.get("rec") or VIDEO.get("ff"):
        video_stop()          # a previous pipeline died — clean it up before starting again
    if not video_tools():
        VIDEO["err"] = "wf-recorder أو ffmpeg غير مثبت"
        return False
    os.makedirs(HLS_DIR, exist_ok=True)
    for f in os.listdir(HLS_DIR):
        try:
            os.remove(os.path.join(HLS_DIR, f))
        except OSError:
            pass
    h, fps = VIDEO["height"], VIDEO["fps"]
    rec = None
    for cmd in _rec_cmds(fps, h):
        try:
            rec = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, bufsize=0)
        except OSError as e:
            VIDEO["err"] = str(e)
            continue
        time.sleep(0.6)
        if rec.poll() is None:
            break
        rec = None
    if rec is None:
        VIDEO["err"] = "تعذر تشغيل wf-recorder (تأكد أن الجلسة Wayland)"
        return False
    try:
        ff = subprocess.Popen(
            ["ffmpeg", "-hide_banner", "-loglevel", "error", "-fflags", "nobuffer", "-i", "pipe:0",
             "-c", "copy", "-map", "0:v", "-f", "tee",
             "[f=mp4:movflags=empty_moov+default_base_moof+frag_keyframe+frag_every_frame]pipe:1|"
             "[f=hls:hls_time=1:hls_list_size=4:hls_flags=delete_segments+independent_segments+omit_endlist]"
             + HLS_DIR + "/live.m3u8"],
            stdin=rec.stdout, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, bufsize=0)
    except OSError as e:
        rec.kill()
        VIDEO["err"] = str(e)
        return False
    VIDEO.update(rec=rec, ff=ff, on=True, init=b"", err="")
    threading.Thread(target=_pump, daemon=True).start()
    return True


def video_stop():
    VIDEO["on"] = False
    for k in ("ff", "rec"):
        p = VIDEO.get(k)
        if p and p.poll() is None:
            try:
                p.terminate()
                p.wait(timeout=3)
            except Exception:  # noqa
                p.kill()
        VIDEO[k] = None
    with VIDEO["lock"]:
        VIDEO["clients"].clear()
    VIDEO["init"] = b""


def video_client():
    q = queue.Queue(maxsize=90)
    with VIDEO["lock"]:
        VIDEO["clients"].add(q)
    return q


def video_drop(q):
    with VIDEO["lock"]:
        VIDEO["clients"].discard(q)


def lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except OSError:
        return "127.0.0.1"


def capture():
    """A JPEG of the current screen (cached for a moment)."""
    now = time.time()
    with STATE["lock"]:
        if STATE["frame"] and (now - STATE["frame_t"]) * 1000 < FRAME_MIN_MS:
            return STATE["frame"]
    try:
        p = subprocess.run(["grim", "-t", "jpeg", "-q", str(STATE["quality"]),
                            "-s", str(STATE["scale"]), "-"], capture_output=True, timeout=8)
        data = p.stdout if p.returncode == 0 else b""
    except Exception:  # noqa
        data = b""
    with STATE["lock"]:
        if data:
            STATE["frame"], STATE["frame_t"] = data, now
        return STATE["frame"]


def status():
    now = time.time()
    viewers = {k: v for k, v in STATE["viewers"].items() if now - v < VIEWER_TIMEOUT}
    STATE["viewers"] = viewers
    return {
        "on": STATE["on"], "pin": STATE["pin"], "key": STATE["key"],
        "url": f"http://{lan_ip()}:{PORT}/?k={STATE['key']}" if STATE["on"] else "",
        "ip": lan_ip(), "port": PORT, "viewers": len(viewers),
        "incoming": bool(STATE["in_frame"]) and now - STATE["in_t"] < IN_TIMEOUT,
        "from": STATE["in_name"], "tool": bool(_has_grim()),
        "video": VIDEO["on"], "videoTool": video_tools(), "videoErr": VIDEO["err"],
        "airplay": airplay_status(),
    }


def _has_grim():
    from shutil import which
    return which("grim")


PAGE_HOME = """<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Alharthia — العرض اللاسلكي</title>
<style>
:root{color-scheme:dark}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0c1222;color:#e8edf8;
 font-family:"Segoe UI",Tahoma,system-ui,sans-serif;padding:24px}
.card{width:min(520px,100%);background:#141c31;border:1px solid #27324f;border-radius:22px;padding:26px;text-align:center}
h1{font-size:22px;margin:0 0 6px}p{color:#9fb0d0;margin:0 0 22px}
a.btn,button.btn{display:flex;align-items:center;gap:12px;justify-content:center;width:100%;margin:10px 0;padding:18px;
 border-radius:16px;border:0;background:#f0703e;color:#fff;font-size:18px;font-weight:700;text-decoration:none;cursor:pointer}
a.btn.ghost,button.btn.ghost{background:#1e2a47;color:#e8edf8}
small{color:#7e8db0;display:block;margin-top:16px;line-height:1.7}
</style></head><body><div class="card">
<h1>Alharthia OS — العرض اللاسلكي</h1><p>اختر شنو تريد تسوي</p>
<a class="btn" href="/view?k=KEY">👁️ شاهد شاشة الجهاز</a>
<button class="btn ghost" onclick="location.href='/send?k=KEY'">🖥️ شارك شاشتك مع الجهاز</button>
<small>المشاهدة تشتغل على الآيفون والآيباد والأندرويد والكمبيوتر — بث مباشر ٣٠ إطار/ثانية.<br>مشاركة شاشتك مع الجهاز تحتاج متصفح كمبيوتر (Chrome / Edge).<br>آيفون / آيباد: تكدر تسوي «عكس الشاشة» (AirPlay) واختار Alharthia.</small>
</div></body></html>"""

PAGE_VIEW = """<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>شاشة Alharthia</title>
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}
video,img{width:100%;height:100%;object-fit:contain;display:block;background:#000}
#msg{position:fixed;inset:auto 0 12px;text-align:center;color:#fff;font:14px system-ui;opacity:.75}
#way{position:fixed;top:10px;left:10px;color:#fff;font:11px system-ui;opacity:.35}</style>
</head><body>
<video id="vid" autoplay muted playsinline webkit-playsinline></video>
<img id="pic" alt="" hidden>
<div id="msg">جاري الاتصال…</div><div id="way"></div>
<script>
const k=new URLSearchParams(location.search).get('k')||'';
const vid=document.getElementById('vid'), pic=document.getElementById('pic');
const msg=document.getElementById('msg'), way=document.getElementById('way');
const MIMES=['video/mp4; codecs="avc1.42E01E"','video/mp4; codecs="avc1.42001E"','video/mp4; codecs="avc1.4D401F"','video/mp4; codecs="avc1.640028"','video/mp4'];
let live=0, mode='', stopAll=null;
function note(t){ msg.textContent=t; msg.style.display=t?'':'none'; }
function alive(){ live=Date.now(); note(''); way.textContent=mode; }

/* ---------- 1) MSE: أقل تأخير (أندرويد / كروم / ويندوز) ---------- */
async function useMSE(){
  const MS=window.MediaSource||window.ManagedMediaSource;
  if(!MS||!MS.isTypeSupported) return false;
  const MIME=MIMES.find(m=>{ try{ return MS.isTypeSupported(m); }catch(e){ return false; } });
  if(!MIME) return false;
  mode='mse'; pic.hidden=true; vid.hidden=false;
  const ms=new MS(); vid.disableRemotePlayback=true; vid.src=URL.createObjectURL(ms);
  await new Promise(r=>ms.addEventListener('sourceopen',r,{once:true}));
  let sb; try{ sb=ms.addSourceBuffer(MIME); }catch(e){ return false; }
  sb.mode='sequence';
  const q=[]; let busy=false;
  const pump=()=>{ if(busy||sb.updating||!q.length) return; busy=true;
    try{ sb.appendBuffer(q.shift()); }catch(e){ busy=false; q.length=0; } };
  sb.addEventListener('updateend',()=>{ busy=false;
    try{ if(vid.buffered.length&&vid.currentTime-vid.buffered.start(0)>6) sb.remove(0,vid.currentTime-3); }catch(e){}
    pump(); });
  let res; try{ res=await fetch('/live.mp4?k='+k,{cache:'no-store'}); }catch(e){ return false; }
  if(!res.ok||!res.body) return false;
  const rd=res.body.getReader(); stopAll=()=>{ try{ rd.cancel(); }catch(e){} };
  (async()=>{ for(;;){ let r; try{ r=await rd.read(); }catch(e){ break; }
      if(r.done) break; q.push(r.value); pump(); alive();
      if(vid.paused) vid.play().catch(()=>{});
      try{ const n=vid.buffered.length; if(n&&vid.buffered.end(n-1)-vid.currentTime>1.6) vid.currentTime=vid.buffered.end(n-1)-0.4; }catch(e){}
    } live=0; })();
  return true;
}

/* ---------- 2) HLS: آيفون وآيباد (Safari يشغّله مباشرة) ---------- */
function useHLS(){
  if(!vid.canPlayType('application/vnd.apple.mpegurl')) return false;
  mode='hls'; pic.hidden=true; vid.hidden=false; stopAll=null;
  vid.src='/hls/live.m3u8?k='+k;
  vid.addEventListener('timeupdate',alive);
  vid.play().catch(()=>{});
  return true;
}

/* ---------- 3) صور متتابعة: يشتغل بأي متصفح ---------- */
function useJPEG(){
  mode='jpg'; vid.hidden=true; vid.removeAttribute('src'); pic.hidden=false;
  let busy=false;
  const iv=setInterval(async()=>{
    if(busy) return; busy=true;
    try{ const r=await fetch('/frame.jpg?k='+k+'&t='+Date.now(),{cache:'no-store'});
      if(!r.ok) throw 0;
      const u=URL.createObjectURL(await r.blob()), old=pic.src;
      pic.src=u; setTimeout(()=>old&&URL.revokeObjectURL(old),300); alive();
    }catch(e){ note('انقطع الاتصال — جاري المحاولة'); }
    busy=false;
  },250);
  stopAll=()=>clearInterval(iv);
  return true;
}

const CHAIN=[useMSE,useHLS,useJPEG];
const APPLE=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
if(APPLE) CHAIN.unshift(CHAIN.splice(1,1)[0]);
let step=0;
async function next(){
  if(stopAll){ try{ stopAll(); }catch(e){} stopAll=null; }
  while(step<CHAIN.length){ const f=CHAIN[step++];
    try{ if(await f()){ live=Date.now(); return; } }catch(e){}
  }
  step=CHAIN.length-1; useJPEG();
}
next();
setInterval(()=>{ if(live&&Date.now()-live>7000){ note('جاري تبديل طريقة العرض…'); live=0; next(); } },2000);
addEventListener('click',()=>{ vid.play().catch(()=>{});
  const el=document.documentElement; if(el.requestFullscreen) el.requestFullscreen().catch(()=>{});
  else if(vid.webkitEnterFullscreen) vid.webkitEnterFullscreen(); });
</script></body></html>"""

PAGE_SEND = """<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>شارك شاشتك</title>
<style>
:root{color-scheme:dark}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0c1222;color:#e8edf8;font-family:"Segoe UI",Tahoma,system-ui,sans-serif;padding:20px}
.card{width:min(560px,100%);background:#141c31;border:1px solid #27324f;border-radius:22px;padding:24px;text-align:center}
button{padding:16px 22px;border-radius:14px;border:0;background:#f0703e;color:#fff;font-size:17px;font-weight:700;cursor:pointer}
button.stop{background:#dc2626}
input{width:100%;padding:12px;border-radius:12px;border:1px solid #27324f;background:#0f172a;color:#fff;margin:10px 0 16px;font-size:16px}
video{width:100%;border-radius:14px;margin-top:16px;background:#000}
#st{color:#9fb0d0;margin-top:14px}
</style></head><body><div class="card">
<h1 style="margin:0 0 14px;font-size:20px">شارك شاشتك مع Alharthia</h1>
<input id="nm" placeholder="اسمك (يطلع على شاشة الصف)" value="جهاز ضيف">
<button id="go">ابدأ المشاركة</button>
<div id="st">اختار «شاشة كاملة» أو نافذة من المتصفح.</div>
<video id="pv" autoplay muted playsinline></video>
</div>
<script>
const k=new URLSearchParams(location.search).get('k')||'';
const go=document.getElementById('go'), st=document.getElementById('st'), pv=document.getElementById('pv');
let stream=null, timer=null;
const cv=document.createElement('canvas'), cx=cv.getContext('2d');
async function start(){
  if(!navigator.mediaDevices||!navigator.mediaDevices.getDisplayMedia){ st.textContent='هذا المتصفح ما يدعم مشاركة الشاشة. استخدم Chrome أو Edge على الكمبيوتر.'; return; }
  try{ stream=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:8},audio:false}); }
  catch(e){ st.textContent='تم إلغاء المشاركة'; return; }
  pv.srcObject=stream; go.textContent='إيقاف المشاركة'; go.className='stop'; st.textContent='المشاركة شغالة — شاشتك تطلع على شاشة الصف';
  stream.getVideoTracks()[0].addEventListener('ended',stop);
  timer=setInterval(send,320);
}
function stop(){ if(timer) clearInterval(timer); timer=null;
  if(stream){ stream.getTracks().forEach(t=>t.stop()); stream=null; }
  pv.srcObject=null; go.textContent='ابدأ المشاركة'; go.className=''; st.textContent='توقفت المشاركة';
}
async function send(){
  const v=pv; if(!v.videoWidth) return;
  const w=Math.min(1280,v.videoWidth), h=Math.round(v.videoHeight*w/v.videoWidth);
  cv.width=w; cv.height=h; cx.drawImage(v,0,0,w,h);
  const blob=await new Promise(r=>cv.toBlob(r,'image/jpeg',.6));
  if(!blob) return;
  fetch('/frame?k='+k+'&name='+encodeURIComponent(document.getElementById('nm').value||'جهاز'),{method:'POST',body:blob}).catch(()=>{});
}
go.onclick=()=>stream?stop():start();
</script></body></html>"""


class ShareHandler(BaseHTTPRequestHandler):
    server_version = "AlharthiaShare/1.0"

    def log_message(self, *a):
        if os.environ.get("ALH_DEBUG"):
            BaseHTTPRequestHandler.log_message(self, *a)

    def key_ok(self):
        from urllib.parse import urlparse, parse_qs
        q = parse_qs(urlparse(self.path).query)
        return secrets.compare_digest((q.get("k") or [""])[0], STATE["key"])

    def html(self, page):
        data = page.replace("KEY", STATE["key"]).encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def deny(self, code=403, msg="رابط غير صالح — افتح الرابط من شاشة الصف"):
        data = f"<meta charset=utf-8><body style='font:16px system-ui;padding:40px;text-align:center'>{html.escape(msg)}".encode()
        self.send_response(code)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path = self.path.split("?")[0]
        if not STATE["on"]:
            return self.deny(503, "العرض اللاسلكي مطفأ")
        if not self.key_ok():
            return self.deny()
        if path in ("/", "/index.html"):
            return self.html(PAGE_HOME)
        if path == "/view":
            return self.html(PAGE_VIEW)
        if path == "/send":
            return self.html(PAGE_SEND)
        if path == "/live.mp4":
            return self.live_mp4()
        if path.startswith("/hls/"):
            return self.hls(path[5:])
        if path == "/frame.jpg":
            STATE["viewers"][self.client_address[0]] = time.time()
            data = capture()
            if not data:
                return self.deny(503, "تعذر التقاط الشاشة")
            self.send_response(200)
            self.send_header("Content-Type", "image/jpeg")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            try:
                self.wfile.write(data)
            except OSError:
                pass
            return
        return self.deny(404, "غير موجود")

    def live_mp4(self):
        """Fragmented MP4, streamed live (MSE in the viewer's browser)."""
        if not VIDEO["on"] and not video_start():
            return self.deny(503, "البث المباشر غير متاح — " + (VIDEO["err"] or "تحقق من الأدوات"))
        STATE["viewers"][self.client_address[0]] = time.time()
        init, waited = VIDEO["init"], 0.0
        while not init and waited < 12:
            time.sleep(0.2)
            waited += 0.2
            init = VIDEO["init"]
        if not init:
            return self.deny(503, "تعذر بدء البث")
        self.send_response(200)
        self.send_header("Content-Type", "video/mp4")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Connection", "close")
        self.end_headers()
        q = video_client()
        try:
            self.wfile.write(init)
            self.wfile.flush()
            while VIDEO["on"]:
                try:
                    frag = q.get(timeout=5)
                except queue.Empty:
                    continue
                self.wfile.write(frag)
                self.wfile.flush()
                STATE["viewers"][self.client_address[0]] = time.time()
        except (OSError, ValueError):
            pass
        finally:
            video_drop(q)

    def hls(self, name):
        """HLS playlist / segments — this is what iPhone and iPad play natively."""
        if not VIDEO["on"] and not video_start():
            return self.deny(503, "البث المباشر غير متاح")
        if "/" in name or "\\" in name or name.startswith("."):
            return self.deny(404, "غير موجود")
        full = os.path.join(HLS_DIR, name)
        for _ in range(60):
            if os.path.exists(full):
                break
            time.sleep(0.2)
        if not os.path.exists(full):
            return self.deny(404, "غير موجود")
        STATE["viewers"][self.client_address[0]] = time.time()
        try:
            data = open(full, "rb").read()
        except OSError:
            return self.deny(404, "غير موجود")
        if name.endswith(".m3u8"):
            out = []
            for line in data.decode("utf-8", "replace").splitlines():
                if line and not line.startswith("#"):
                    line = line + ("&" if "?" in line else "?") + "k=" + STATE["key"]
                out.append(line)
            data = ("\n".join(out) + "\n").encode()
            ctype = "application/vnd.apple.mpegurl"
        else:
            ctype = "video/mp2t"
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        try:
            self.wfile.write(data)
        except OSError:
            pass

    def do_POST(self):
        from urllib.parse import urlparse, parse_qs
        if not STATE["on"] or not self.key_ok():
            return self.deny()
        if self.path.split("?")[0] != "/frame":
            return self.deny(404, "غير موجود")
        n = int(self.headers.get("Content-Length") or 0)
        data = self.rfile.read(n) if 0 < n <= 8 * 1024 * 1024 else b""
        q = parse_qs(urlparse(self.path).query)
        if data:
            with STATE["lock"]:
                STATE["in_frame"], STATE["in_t"] = data, time.time()
                STATE["in_name"] = (q.get("name") or ["جهاز"])[0][:40]
        self.send_response(204)
        self.end_headers()


def airplay_status():
    """uxplay makes the Pi show up in the iPhone/iPad screen-mirroring list."""
    if not shutil.which("uxplay"):
        return "missing"
    try:
        out = subprocess.run(["systemctl", "is-active", "alharthia-airplay"], capture_output=True, text=True, timeout=4).stdout.strip()
    except Exception:  # noqa
        return "unknown"
    return "on" if out == "active" else "off"


def airplay(on):
    if not shutil.which("uxplay"):
        return "missing"
    cmd = ["systemctl", "start" if on else "stop", "alharthia-airplay"]
    subprocess.run(["sudo", "-n", "/usr/lib/alharthia/alharthia-helper", "airplay", "on" if on else "off"],
                   capture_output=True, timeout=15) if shutil.which("sudo") else subprocess.run(cmd, capture_output=True, timeout=15)
    return airplay_status()


def start():
    if STATE["on"]:
        return status()
    STATE["key"] = secrets.token_urlsafe(6)
    STATE["pin"] = f"{secrets.randbelow(900000) + 100000}"
    srv = ThreadingHTTPServer(("0.0.0.0", PORT), ShareHandler)
    srv.daemon_threads = True
    STATE["srv"] = srv
    STATE["on"] = True
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    STATE["thread"] = t
    video_start()
    return status()


def stop():
    video_stop()
    srv = STATE["srv"]
    STATE.update(on=False, srv=None, viewers={}, in_frame=b"", in_name="", frame=b"")
    if srv:
        threading.Thread(target=srv.shutdown, daemon=True).start()
    return status()


def incoming_frame():
    with STATE["lock"]:
        if STATE["in_frame"] and time.time() - STATE["in_t"] < IN_TIMEOUT:
            return STATE["in_frame"]
    return b""
