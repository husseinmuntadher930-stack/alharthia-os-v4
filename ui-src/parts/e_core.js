<script>
"use strict";
/* =====================================================================
   Alharthia OS — واجهة تجريبية (Prototype)
   ===================================================================== */
const LOGO_DEFAULT="data:image/webp;base64,__LOGO__";
const SAMPLES={pdf:"__DEMOPDF__",docx:"__DOCX__",xlsx:"__XLSX__",pptx:"__PPTX__"};
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------------- icons ---------------- */
const ICONS={
users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
attend:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="m9 13 2 2 4-4"/>',
dice:'<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><circle cx="15" cy="15" r="1.2" fill="currentColor"/><circle cx="15" cy="9" r="1.2" fill="currentColor"/><circle cx="9" cy="15" r="1.2" fill="currentColor"/>',
home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h5v-6h4v6h5V9.5"/>',
apps:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
store:'<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
board:'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4M8 20h8"/><path d="m7 12 3-3 2 2 4-4"/>',
pdf:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
doc:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
word:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="m8 12 1.5 6 2.5-5 2.5 5 1.5-6"/>',
table:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/>',
slides:'<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M12 16v3m-4 2 4-2 4 2"/><path d="M8 12v-2m4 2V8m4 4v-3"/>',
folder:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
folderPlus:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 10v6M9 13h6"/>',
globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
timer:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',
gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
pen:'<path d="M4 20l1-5L16 4l4 4L9 19z"/><path d="m13.5 6.5 4 4"/>',
fountain:'<path d="M12 21 7.5 12 12 3l4.5 9z"/><path d="M12 3v8"/><circle cx="12" cy="13" r="1.3"/><path d="M8 21h8"/>',
nib:'<path d="M4 20c3-1 5-3 6-6l6-9 3 3-9 6c-3 1-5 3-6 6z"/><path d="m14 7 3 3"/>',
marker:'<path d="m9 11-5 5v4h4l5-5"/><path d="m9 11 6-6 4 4-6 6z"/><path d="M15 20h6"/>',
laser:'<circle cx="12" cy="12" r="3" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
eraser:'<path d="m7 21-4-4a1.5 1.5 0 0 1 0-2L13 5a1.5 1.5 0 0 1 2 0l5 5a1.5 1.5 0 0 1 0 2l-9 9"/><path d="M7 21h14"/><path d="m8.5 9.5 6 6"/>',
objErase:'<path d="m7 21-4-4a1.5 1.5 0 0 1 0-2L13 5a1.5 1.5 0 0 1 2 0l5 5a1.5 1.5 0 0 1 0 2l-9 9"/><path d="M7 21h14"/><path d="m14 14 6 6M20 14l-6 6" stroke-width="1.8"/>',
cursor:'<path d="M5 3l6.5 17 2.3-7.2L21 10.5z"/>',
textT:'<path d="M5 6V4h14v2M12 4v16M9 20h6"/>',
shapes:'<rect x="3" y="12" width="9" height="9" rx="1"/><circle cx="16.5" cy="7.5" r="4.5"/>',
line:'<path d="M5 19 19 5"/>',
dline:'<path d="M5 19l2.5-2.5M10 14l2.5-2.5M15 9l2.5-2.5"/>',
arrow:'<path d="M5 19 19 5M10 5h9v9"/>',
darrow:'<path d="M5 19 19 5M13 5h6v6M11 19H5v-6"/>',
rect:'<rect x="4" y="6" width="16" height="12" rx="1"/>',
ellipse:'<ellipse cx="12" cy="12" rx="9" ry="6.5"/>',
circle:'<circle cx="12" cy="12" r="8.5"/>',
triangle:'<path d="M12 4 21 20H3z"/>',
rtri:'<path d="M5 4v16h15z"/>',
diamond:'<path d="m12 3 9 9-9 9-9-9z"/>',
pentagon:'<path d="m12 3 9 6.5-3.5 11h-11L3 9.5z"/>',
hexagon:'<path d="M7.5 4h9l4.5 8-4.5 8h-9L3 12z"/>',
star:'<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
fill:'<path d="m5 11 7-7 7 7-7 7z" fill="currentColor" fill-opacity=".25"/><path d="M20 15s2 2.5 2 4a2 2 0 0 1-4 0c0-1.5 2-4 2-4z"/>',
setsq:'<path d="M4 20V4l16 16z"/><path d="M8 16v-4l4 4z"/>',
setsq30:'<path d="M4 20V9l16 11z"/><path d="M7 17v-2.5l3.5 2.5z"/>',
ruler:'<path d="M3 16.5 16.5 3 21 7.5 7.5 21z"/><path d="m7.5 12 2 2M10.5 9l1.5 1.5M13.5 6l2 2"/>',
protractor:'<path d="M3 18a9 9 0 0 1 18 0z"/><path d="M12 18 16.5 11.5"/><path d="M7.5 18a4.5 4.5 0 0 1 9 0"/>',
compass:'<circle cx="12" cy="4" r="1.6"/><path d="M11.2 5.5 6 21M12.8 5.5 18 21M8.5 13.5h7"/>',
axes:'<path d="M3 12h18M12 3v18"/><path d="m19 10 2 2-2 2M10 5l2-2 2 2"/><path d="M7 11v2M17 11v2M11 7h2M11 17h2"/>',
straight:'<path d="M5 19 19 5"/><circle cx="5" cy="19" r="2.2" fill="currentColor"/><circle cx="19" cy="5" r="2.2" fill="currentColor"/>',
eyedrop:'<path d="m13 7 4 4"/><path d="M4 20l1.2-4.2 8.3-8.3 3 3-8.3 8.3z"/><path d="M14.5 5.5 16 4a2.1 2.1 0 0 1 3 3l-1.5 1.5"/>',
palette:'<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2 0-1.4-1-1.7-1-3 0-1 .8-2 2-2h2a4 4 0 0 0 4-4c0-4-4-7-9-7z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
undo:'<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
redo:'<path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
grid:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
chevR:'<path d="m9 6 6 6-6 6"/>', chevL:'<path d="m15 6-6 6 6 6"/>',
chevUp:'<path d="m6 15 6-6 6 6"/>', chevDown:'<path d="m6 9 6 6 6-6"/>',
plus:'<path d="M12 5v14M5 12h14"/>', minus:'<path d="M5 12h14"/>',
download:'<path d="M12 3v12m-5-5 5 5 5-5"/><path d="M5 21h14"/>',
upload:'<path d="M12 16V4m-5 5 5-5 5 5"/><path d="M5 20h14"/>',
save:'<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>',
wifi:'<path d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0"/><path d="M12 19h.01" stroke-width="3"/>',
wifiOff:'<path d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0" opacity=".35"/><path d="M3 3l18 18"/>',
bluetooth:'<path d="m7 7 10 10-5 5V2l5 5L7 17"/>',
vol:'<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
usb:'<path d="M12 2v15"/><circle cx="12" cy="19" r="2"/><path d="m10 5 2-3 2 3"/><path d="M12 14 8 12V9M12 12l4-2V8"/><circle cx="8" cy="8" r="1"/><path d="M15 6h2v2h-2z"/>',
power:'<path d="M12 3v9"/><path d="M6.3 6.3a8 8 0 1 0 11.4 0"/>',
move:'<path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"/>',
image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
zoomIn:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M11 8v6M8 11h6"/>',
zoomOut:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M8 11h6"/>',
fit:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
exitFull:'<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
fitW:'<path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4"/>',
sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
moon:'<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
autoTheme:'<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 0 0 17z" fill="currentColor"/>',
lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
restart:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
play:'<path d="M8 5v14l11-7z" fill="currentColor"/>',
pause:'<path d="M7 5h3v14H7zM14 5h3v14h-3z" fill="currentColor"/>',
sidebar:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>',
eject:'<path d="M5 14h14L12 6z"/><path d="M5 18h14"/>',
search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
check:'<path d="m5 12 5 5 9-10"/>',
x:'<path d="M6 6l12 12M18 6 6 18"/>',
info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
monitor:'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',
list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
hdd:'<rect x="3" y="13" width="18" height="7" rx="2"/><path d="M5 13 7.5 5h9L19 13"/><path d="M7 16.5h.01M11 16.5h.01"/>',
chip:'<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
phone:'<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
laptop:'<rect x="4" y="5" width="16" height="11" rx="1"/><path d="M2 19h20"/>',
speaker:'<rect x="6" y="2" width="12" height="20" rx="2"/><circle cx="12" cy="14" r="3"/><path d="M12 7h.01"/>',
headphones:'<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="7" rx="1.5"/><rect x="17" y="14" width="4" height="7" rx="1.5"/>',
inbox:'<path d="M4 13h4l2 3h4l2-3h4"/><path d="M5 5h14l1 8v6H4v-6z"/>',
up:'<path d="M12 19V5M6 11l6-6 6 6"/>',
pages:'<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
music:'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
video:'<rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-3v10l-5-3"/>',
zip:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M11 4v2M11 8v2M11 12v2"/><rect x="10" y="15" width="2.5" height="3"/>',
clean:'<path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/><path d="M19 15l.8 1.7 1.7.8-1.7.8L19 20l-.8-1.7-1.7-.8 1.7-.8z"/>',
shield:'<path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="m9 12 2 2 4-4"/>',
thermo:'<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z"/>',
format:'<rect x="3" y="13" width="18" height="7" rx="2"/><path d="M5 13 7.5 5h9L19 13"/><path d="M9 9l6 0" /><path d="M16 17h2"/>',
dots:'<circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/>',
star2:'<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="currentColor"/>',
};
function paintIcons(root=document){
  for(const el of root.querySelectorAll('svg[data-i]')){ el.setAttribute('viewBox','0 0 24 24'); el.innerHTML=ICONS[el.dataset.i]||''; el.removeAttribute('data-i'); }
}
const icon=(n,a='')=>`<svg class="i" viewBox="0 0 24 24" ${a}>${ICONS[n]||''}</svg>`;

