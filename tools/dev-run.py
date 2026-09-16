#!/usr/bin/env python3
"""Try the real interface on any computer (Windows / Linux / macOS) before building the image.
   python tools/dev-run.py   -> opens http://127.0.0.1:8765 in your browser.
   Wi-Fi / Bluetooth / USB features only work on the Raspberry Pi."""
import os, subprocess, sys, time, webbrowser
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
subprocess.call([sys.executable, os.path.join(ROOT, "ui-src", "build.py")])
os.environ.setdefault("ALH_FAKE_HELPER", "1")
p = subprocess.Popen([sys.executable, os.path.join(ROOT, "shell", "alharthia_server.py")])
time.sleep(1.5)
webbrowser.open("http://127.0.0.1:8765/")
print("Press Ctrl+C to stop")
try:
    p.wait()
except KeyboardInterrupt:
    p.terminate()
