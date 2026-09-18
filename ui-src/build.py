#!/usr/bin/env python3
"""Builds the Alharthia OS interface.
  python3 ui-src/build.py            -> shell/ui/index.html  (for the real system, works offline)
  python3 ui-src/build.py --demo     -> dist/alharthia-os-demo.html (single file preview for any browser)
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
P = lambda *a: os.path.join(HERE, *a)
PARTS = ['a_head.html', 'b_css.html', 'c_css.html', 'd_body.html', 'e_core.js', 'f_brand.js',
         'g_board1.js', 'g_board2.js', 'g_board3.js', 'g_board4.js', 'h_pdf.js', 'i_fs.js', 'j_office.js',
         'k_store.js', 'm_ported.js', 'n_extra.js', 'o_apps.js', 'p_attend.js', 's_media.js', 't_picker.js', 'u_term.js', 'w_side.js', 'z_qr.js', 'x_cast.js', 'y_lang.js', 'q_native.js', 'r_keyboard.js', 'l_sys.js']
ASSETS = {'__LOGO__': 'logo.b64', '__DEMOPDF__': 'demo.b64', '__DOCX__': 'sample.docx.b64',
          '__XLSX__': 'sample.xlsx.b64', '__PPTX__': 'sample.pptx.b64'}

def build(demo):
    s = ''.join(open(P('parts', p), encoding='utf-8').read() for p in PARTS)
    for k, f in ASSETS.items():
        assert k in s, k
        s = s.replace(k, open(P('assets', f)).read().strip())
    if not demo:
        # offline: no Google Fonts, use bundled/system fonts
        import re
        s = re.sub(r'<link rel="preconnect"[^>]*>\s*', '', s)
        s = re.sub(r'<link href="https://fonts.googleapis.com[^>]*>', '<link rel="stylesheet" href="/vendor/fonts/fonts.css">', s)
        out = os.path.join(ROOT, 'shell', 'ui', 'index.html')
    else:
        out = os.path.join(ROOT, 'dist', 'alharthia-os-demo.html')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, 'w', encoding='utf-8').write(s)
    print('built', out, len(s) // 1024, 'KB')

def _helpers():
    """Small shared JS helpers (icons, $, esc…) for the extra pages."""
    core = open(P('parts', 'e_core.js'), encoding='utf-8').read()
    a = core.index('const $=')
    b = core.index('\n', core.index("const esc="))
    icons_a = core.index('const ICONS={')
    icons_b = core.index('\n};', icons_a) + 3
    h = core[a:b] + '\n' + core[icons_a:icons_b] + '\n'
    h += "const icon=(n,a='')=>`<svg class=\"i\" viewBox=\"0 0 24 24\" ${a}>${ICONS[n]||''}</svg>`;\n"
    h += "function paintIcons(root=document){ for(const el of root.querySelectorAll('svg[data-i]')){ el.setAttribute('viewBox','0 0 24 24'); el.innerHTML=ICONS[el.dataset.i]||''; el.removeAttribute('data-i'); } }\n"
    h += "const AR_D='٠١٢٣٤٥٦٧٨٩';\nconst clamp=(v,a,b)=>Math.max(a,Math.min(b,v));\n"
    return h


def _osk_css():
    css = open(P('parts', 'c_css.html'), encoding='utf-8').read()
    ca = css.index('#osk{position:fixed')
    cb = css.index('/* ============', ca)
    return css[ca:cb]


def _keyboard():
    return open(P('parts', 'r_keyboard.js'), encoding='utf-8').read().replace('<script>', '').replace('</script>', '')


def _all_css():
    """Every style of the main interface (same look everywhere)."""
    t = ''.join(open(P('parts', x), encoding='utf-8').read() for x in ('a_head.html', 'b_css.html', 'c_css.html'))
    return t[t.index('<style>') + 7:t.index('</style>')]


def _write(demo, name, s):
    out = os.path.join(ROOT, 'dist' if demo else os.path.join('shell', 'ui'), name)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, 'w', encoding='utf-8').write(s)
    print('built', out, len(s) // 1024, 'KB')


def build_osk(demo):
    """The system-wide keyboard page (shown by shell/alharthia_osk.py above every program)."""
    s = open(P('osk', 'osk_shell.html'), encoding='utf-8').read()
    s = s.replace('/*__OSK_CSS__*/', _osk_css()).replace('/*__CORE__*/', _helpers()).replace('/*__KEYBOARD__*/', _keyboard())
    _write(demo, 'osk.html', s)


def build_inject(demo):
    """Keyboard injected into every web page of the Alharthia browser."""
    import json
    css = (':host{all:initial}*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}'
           'button{font:inherit;color:inherit;cursor:pointer;border:0;background:none;padding:0;margin:0;line-height:normal;text-transform:none;letter-spacing:normal;min-width:0;min-height:0}'
           'svg.i{width:1em;height:1em;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex:none;display:block}'
           '[hidden]{display:none!important}'
           '#osk{--acc:#f0703e;--font:"IBM Plex Sans Arabic","Noto Sans Arabic UI","Noto Sans Arabic",sans-serif;font-family:var(--font);direction:ltr;text-align:center;font-size:16px;line-height:1.2}'
           + _osk_css())
    s = ('(function(){\n"use strict";\nif(window.__alhOsk||window.top!==window||location.host==="127.0.0.1:8765") return; window.__alhOsk=1;\n'
         + _helpers() + 'const OSK_CSS=' + json.dumps(css, ensure_ascii=False) + ';\n'
         + open(P('osk', 'inject_head.js'), encoding='utf-8').read() + _keyboard()
         + open(P('osk', 'inject_tail.js'), encoding='utf-8').read() + '\n})();\n')
    _write(demo, 'osk-inject.js', s)


def build_pages(demo):
    """Alharthia browser: the top bar / tabs page and the new-tab page."""
    common = _all_css()
    for name, body in (('browser.html', 'browser_body.html'), ('newtab.html', 'newtab_body.html')):
        s = open(P('browser', 'page_shell.html'), encoding='utf-8').read()
        s = s.replace('/*__CSS__*/', common + open(P('browser', 'extra.css'), encoding='utf-8').read())
        s = s.replace('<!--__BODY__-->', open(P('browser', body), encoding='utf-8').read())
        s = s.replace('/*__CORE__*/', _helpers() + open(P('browser', 'common.js'), encoding='utf-8').read())
        s = s.replace('/*__KEYBOARD__*/', _keyboard())
        s = s.replace('/*__PAGE__*/', open(P('browser', body.replace('_body.html', '.js')), encoding='utf-8').read())
        s = s.replace('__LOGO__', open(P('assets', 'logo.b64')).read().strip())
        _write(demo, name, s)


if __name__ == '__main__':
    build('--demo' in sys.argv)
    build_osk('--demo' in sys.argv)
    build_inject('--demo' in sys.argv)
    build_pages('--demo' in sys.argv)