/* ---------------- storage & settings ---------------- */
const store={
  get(k,d){try{const v=localStorage.getItem('alharthia.'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},
  set(k,v){try{localStorage.setItem('alharthia.'+k,JSON.stringify(v));return true}catch(e){return false}},
  del(k){try{localStorage.removeItem('alharthia.'+k)}catch(e){}}
};
const OS_VERSION='1.7';
const DEF={
  school:'ثانوية المتميزين في الحارثية', cls:'الصف الثالث متوسط -ج-',
  showSchool:true, showText:true, showLogo:true, strip:true, logo:null,
  logoPos:{p:'tr',x:.9,y:.2}, logoSize:1, textPos:{p:'beside',x:.65,y:.2}, textSize:1,
  wall:'navy', wallImg:null, clock:true, h24:false, ar:true,
  mode:'light', theme:'harthia', acc:'#f0703e',
  wifi:true, wifiNet:'Harthiya-School', bt:true, btVisible:true, btReceive:true, btAuto:false, btName:'Alharthia-3C',
  boardBg:'white', palm:true, penOnly:false, assistDef:false, smooth:.45, autosave:true,
  vol:70, bright:100, sleep:'10', recent:[], installed:[],
  wallId:null, lockMode:'same', lockId:null, appBgId:null, appBgOp:.18, wallDim:30, wallBlur:0, autoColors:true, slideshow:false, slideMin:'10', customPri:'#132557',
  uiScale:100, dockScale:100, dockLabels:true, nightLight:false, nightLevel:35, nightAuto:false, orient:'landscape',
  contrast:false, reduceMotion:false, bigCursor:false, hideCursor:false, clickSound:false, osk:true, boldText:false,
  lang:'ar', dateFmt:'long', tz:'Asia/Baghdad', autoTime:true,
  pin:null, lockOnStart:false, lockSettings:false, lockStore:false,
  startApp:'home', sideDir:'v', sidePos:null, kbdLangs:['ar','en','fr'], kbdLang:'ar', oskMode:'auto', oskSize:'m', oskPreview:true, oskTopBtn:true, oskTermKeys:true, dock:['board','pdf','files','chromium','store'], hiddenApps:[], defaults:{pdf:'pdf',docx:'word',img:'viewer',video:'vlc'}, bootSound:true, offOn:false, offTime:'14:00', autoUpdate:true
};
const S=Object.assign(structuredClone(DEF),store.get('settings',{}));
let saveT=0;
function save(msg){ clearTimeout(saveT); saveT=setTimeout(()=>{ if(!store.set('settings',S)) toast('تعذر الحفظ: مساحة التخزين ممتلئة'); },250); if(msg) toast(msg); }

/* ---------------- helpers ---------------- */
const AR_D='٠١٢٣٤٥٦٧٨٩';
const nf=v=>S.ar?String(v).replace(/\d/g,d=>AR_D[d]):String(v);
const pad=n=>String(n).padStart(2,'0');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const uid=()=>Math.random().toString(36).slice(2,10);
const DAYS=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const MONTHS=['كانون الثاني','شباط','آذار','نيسان','أيار','حزيران','تموز','آب','أيلول','تشرين الأول','تشرين الثاني','كانون الأول'];
function tzNow(){ try{ return new Date(new Date().toLocaleString('en-US',{timeZone:S.tz})); }catch(e){ return new Date(); } }
function timeParts(d=tzNow()){
  let h=d.getHours(),m=d.getMinutes();
  if(S.h24) return {t:nf(pad(h)+':'+pad(m)),ap:''};
  const ap=h<12?'ص':'م'; h=h%12||12; return {t:nf(h+':'+pad(m)),ap};
}
const dateStr=(d=tzNow())=>S.dateFmt==='short'?`${DAYS[d.getDay()]} ${nf(d.getDate())}/${nf(d.getMonth()+1)}/${nf(d.getFullYear())}`:`${DAYS[d.getDay()]} ${nf(d.getDate())} ${MONTHS[d.getMonth()]} ${nf(d.getFullYear())}`;
const shortDate=(d=new Date())=>`${nf(d.getDate())} ${MONTHS[d.getMonth()]}`;
function fmtSize(b){ if(b<1024) return b+' B'; const u=['KB','MB','GB','TB']; let i=-1; do{b/=1024;i++;}while(b>=1024&&i<3); return (b>=100?b.toFixed(0):b>=10?b.toFixed(1):b.toFixed(2)).replace(/\.0+$/,'')+' '+u[i]; }
let toastT=0;
function toast(msg,ok=true){
  const t=$('#toast'); t.querySelector('span').textContent=msg; t.querySelector('svg').style.display=ok?'':'none'; t.classList.add('on');
  clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('on'),2400);
}
function beep(times=3,freq=880){
  try{ const ac=new (window.AudioContext||window.webkitAudioContext)();
    for(let i=0;i<times;i++){ const o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime+i*.45;
      o.frequency.value=freq;o.connect(g);g.connect(ac.destination);g.gain.setValueAtTime(.0001,t);
      g.gain.exponentialRampToValueAtTime(.35*(S.vol/100)+.001,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.35);o.start(t);o.stop(t+.4);}
  }catch(e){}
}
function readAsDataURL(file){return new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=rej;fr.readAsDataURL(file);});}
function loadImg(src){return new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=src;});}
async function shrinkImage(src,max=1600,type='image/jpeg',q=.86){
  const im=await loadImg(src); const k=Math.min(1,max/Math.max(im.width,im.height));
  const c=document.createElement('canvas'); c.width=Math.round(im.width*k); c.height=Math.round(im.height*k);
  const x=c.getContext('2d'); if(type==='image/jpeg'){x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);} x.drawImage(im,0,0,c.width,c.height);
  let url=c.toDataURL(type,q); return {url,w:c.width,h:c.height};
}
function b64ToBuf(b64){const bin=atob(b64),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u.buffer;}
function downloadURL(url,name){const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();}

