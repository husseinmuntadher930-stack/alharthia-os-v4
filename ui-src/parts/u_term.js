
/* =====================================================================
   TERMINAL — runs inside the interface (xterm.js + a real shell on the Pi),
   so the Alharthia keyboard works in it exactly like everywhere else.
   ===================================================================== */
const TERM_KEYS={BackSpace:'\x7f',Return:'\r',Tab:'\t',Escape:'\x1b',Left:'\x1b[D',Right:'\x1b[C',Up:'\x1b[A',Down:'\x1b[B',Home:'\x1b[H',End:'\x1b[F'};
const Term={
  lib:null, sessions:[], active:null, fontSize:16, seq:0,
  async loadLib(){
    if(this.lib) return this.lib;
    if(!document.getElementById('xtermCss')){ const l=document.createElement('link'); l.id='xtermCss'; l.rel='stylesheet'; l.href='/vendor/xterm/xterm.css'; document.head.appendChild(l); }
    const m=await import('/vendor/xterm/xterm.mjs');
    this.lib=m.default||m; return this.lib;
  },
  cur(){ return this.sessions.find(s=>s.key===this.active); },
  async show(){
    const box=$('#termBody');
    if(!(window.Native&&Native.on)){
      box.innerHTML=`<div class="empty term-empty">${icon('terminal')}<b>الطرفية</b><span>تشتغل على الجهاز الحقيقي فقط.</span></div>`; this.renderTabs(); return;
    }
    if(!this.sessions.length) await this.open();
    else { this.renderTabs(); this.fitAll(); this.focus(); }
  },
  async open(){
    let lib; try{ lib=await this.loadLib(); }catch(e){ toast('تعذر تحميل الطرفية: '+errMsg(e),false); return; }
    const key=++this.seq;
    const el=document.createElement('div'); el.className='term-pane'; el.dataset.k=key;
    $('#termBody').querySelector('.term-empty')?.remove();
    $('#termBody').appendChild(el);
    const dark=document.documentElement.dataset.theme==='dark';
    const term=new lib.Terminal({fontSize:this.fontSize,fontFamily:'"DejaVu Sans Mono","Noto Sans Mono","Liberation Mono",monospace',cursorBlink:true,scrollback:5000,allowProposedApi:true,
      theme:{background:'#0b1020',foreground:'#e6ebf5',cursor:'#f0703e',selectionBackground:'#f0703e55'}});
    const fit=new lib.FitAddon(); term.loadAddon(fit);
    term.open(el);
    const s={key,term,fit,el,id:null,es:null,title:'الطرفية '+nf(key),dead:false,pos:0};
    this.sessions.push(s); this.select(key);
    try{ fit.fit(); }catch(e){}
    try{ s.id=(await API.post('/api/term/open',{cols:term.cols,rows:term.rows})).id; }
    catch(e){ term.write('\r\n\x1b[31m'+errMsg(e)+'\x1b[0m\r\n'); s.dead=true; return; }
    term.onData(d=>this.send(s,d));
    term.onTitleChange(t=>{ s.title=t||s.title; this.renderTabs(); });
    term.onResize(({cols,rows})=>{ if(s.id&&!s.dead) API.post('/api/term/resize',{id:s.id,cols,rows}).catch(()=>{}); });
    this.stream(s);
    // the Alharthia keyboard types straight into the shell
    const ta=el.querySelector('textarea');
    if(ta){ ta.alhSink=this.sinkFor(s); ta.setAttribute('autocapitalize','off'); }
    el.addEventListener('pointerup',()=>{ if(ta){ ta.focus(); Keyboard.onFocus(ta); } });
    this.renderTabs(); this.focus();
  },
  sinkFor(s){
    return {
      text:t=>this.send(s,t),
      key:k=>this.send(s,TERM_KEYS[k]||''),
      combo:(mods,v,isKey)=>{
        let out=isKey?(TERM_KEYS[v]||''):v;
        if(mods.includes('ctrl')&&!isKey&&v.length===1){ const c=v.toUpperCase().charCodeAt(0); if(c>=64&&c<=95) out=String.fromCharCode(c&31); else if(v===' ') out='\x00'; }
        if(mods.includes('alt')) out='\x1b'+out;
        this.send(s,out);
      }
    };
  },
  stream(s){
    const url='/api/term/stream?'+API.q({id:s.id,from:s.pos,t:API.tok});
    const es=new EventSource(url); s.es=es;
    const dec=new TextDecoder();
    es.onmessage=e=>{ const bin=atob(e.data), u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); s.term.write(u); s.pos=+e.lastEventId||s.pos; };
    es.addEventListener('exit',()=>{ es.close(); s.dead=true; s.term.write('\r\n\x1b[33m[انتهت الجلسة — اضغط Enter حتى تبدأ جلسة جديدة]\x1b[0m\r\n'); this.renderTabs(); });
    es.onerror=()=>{ if(s.dead){ es.close(); } };
  },
  send(s,d){
    if(!d) return;
    if(s.dead){ if(d==='\r'){ this.close(s.key,true); this.open(); } return; }
    if(s.id) API.post('/api/term/write',{id:s.id,data:d}).catch(()=>{});
  },
  select(key){
    this.active=key;
    this.sessions.forEach(s=>s.el.hidden=s.key!==key);
    this.renderTabs();
    const s=this.cur(); if(s){ requestAnimationFrame(()=>{ try{ s.fit.fit(); }catch(e){} }); this.focus(); }
  },
  close(key,quiet){
    const s=this.sessions.find(x=>x.key===key); if(!s) return;
    if(s.es) s.es.close();
    if(s.id&&!s.dead) API.post('/api/term/close',{id:s.id}).catch(()=>{});
    s.term.dispose(); s.el.remove();
    this.sessions=this.sessions.filter(x=>x!==s);
    if(this.active===key){ const n=this.sessions[this.sessions.length-1]; if(n) this.select(n.key); else this.active=null; }
    if(!quiet){ this.renderTabs(); if(!this.sessions.length) go('apps'); }
  },
  focus(){ const s=this.cur(); if(s) setTimeout(()=>s.term.focus(),30); },
  fitAll(){ this.sessions.forEach(s=>{ if(!s.el.hidden) try{ s.fit.fit(); }catch(e){} }); },
  zoom(d){ this.fontSize=clamp(this.fontSize+d,10,32); this.sessions.forEach(s=>{ s.term.options.fontSize=this.fontSize; }); this.fitAll(); },
  renderTabs(){
    $('#termTabs').innerHTML=this.sessions.map(s=>`<div class="btab${s.key===this.active?' on':''}" data-tk="${s.key}">${icon('terminal')}<span class="bt-t">${esc(s.title)}</span><button class="bt-x" data-tx="${s.key}" title="إغلاق">${icon('x')}</button></div>`).join('')
      +(window.Native&&Native.on?`<button class="bt-new" data-tm="new" title="جلسة جديدة">${icon('plus')}</button>`:'');
  },
  async onBar(e){
    const x=e.target.closest('[data-tx]'); if(x){ e.stopPropagation(); return this.close(+x.dataset.tx); }
    const t=e.target.closest('[data-tk]'); if(t) return this.select(+t.dataset.tk);
    const b=e.target.closest('[data-tm]'); if(!b) return;
    const a=b.dataset.tm, s=this.cur();
    if(a==='new') return this.open();
    if(a==='zin') this.zoom(2);
    if(a==='zout') this.zoom(-2);
    if(a==='copy'&&s){ const sel=s.term.getSelection(); if(!sel) return toast('حدد نص أولاً',false); try{ await navigator.clipboard.writeText(sel); toast('تم النسخ'); }catch(er){ toast('تعذر النسخ',false); } }
    if(a==='paste'&&s){ try{ const txt=await navigator.clipboard.readText(); if(txt) this.send(s,txt.replace(/\r?\n/g,'\r')); }catch(er){ toast('تعذر اللصق',false); } }
    if(a==='clear'&&s) s.term.clear();
    if(a==='kbd'){ const ta=s&&s.el.querySelector('textarea'); if(Keyboard.el.hidden&&ta){ ta.focus(); Keyboard.target=ta; Keyboard.show(); } else Keyboard.hide(); }
    if(a==='foot'&&window.Native&&Native.on) Native.launch({id:'terminal'},'الطرفية (foot)');
    this.focus();
  },
  init(){
    $('#term').addEventListener('click',e=>this.onBar(e));
    new ResizeObserver(()=>{ if(current==='term') this.fitAll(); }).observe($('#termBody'));
  }
};
onShow.term=()=>Term.show();
ICONS.plus=ICONS.plus||'<path d="M12 5v14M5 12h14"/>';
ICONS.paste='<rect x="8" y="3" width="8" height="4" rx="1"/><path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"/>';
