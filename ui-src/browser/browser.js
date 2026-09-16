/* ---- Alharthia browser: top bar, tabs and address bar ----
   The web pages themselves are shown by the host window (alharthia_host.py) under this bar. */
if(!ICONS.chevL) ICONS.chevL='<path d="m15 18-6-6 6-6"/>';
if(!ICONS.keyboardOff) ICONS.keyboardOff='<rect x="2" y="6" width="20" height="12" rx="2" opacity=".45"/><path d="M3 3l18 18"/>';
if(!ICONS.plus) ICONS.plus='<path d="M12 5v14M5 12h14"/>';
paintIcons();
const BR={
  tabs:[], active:null, expanded:false,
  cur(){ return this.tabs.find(t=>t.id===this.active)||{}; },
  state(st){ this.tabs=st.tabs||[]; this.active=st.active; this.render(); },
  settings(st){ if(!st) return; S.oskMode=st.mode||S.oskMode; S.kbdLangs=st.langs||S.kbdLangs; S.oskSize=st.size||S.oskSize; Keyboard.dark=!!st.dark; this.syncKbd(); },
  isNew(u){ return !u||/^http:\/\/127\.0\.0\.1:8765\/newtab\.html/.test(u)||u==='about:blank'; },
  render(){
    const c=this.cur();
    $('#brTabs').innerHTML=this.tabs.map(t=>`<div class="btab${t.id===this.active?' on':''}" data-tab="${t.id}">
        ${t.loading?'<span class="spin mini"></span>':icon(this.isNew(t.url)?'globe':'globe')}
        <span class="bt-t">${esc(t.title||(this.isNew(t.url)?'صفحة جديدة':t.url))}</span>
        <button class="bt-x" data-close="${t.id}" title="إغلاق">${icon('x')}</button></div>`).join('')
      +`<button class="bt-new" data-br="newtab" title="تبويب جديد">${icon('plus')}</button>`;
    if(document.activeElement!==$('#urlIn')) $('#urlIn').value=this.isNew(c.url)?'':(c.url||'');
    $('#brBack').disabled=!c.canBack; $('#brFwd').disabled=!c.canFwd;
    $('#brReload').innerHTML=icon(c.loading?'x':'restart');
    $('#brLock').style.visibility=/^https:/.test(c.url||'')?'visible':'hidden';
    const p=$('#brProg'); p.classList.toggle('on',!!c.loading); p.firstElementChild.style.width=(c.progress||0)+'%';
    $('#tbTitle').textContent=c.title&&!this.isNew(c.url)?c.title:'Chromium';
    if(c.url&&!c.loading&&!this.isNew(c.url)) pushHistory(c.url,c.title);
  },
  syncKbd(){ const b=$('#tbKbd'); b.classList.toggle('off',S.oskMode==='off'); b.innerHTML=icon(S.oskMode==='off'?'keyboardOff':'keyboard'); },
  height(){ return Math.ceil($('#topbar').offsetHeight+$('#brTabs').offsetHeight+$('.bchrome').offsetHeight+2); },
  expand(on){
    if(on===this.expanded) return; this.expanded=on;
    document.documentElement.classList.toggle('expanded',on);
    $('#brPanel').hidden=!on;
    if(on) this.suggest();
    HOST.send({cmd:'expand',on,h:this.height()});
  },
  suggest(){
    const q=$('#urlIn').value.trim().toLowerCase();
    const hist=store.get('brHist',[]).filter(h=>!q||h.url.toLowerCase().includes(q)||(h.title||'').toLowerCase().includes(q)).slice(0,8);
    const first=q?`<a data-go="${esc(toURL(q))}">${icon(/^https?:/.test(toURL(q))&&!/google\.com\/search/.test(toURL(q))?'globe':'search')}<span>${esc(q)}</span><small>${/google\.com\/search/.test(toURL(q))?'بحث Google':'فتح الموقع'}</small></a>`:'';
    $('#brSug').innerHTML=(first||hist.length?'<h3>'+(q?'اقتراحات':'زرتها مؤخراً')+'</h3>':'')+first+hist.map(h=>`<a data-go="${esc(h.url)}">${icon('globe')}<span>${esc(h.title)}</span><small dir="ltr">${esc(h.url.replace(/^https?:\/\//,'').slice(0,60))}</small></a>`).join('');
  },
  open(u){ u=toURL(u); if(!u) return; HOST.send({cmd:'nav',url:u}); $('#urlIn').blur(); Keyboard.hide(); this.expand(false); },
  tick(){ const d=new Date(); let h=d.getHours(),m=d.getMinutes(); let t; if(S.h24) t=pad(h)+':'+pad(m); else { const ap=h<12?'ص':'م'; t=(h%12||12)+':'+pad(m)+' '+ap; } $('#tbClock').textContent=nf(t); },
  init(){
    $('#brQuick').innerHTML=QUICK_SITES.map(([n,l,c,u])=>`<button class="qk" data-go="${esc(u)}"><i style="--c:${c}">${esc(l)}</i>${esc(n)}</button>`).join('');
    document.addEventListener('click',e=>{
      const g=e.target.closest('[data-go]'); if(g){ e.preventDefault(); this.open(g.dataset.go); return; }
      const x=e.target.closest('[data-close]'); if(x){ e.stopPropagation(); HOST.send({cmd:'close',id:+x.dataset.close}); return; }
      const t=e.target.closest('[data-tab]'); if(t){ HOST.send({cmd:'select',id:+t.dataset.tab}); return; }
      const b=e.target.closest('[data-br]'); if(!b) return;
      const a=b.dataset.br;
      if(a==='reload') HOST.send({cmd:this.cur().loading?'stop':'reload'});
      else HOST.send({cmd:a});
      if(a==='home'||a==='apps'){ Keyboard.hide(); this.expand(false); }
    });
    const u=$('#urlIn');
    u.addEventListener('focus',()=>{ this.expand(true); setTimeout(()=>u.select(),30); });
    u.addEventListener('blur',()=>setTimeout(()=>{ if(document.activeElement!==u) this.expand(false); },250));
    u.addEventListener('input',()=>this.suggest());
    $('#brForm').addEventListener('submit',e=>{ e.preventDefault(); this.open(u.value); });
    addEventListener('keydown',e=>{ if(e.key==='Escape'){ u.blur(); Keyboard.hide(); this.expand(false); } });
    $('#brPanel').addEventListener('pointerdown',e=>{ if(e.target.id==='brPanel'||e.target.classList.contains('brp-in')){ e.preventDefault(); u.blur(); Keyboard.hide(); this.expand(false); } });
    Keyboard.dark=document.documentElement.dataset.theme==='dark';
    Keyboard.init();
    this.syncKbd(); this.tick(); setInterval(()=>this.tick(),10000);
    new ResizeObserver(()=>{ if(!this.expanded) HOST.send({cmd:'height',h:this.height()}); }).observe($('#br'));
    HOST.send({cmd:'ready',h:this.height()});
  }
};
window.BR=BR;
BR.init();