/* external libraries (loaded only when needed) */
const LIBS={
  jszip:{g:'JSZip',u:[...(window.ALH_NATIVE?['/vendor/jszip.min.js']:[]),'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js','https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js']},
  pdflib:{g:'PDFLib',u:[...(window.ALH_NATIVE?['/vendor/pdf-lib.min.js']:[]),'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js','https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js']}
};
const libCache={};
function lib(name){
  const L=LIBS[name]; if(window[L.g]) return Promise.resolve(window[L.g]);
  return libCache[name]||(libCache[name]=(async()=>{
    for(const u of L.u){
      try{ await new Promise((res,rej)=>{const s=document.createElement('script');s.src=u;s.onload=res;s.onerror=rej;document.head.appendChild(s);}); if(window[L.g]) return window[L.g]; }catch(e){}
    }
    delete libCache[name]; throw new Error('lib');
  })());
}
let pdfjsP=null;
function pdfjs(){
  return pdfjsP||(pdfjsP=(async()=>{
    if(window.ALH_NATIVE){ try{ const m=await import('/vendor/pdfjs/pdf.min.mjs'); m.GlobalWorkerOptions.workerSrc='/vendor/pdfjs/pdf.worker.min.mjs'; return m; }catch(e){} }
    try{ const base='https://cdn.jsdelivr.net/npm/pdfjs-dist@5.7.284/legacy/build/'; const m=await import(base+'pdf.min.mjs'); m.GlobalWorkerOptions.workerSrc=base+'pdf.worker.min.mjs'; return m; }
    catch(e){ const base='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
      await new Promise((res,rej)=>{const s=document.createElement('script');s.src=base+'pdf.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s);});
      window.pdfjsLib.GlobalWorkerOptions.workerSrc=base+'pdf.worker.min.js'; return window.pdfjsLib; }
  })().catch(e=>{pdfjsP=null;throw e;}));
}

/* ---------------- modal helpers ---------------- */
function modal({title,iconName,body='',actions=[{label:'حسناً',val:true,cls:'primary'}],wide=false,onOpen}){
  return new Promise(resolve=>{
    const host=$('#modalHost'); const ov=document.createElement('div'); ov.className='overlay';
    ov.innerHTML=`<div class="modal" style="${wide?'width:min(760px,100%)':''}"><h3>${iconName?icon(iconName):''}${title||''}</h3><div class="mb">${body}</div>
      <div class="btns">${actions.map((a,i)=>`<button class="btn ${a.cls||''}" data-i="${i}">${a.label}</button>`).join('')}</div></div>`;
    host.appendChild(ov);
    const done=v=>{ov.remove();document.removeEventListener('keydown',kd,true);resolve(v);};
    const kd=e=>{ if(e.key==='Escape'){e.stopPropagation();done(null);} };
    document.addEventListener('keydown',kd,true);
    ov.addEventListener('click',e=>{ if(e.target===ov) return done(null); const b=e.target.closest('.btns [data-i]'); if(b){ const a=actions[+b.dataset.i]; done(typeof a.val==='function'?a.val(ov):a.val); } });
    onOpen&&onOpen(ov,done);
  });
}
const confirmBox=(title,text,ok='تأكيد',danger=false,ic='info')=>modal({title,iconName:ic,body:`<p>${text}</p>`,actions:[{label:'إلغاء',val:false,cls:'ghost'},{label:ok,val:true,cls:danger?'danger fill':'primary'}]});
function promptBox(title,value='',ph=''){
  return modal({title,iconName:'edit',body:`<input class="field" id="pbIn" type="text" value="${esc(value)}" placeholder="${esc(ph)}">`,
    actions:[{label:'إلغاء',val:null,cls:'ghost'},{label:'حفظ',val:ov=>$('#pbIn',ov).value.trim()||null,cls:'primary'}],
    onOpen:(ov,done)=>{const i=$('#pbIn',ov);i.focus();i.select();i.addEventListener('keydown',e=>{if(e.key==='Enter')done(i.value.trim()||null);});}});
}

/* ---------------- colour utils + picker ---------------- */
function hsv2rgb(h,s,v){const f=n=>{const k=(n+h/60)%6;return v-v*s*Math.max(0,Math.min(k,4-k,1));};return [f(5),f(3),f(1)].map(x=>Math.round(x*255));}
function rgb2hex([r,g,b]){return '#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');}
function hex2rgb(h){h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);return [(n>>16)&255,(n>>8)&255,n&255];}
function rgb2hsv([r,g,b]){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;
  if(d){if(mx===r)h=((g-b)/d)%6;else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360;}return [h,mx?d/mx:0,mx];}
