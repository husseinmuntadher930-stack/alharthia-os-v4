/* ---- shared by the browser top bar and the new-tab page ---- */
const store={
  get(k,d){ try{ const v=localStorage.getItem('alharthia.'+k); return v==null?d:JSON.parse(v); }catch(e){ return d; } },
  set(k,v){ try{ localStorage.setItem('alharthia.'+k,JSON.stringify(v)); return true; }catch(e){ return false; } }
};
const S=Object.assign({kbdLangs:['ar','en','fr'],kbdLang:'ar',oskMode:'auto',oskSize:'m',oskPreview:true,oskTermKeys:false,ar:true,h24:false,clickSound:false,emojiRecent:[]},store.get('settings',{}));
window.OSK_NOSET=true;
const nf=v=>S.ar?String(v).replace(/\d/g,d=>AR_D[d]):String(v);
const pad=n=>String(n).padStart(2,'0');
function save(){ const cur=store.get('settings',{}); cur.kbdLang=S.kbdLang; cur.emojiRecent=S.emojiRecent; store.set('settings',cur); }
function go(){}
let toastT=0;
function toast(msg,ok=true){
  const t=$('#toast'); if(!t) return; t.querySelector('span').textContent=msg; t.querySelector('svg').innerHTML=ok?ICONS.check:''; t.classList.add('on');
  clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('on'),2400);
}
function applyThemeVars(){
  const tv=store.get('themeVars',null), r=document.documentElement;
  if(!tv) return;
  r.dataset.theme=tv.mode||'light';
  if(tv.pri){ r.style.setProperty('--pri',tv.pri); r.style.setProperty('--pri-2',`color-mix(in srgb,${tv.pri} 78%,#fff)`); }
  if(tv.acc) r.style.setProperty('--acc',tv.acc);
  if(window.Keyboard) Keyboard.dark=tv.mode==='dark';
}
applyThemeVars();
addEventListener('storage',e=>{ if(e.key==='alharthia.themeVars') applyThemeVars(); if(e.key==='alharthia.settings'){ Object.assign(S,store.get('settings',{})); if(window.Keyboard&&Keyboard.syncBtn) Keyboard.syncBtn(); } });
// commands for the Alharthia host window (read from the console)
const HOST={ send(o){ console.log('ALHCMD:'+JSON.stringify(o)); } };
const QUICK_SITES=[
  ['Google','G','#4285f4','https://www.google.com/'],
  ['YouTube','▶','#e11d48','https://www.youtube.com/'],
  ['ويكيبيديا','W','#475569','https://ar.wikipedia.org/'],
  ['GeoGebra','∠','#6d5bd0','https://www.geogebra.org/classic?lang=ar'],
  ['Khan Academy','K','#14a37f','https://ar.khanacademy.org/'],
  ['المنصة التعليمية','م','#f0703e','https://classroom.google.com/'],
  ['بريد المدرسة','ب','#2f6fe4','https://mail.google.com/'],
  ['الخرائط','خ','#16a34a','https://www.google.com/maps']
];
function toURL(q){
  q=(q||'').trim(); if(!q) return '';
  if(/^(https?|file|about|chrome):/i.test(q)) return q;
  if(/^[\w-]+(\.[\w-]+)+(:\d+)?(\/\S*)?$/.test(q)&&!/\s/.test(q)) return 'https://'+q;
  if(/^localhost(:\d+)?(\/|$)/.test(q)) return 'http://'+q;
  return 'https://www.google.com/search?q='+encodeURIComponent(q);
}
function pushHistory(url,title){
  if(!url||/^http:\/\/127\.0\.0\.1:8765\//.test(url)) return;
  const h=store.get('brHist',[]).filter(x=>x.url!==url);
  h.unshift({url,title:title||url,t:Date.now()}); store.set('brHist',h.slice(0,60));
}