const isHex=h=>/^#?[0-9a-f]{6}$/i.test(h)||/^#?[0-9a-f]{3}$/i.test(h);
const PRESET_COLORS=['#000000','#374151','#6b7280','#d1d5db','#ffffff','#7f1d1d','#dc2626','#f87171','#be185d','#ec4899',
  '#9a3412','#f0703e','#fb923c','#ca8a04','#fde047','#166534','#16a34a','#4ade80','#0f766e','#2dd4bf',
  '#132557','#1d4ed8','#2563eb','#60a5fa','#0ea5e9','#581c87','#7c3aed','#a855f7','#c084fc','#8b5a2b'];
function colorPicker(el,initial,onChange){
  el.classList.add('cpick');
  el.innerHTML=`<div class="cwheel"><canvas width="420" height="420"></canvas><div class="knob"></div></div>
   <div class="cp-side">
     <div class="cp-lbl">الإضاءة</div><input type="range" class="cp-val" min="0" max="100" value="100">
     <div class="cp-lbl">ألوان جاهزة</div><div class="cp-grid">${PRESET_COLORS.map(c=>`<button data-c="${c}" style="--c:${c}" aria-label="${c}"></button>`).join('')}</div>
     <div class="cp-lbl">آخر الألوان</div><div class="cp-grid cp-recent"></div>
     <div class="cp-now"><i></i><input type="text" maxlength="7" spellcheck="false"></div>
   </div>`;
  const cv=$('canvas',el), knob=$('.knob',el), val=$('.cp-val',el), hexIn=$('.cp-now input',el), prev=$('.cp-now i',el), recent=$('.cp-recent',el);
  const x=cv.getContext('2d'), R=210, img=x.createImageData(420,420);
  for(let j=0;j<420;j++)for(let i=0;i<420;i++){const dx=i-R,dy=j-R,d=Math.hypot(dx,dy);const o=(j*420+i)*4;
    if(d>R+1){img.data[o+3]=0;continue;} let h=Math.atan2(dy,dx)*180/Math.PI;if(h<0)h+=360;const [r,g,b]=hsv2rgb(h,Math.min(1,d/R),1);
    img.data[o]=r;img.data[o+1]=g;img.data[o+2]=b;img.data[o+3]=d>R?Math.round((R+1-d)*255):255;}
  x.putImageData(img,0,0);
  let h=0,s=0,v=1;
  const show=(fire)=>{
    const hex=rgb2hex(hsv2rgb(h,s,v)), rr=105;
    knob.style.left=(rr+Math.cos(h*Math.PI/180)*s*rr)+'px'; knob.style.top=(rr+Math.sin(h*Math.PI/180)*s*rr)+'px';
    knob.style.background=hex; prev.style.setProperty('--c',hex);
    if(document.activeElement!==hexIn) hexIn.value=hex;
    val.style.setProperty('--cv',rgb2hex(hsv2rgb(h,s,1))); val.value=Math.round(v*100);
    cv.style.filter=`brightness(${.25+v*.75})`;
    $$('.cp-grid button',el).forEach(b=>b.classList.toggle('on',b.dataset.c===hex));
    if(fire) onChange(hex);
  };
  const set=(hex,fire)=>{[h,s,v]=rgb2hsv(hex2rgb(hex));show(fire);};
  const drawRecent=()=>{recent.innerHTML=(S.recent||[]).map(c=>`<button data-c="${c}" style="--c:${c}"></button>`).join('')||'<span class="hint">—</span>';};
  const pick=e=>{const r=cv.getBoundingClientRect();const dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2;
    h=(Math.atan2(dy,dx)*180/Math.PI+360)%360; s=Math.min(1,Math.hypot(dx,dy)/(r.width/2)); if(v<.08)v=1; show(true);};
  const wheel=$('.cwheel',el);
  wheel.addEventListener('pointerdown',e=>{wheel.setPointerCapture(e.pointerId);pick(e);const mv=ev=>pick(ev);const up=()=>{wheel.removeEventListener('pointermove',mv);wheel.removeEventListener('pointerup',up);};wheel.addEventListener('pointermove',mv);wheel.addEventListener('pointerup',up);});
  val.addEventListener('input',()=>{v=val.value/100;show(true);});
  el.addEventListener('click',e=>{const b=e.target.closest('.cp-grid button');if(b)set(b.dataset.c,true);});
  hexIn.addEventListener('input',()=>{let t=hexIn.value.trim();if(!t.startsWith('#'))t='#'+t;if(isHex(t))set(t,true);});
  drawRecent(); set(initial||'#000000',false);
  return {set:(c)=>set(c,false),refresh:drawRecent};
}
function pushRecent(c){ S.recent=[c,...(S.recent||[]).filter(x=>x!==c)].slice(0,10); save(); }
async function pickColorModal(title,initial){
  let cur=initial;
  return modal({title,iconName:'palette',wide:true,body:'<div id="cpHost"></div>',
    actions:[{label:'إلغاء',val:null,cls:'ghost'},{label:'اختيار',val:()=>cur,cls:'primary'}],
    onOpen:ov=>colorPicker($('#cpHost',ov),initial,c=>cur=c)});
}

/* ---------------- theme ---------------- */
const THEMES={
  harthia:{n:'الحارثية',pri:'#132557',acc:'#f0703e'},
  ocean:{n:'سماوي',pri:'#0c3b5e',acc:'#0ea5e9'},
  emerald:{n:'زمردي',pri:'#064e3b',acc:'#10b981'},
  royal:{n:'بنفسجي',pri:'#3b0764',acc:'#a855f7'},
  ruby:{n:'ياقوتي',pri:'#4c0519',acc:'#e11d48'},
  graphite:{n:'رمادي وذهبي',pri:'#1f2937',acc:'#f59e0b'}
};
const ACCENTS=['#f0703e','#0ea5e9','#10b981','#a855f7','#e11d48','#f59e0b','#2563eb','#14b8a6'];
function effectiveMode(){ if(S.mode!=='auto') return S.mode; const h=new Date().getHours(); return (h>=6&&h<18)?'light':'dark'; }
function applyTheme(){
  const th=S.theme==='custom'?{pri:S.customPri,acc:S.acc}:(THEMES[S.theme]||THEMES.harthia), r=document.documentElement;
  r.dataset.theme=effectiveMode();
  r.style.setProperty('--pri',th.pri);
  r.style.setProperty('--pri-2',`color-mix(in srgb,${th.pri} 78%,#fff)`);
  r.style.setProperty('--acc',S.acc||th.acc);
  store.set('themeVars',{mode:r.dataset.theme,pri:th.pri,acc:S.acc||th.acc});
  const m=document.querySelector('meta[name=theme-color]'); if(m) m.content=th.pri;
  window.applySystemPrefs&&applySystemPrefs();
}

/* ---------------- navigation ---------------- */
const TITLES={home:'',media:'مشغل الوسائط',term:'الطرفية',cast:'العرض اللاسلكي',apps:'التطبيقات',board:'السبورة',pdf:'قارئ PDF',files:'مستكشف الملفات',office:'المستندات',browser:'Chromium',store:'متجر التطبيقات',timer:'المؤقت',attend:'الحضور والغياب',settings:'الإعدادات',gen:''};
let current='home';
const onShow={}, onHide={};
function go(id,arg){
  if(!(id in TITLES)) return;
  closeQP(); window.Board&&Board.closePop&&Board.closePop();
  if(current!==id){ onHide[current]&&onHide[current](); }
  if(current==='home'&&id!=='home') setDrag(false);
  $$('.screen').forEach(s=>s.classList.toggle('on',s.id===id));
  current=id;
  $('#os').classList.toggle('immersive',$('#'+id).hasAttribute('data-immersive'));
  $('#tbHome').hidden=id==='home'; $('#tbApps').hidden=id==='home'||id==='apps'; $('#tbMark').hidden=id!=='home';
  $('#tbTitle').hidden=id==='home'; $('#tbTitle').textContent=TITLES[id];
  onShow[id]&&onShow[id](arg);
}
function setTitle(t){ $('#tbTitle').textContent=t; }
document.addEventListener('click',e=>{
  const g=e.target.closest('[data-go]'); if(g){ go(g.dataset.go,g.dataset.arg||g.dataset.sec); return; }
  const q=e.target.closest('[data-qp]'); if(q){ toggleQP(); return; }
  const t=e.target.closest('[data-toast]'); if(t) toast(t.dataset.toast);
});

/* ---------------- brightness overlay ---------------- */
const dim=document.createElement('div');
dim.style.cssText='position:fixed;inset:0;background:#000;pointer-events:none;z-index:140;opacity:0';
document.body.appendChild(dim);
function applyBright(){dim.style.opacity=((100-S.bright)/100*.65).toFixed(3);}

/* ---------------- fullscreen ---------------- */
function toggleFullscreen(){
  try{ if(document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen({navigationUI:'hide'}).catch(()=>toast('المتصفح منع ملء الشاشة',false)); }catch(e){}
}
document.addEventListener('fullscreenchange',()=>{ const f=!!document.fullscreenElement;
  for(const id of ['dFull','pFull']){const b=$('#'+id); if(!b) continue; b.classList.toggle('on',f); const s=b.querySelector('svg'); s.innerHTML=ICONS[f?'exitFull':'fit']; const l=b.querySelector('.lb'); if(l) l.textContent=f?'خروج من ملء الشاشة':'ملء الشاشة';}
  $('#pdf').classList.toggle('full',f&&current==='pdf');
});
