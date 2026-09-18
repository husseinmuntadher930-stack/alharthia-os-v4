
/* =====================================================================
   APPS LAUNCHER + APP STORE
   ===================================================================== */
const STORE_CATS=[['all','الكل'],['edu','تعليم'],['code','برمجة'],['sci','علوم'],['math','رياضيات'],['office','مكتب'],['art','رسم وتصميم'],['media','وسائط'],['tools','أدوات']];
const STORE_APPS=[
  {id:'gcompris',n:'GCompris',cat:'edu',g:'G',c:'#f59e0b',size:120*MB,v:'4.1',src:'Debian',d:'أكثر من ١٠٠ نشاط تعليمي للأطفال: حساب، قراءة، علوم، ألغاز وألعاب ذكاء.',feat:1},
  {id:'scratch',n:'Scratch 3',cat:'code',g:'S',c:'#f97316',size:210*MB,v:'3.0',src:'Raspberry Pi',d:'تعلّم البرمجة بالسحب والإفلات وصمّم ألعاب وقصص تفاعلية.'},
  {id:'thonny',n:'Thonny',cat:'code',g:'Py',c:'#2563eb',size:16*MB,v:'4.1',src:'Raspberry Pi',d:'محرر Python بسيط للمبتدئين مع منقّح خطوة بخطوة.'},
  {id:'stellarium',n:'Stellarium',cat:'sci',g:'★',c:'#1e3a8a',size:260*MB,v:'24.4',src:'Debian',d:'قبة سماوية واقعية تعرض النجوم والكواكب بالوقت الحقيقي.'},
  {id:'kalzium',n:'Kalzium',cat:'sci',g:'Kz',c:'#0e9f8e',size:42*MB,v:'24.12',src:'Debian',d:'الجدول الدوري التفاعلي مع خصائص العناصر ومحاكاة.'},
  {id:'step',n:'Step',cat:'sci',g:'St',c:'#0891b2',size:22*MB,v:'24.12',src:'Debian',d:'محاكاة فيزيائية تفاعلية للحركة والقوى والنوابض.'},
  {id:'geogebra',web:1,n:'GeoGebra',cat:'math',g:'∠',c:'#6d5bd0',size:4*MB,v:'ويب',src:'تطبيق ويب',d:'هندسة وجبر ورسوم بيانية تفاعلية — يشتغل داخل Chromium.'},
  {id:'kalgebra',n:'KAlgebra',cat:'math',g:'ƒ',c:'#4f46e5',size:18*MB,v:'24.12',src:'Debian',d:'آلة حاسبة علمية ترسم الدوال ثنائية وثلاثية الأبعاد.'},
  {id:'labplot',n:'LabPlot',cat:'math',g:'Lp',c:'#0f766e',size:95*MB,v:'2.11',src:'Debian',d:'رسوم بيانية وتحليل بيانات للتجارب والإحصاء.'},
  {id:'onlyoffice',n:'ONLYOFFICE',cat:'office',g:'O',c:'#ea580c',size:720*MB,v:'8.3',src:'Flathub',d:'حزمة مكتبية متوافقة بشكل كبير مع ملفات Word وExcel وPowerPoint.'},
  {id:'kiwix',n:'Kiwix',cat:'edu',g:'K',c:'#334155',size:35*MB,v:'2.3',src:'Debian',d:'ويكيبيديا وكتب تعليمية بدون إنترنت.'},
  {id:'anki',n:'Anki',cat:'edu',g:'A',c:'#0284c7',size:150*MB,v:'24.11',src:'Flathub',d:'بطاقات حفظ ذكية تساعد الطلاب على المراجعة.'},
  {id:'gimp',n:'GIMP',cat:'art',g:'Gi',c:'#78716c',size:260*MB,v:'2.10',src:'Debian',d:'تعديل الصور والتصميم الاحترافي.'},
  {id:'inkscape',n:'Inkscape',cat:'art',g:'In',c:'#111827',size:210*MB,v:'1.2',src:'Debian',d:'رسم متجهي للشعارات والملصقات والمخططات.'},
  {id:'krita',n:'Krita',cat:'art',g:'Kr',c:'#db2777',size:340*MB,v:'5.2',src:'Debian',d:'رسم رقمي بالقلم مع فرش متنوعة.'},
  {id:'tuxpaint',n:'Tux Paint',cat:'art',g:'T',c:'#16a34a',size:55*MB,v:'0.9',src:'Debian',d:'رسم بسيط وممتع للأطفال.'},
  {id:'vlc',n:'VLC',cat:'media',g:'▶',c:'#f97316',size:85*MB,v:'3.0',src:'Debian',d:'مشغل فيديو وصوت يشغّل كل الصيغ.'},
  {id:'audacity',n:'Audacity',cat:'media',g:'Au',c:'#1d4ed8',size:62*MB,v:'3.4',src:'Debian',d:'تسجيل الصوت وتعديله للدروس والبودكاست.'},
  {id:'obs',n:'OBS Studio',cat:'media',g:'◉',c:'#1f2937',size:180*MB,v:'30',src:'Debian',d:'تسجيل الشاشة وبث الدروس.'},
  {id:'luanti',n:'Luanti',cat:'edu',g:'L',c:'#65a30d',size:60*MB,v:'5.10',src:'Debian',d:'عالم مكعبات للبناء والتعلم الجماعي.'},
  {id:'qalc',n:'Qalculate!',cat:'tools',g:'=',c:'#0ea5e9',size:20*MB,v:'5.0',src:'Debian',d:'آلة حاسبة متقدمة مع تحويل الوحدات.'},
  {id:'flameshot',n:'Flameshot',cat:'tools',g:'✂',c:'#dc2626',size:6*MB,v:'12',src:'Debian',d:'لقطة شاشة مع أدوات تعليق سريعة.'},
  {id:'kdeconnect',n:'KDE Connect',cat:'tools',g:'⇄',c:'#475569',size:30*MB,v:'24.12',src:'Debian',d:'ربط الهاتف بالجهاز لنقل الملفات والتحكم عن بعد.'},
];
const APPS_BUILTIN=[
  {id:'board',n:'السبورة',i:'board',c:'#f0703e',go:'board'},
  {id:'pdf',n:'قارئ PDF',i:'pdf',c:'#e0413a',go:'pdf'},
  {id:'chromium',n:'Chromium',sub:'متصفح الإنترنت',i:'globe',c:'#2f6fe4',go:'browser'},
  {id:'files',n:'مستكشف الملفات',i:'folder',c:'#e6a019',go:'files'},
  {id:'attend',n:'الحضور والغياب',sub:'سجل الطلاب اليومي',i:'attend',c:'#0d9488',go:'attend'},
  {id:'word',n:'مستندات Word',sub:'LibreOffice Writer',i:'word',c:'#2f6fe4',office:'word'},
  {id:'ppt',n:'عروض PowerPoint',sub:'LibreOffice Impress',i:'slides',c:'#c2410c',office:'ppt'},
  {id:'excel',n:'جداول Excel',sub:'LibreOffice Calc',i:'table',c:'#16a34a',office:'excel'},
  {id:'store',n:'متجر التطبيقات',i:'store',c:'#7c3aed',go:'store'},
  {id:'cast',n:'العرض اللاسلكي',sub:'اعرض شاشتك أو استقبل شاشة',i:'cast',c:'#0891b2',go:'cast'},
  {id:'media',n:'مشغل الوسائط',sub:'فيديو وصوت MP4 · MP3',i:'video',c:'#db2777',go:'media'},
  {id:'terminal',n:'الطرفية',sub:'Terminal',i:'terminal',c:'#1f2937',go:'term'},
  {id:'chromiumfull',n:'Chromium الكامل',sub:'المتصفح الأصلي',i:'globe',c:'#1e40af',native:'chromium'},
  {id:'timer',n:'المؤقت',i:'timer',c:'#0e9f8e',go:'timer'},
  {id:'settings',n:'الإعدادات',i:'gear',c:'#475a86',go:'settings'},
];
const installing=new Map(); const justInstalled=new Set();
const Apps={
  q:'',
  render(){
    const q=this.q.toLowerCase(), m=a=>!q||(a.n+' '+(a.sub||'')).toLowerCase().includes(q);
    const inst=S.installed.map(id=>STORE_APPS.find(a=>a.id===id)).filter(Boolean);
    $('#appsMain').innerHTML=`<div class="app-head"><h1 class="h1">التطبيقات</h1><span class="grow"></span>
      <label class="search">${icon('search')}<input id="appQ" type="search" placeholder="ابحث عن تطبيق" value="${esc(this.q)}"></label>
      <button class="btn primary" data-go="store">${icon('store')}متجر التطبيقات</button></div>
      <h3 class="sub" style="font-weight:600;margin:6px 0 12px">تطبيقات النظام</h3>
      <div class="apps-grid">${APPS_BUILTIN.filter(m).map(a=>`<button class="appt" data-app="${a.id}"><span class="ai" style="--c:${a.c}">${icon(a.i)}</span><b>${a.n}</b>${a.sub?`<small>${a.sub}</small>`:''}</button>`).join('')}</div>
      <h3 class="sub" style="font-weight:600;margin:26px 0 12px">البرامج المثبتة من المتجر (${nf(inst.length)})</h3>
      ${inst.length?`<div class="apps-grid">${inst.filter(m).map(a=>`<button class="appt" data-sapp="${a.id}">${justInstalled.has(a.id)?'<span class="new">جديد</span>':''}<i class="ai txt" style="--c:${a.c}">${a.g}</i><b>${esc(a.n)}</b><small>${STORE_CATS.find(c=>c[0]===a.cat)[1]}</small></button>`).join('')}</div>`
        :`<div class="card"><div class="empty">${icon('store')}<b>ما مثبت أي برنامج بعد</b><span>البرامج اللي تنزّلها من المتجر راح تطلع هنا</span><button class="btn primary" data-go="store">تصفح المتجر</button></div></div>`}`;
    const inp=$('#appQ'); inp.oninput=()=>{ this.q=inp.value; const pos=inp.selectionStart; this.render(); const n=$('#appQ'); n.focus(); n.setSelectionRange(pos,pos); };
  },
  launch(id){
    const a=APPS_BUILTIN.find(x=>x.id===id);
    if(a){ if(a.office) Office.launch(a.office); else if(a.native){ if(window.Native&&Native.on) Native.launch({id:a.native},a.n); else toast('هذا البرنامج يشتغل على الجهاز الحقيقي فقط',false); } else go(a.go); return; }
    const s=STORE_APPS.find(x=>x.id===id); if(!s) return;
    justInstalled.delete(id);
    if(id==='geogebra'){ go('browser'); toast('GeoGebra يفتح داخل Chromium'); return; }
    go('gen'); setTitle(s.n);
    $('#genBody').innerHTML=`<i class="ai" style="--c:${s.c};font-style:normal">${s.g}</i><h2>${esc(s.n)}</h2><p class="sub" style="max-width:520px">${esc(s.d)}</p>
      <div class="spin"></div><p class="note">${icon('info')}معاينة — في النظام الحقيقي يشتغل البرنامج هنا بنافذة كاملة</p>
      <div class="btns"><button class="btn" data-go="apps">${icon('apps')}رجوع للتطبيقات</button></div>`;
  }
};
document.addEventListener('click',e=>{ const a=e.target.closest('[data-app],[data-sapp]'); if(a&&!e.target.closest('#storeMain')) Apps.launch(a.dataset.app||a.dataset.sapp); });
onShow.apps=()=>Apps.render();

const Store={
  cat:'all', q:'',
  render(){
    const f=STORE_APPS.find(a=>a.feat);
    $('#storeMain').innerHTML=`<div class="app-head"><h1 class="h1">متجر التطبيقات</h1><span class="grow"></span><label class="search">${icon('search')}<input id="stQ" type="search" placeholder="ابحث بالمتجر" value="${esc(this.q)}"></label></div>
      ${!S.wifi?`<div class="card" style="border-color:var(--warn)"><b>${icon('wifiOff','style="display:inline;vertical-align:-3px"')} ماكو اتصال بالإنترنت</b> — شغّل الـ Wi-Fi حتى تكدر تنزّل البرامج.</div>`:''}
      <div class="hero"><i class="ai" style="font-style:normal">${f.g}</i><div class="grow"><div style="opacity:.8;font-size:13px;font-weight:600">تطبيق مميز</div><h2>${f.n}</h2><p>${f.d}</p></div><div id="heroAct">${this.btn(f)}</div></div>
      <div class="chips" style="margin-bottom:16px">${STORE_CATS.map(([k,n])=>`<button class="chip${this.cat===k?' on':''}" data-cat="${k}">${n}</button>`).join('')}</div>
      <div class="store-grid" id="stGrid"></div>
      <p class="note" style="margin-top:18px">${icon('info')}التثبيت الحقيقي يتم عن طريق مستودعات Debian / Raspberry Pi و Flathub، والبرامج كلها تدعم معالج ARM64.</p>`;
    this.grid();
    const inp=$('#stQ'); inp.oninput=()=>{ this.q=inp.value.trim(); this.grid(); };
  },
  list(){ const q=this.q.toLowerCase(); return STORE_APPS.filter(a=>(this.cat==='all'||a.cat===this.cat)&&(!q||(a.n+' '+a.d).toLowerCase().includes(q))); },
  grid(){ const g=$('#stGrid'); if(!g) return; const L=this.list();
    g.innerHTML=L.length?L.map(a=>`<div class="sapp" data-detail="${a.id}"><i class="ai" style="--c:${a.c};font-style:normal">${a.g}</i><div class="inf"><b>${esc(a.n)}</b><div class="d">${esc(a.d)}</div><div class="m">${STORE_CATS.find(c=>c[0]===a.cat)[1]} • ${fmtSize(a.size)}</div></div><div class="act" id="act-${a.id}">${this.btn(a)}</div></div>`).join('')
      :`<div class="empty" style="grid-column:1/-1">${icon('search')}<b>ماكو نتائج</b></div>`; },
  btn(a){
    if(installing.has(a.id)){ const p=installing.get(a.id); return `<div class="prog"><i style="width:${p*100}%"></i></div><div class="prog-l">${p<.7?'جاري التنزيل':'جاري التثبيت'} ${nf(Math.round(p*100))}٪</div>`; }
    if(S.installed.includes(a.id)) return `<button class="btn sm primary" data-open="${a.id}">فتح</button><button class="btn sm ghost" data-rm="${a.id}">إزالة</button>`;
    return `<button class="btn sm primary" data-inst="${a.id}">${icon('download')}تثبيت</button>`;
  },
  refresh(id){ const a=STORE_APPS.find(x=>x.id===id); for(const el of [$('#act-'+id),STORE_APPS.find(x=>x.feat).id===id?$('#heroAct'):null,$('#mdAct-'+id)]) if(el) el.innerHTML=this.btn(a); },
  install(id){
    const a=STORE_APPS.find(x=>x.id===id);
    if(!S.wifi){ toast('لازم تتصل بالإنترنت أولاً',false); return; }
    if(window.Native&&Native.on&&!a.web) return Native.install(id);
    if(a.size>FS.drives.internal.cap-Storage.internalUsed()){ toast('ماكو مساحة كافية',false); return; }
    const dur=clamp(a.size/MB*9,1600,5200), t0=performance.now(); installing.set(id,0); this.refresh(id);
    const tick=()=>{ const p=Math.min(1,(performance.now()-t0)/dur); installing.set(id,p); this.refresh(id);
      if(p<1) setTimeout(tick,120); else { installing.delete(id); S.installed.push(id); justInstalled.add(id); save(); this.refresh(id); toast(`تم تثبيت ${a.n} — تلكاه بقائمة التطبيقات`); window.appsChanged&&appsChanged(); } };
    tick();
  },
  async remove(id){ const a=STORE_APPS.find(x=>x.id===id); if(!await confirmBox('إزالة البرنامج',`تريد تزيل ${a.n}؟ راح تتحرر ${fmtSize(a.size)}.`,'إزالة',true,'trash')) return;
    if(window.Native&&Native.on&&!a.web) return Native.remove(id);
    S.installed=S.installed.filter(x=>x!==id); S.dock=S.dock.filter(x=>x!==id); save(); this.refresh(id); toast('تمت إزالة '+a.n); window.appsChanged&&appsChanged(); },
  detail(id){ const a=STORE_APPS.find(x=>x.id===id);
    modal({title:a.n,body:`<div style="display:flex;gap:16px;align-items:center;margin-bottom:14px"><i class="ai" style="width:84px;height:84px;border-radius:22px;display:grid;place-items:center;font-size:36px;font-weight:700;color:#fff;background:${a.c};font-style:normal">${a.g}</i>
      <div><div class="hint">${STORE_CATS.find(c=>c[0]===a.cat)[1]}</div><div id="mdAct-${a.id}" class="btns" style="margin-top:8px">${this.btn(a)}</div></div></div>
      <p style="color:var(--text)">${esc(a.d)}</p><div class="kv"><div><small>الإصدار</small><b>${a.v}</b></div><div><small>الحجم</small><b>${fmtSize(a.size)}</b></div><div><small>المصدر</small><b>${a.src}</b></div><div><small>المعالج</small><b>ARM64 ✓</b></div></div>`,
      actions:[{label:'إغلاق',val:null,cls:'ghost'}],
      onOpen:(ov,done)=>ov.addEventListener('click',e=>{ const b=e.target.closest('[data-open]'); if(b){ done(null); Apps.launch(b.dataset.open); } })});
  }
};
document.addEventListener('click',e=>{
  if(!e.target.closest('#storeMain')&&!e.target.closest('.modal [id^=mdAct-]')) return;
  const i=e.target.closest('[data-inst]'); if(i){ Store.install(i.dataset.inst); return; }
  const r=e.target.closest('[data-rm]'); if(r){ Store.remove(r.dataset.rm); return; }
  const o=e.target.closest('[data-open]'); if(o&&e.target.closest('#storeMain')){ Apps.launch(o.dataset.open); return; }
  const c=e.target.closest('[data-cat]'); if(c){ Store.cat=c.dataset.cat; Store.render(); return; }
  const d=e.target.closest('[data-detail]'); if(d&&!e.target.closest('.act')) Store.detail(d.dataset.detail);
});
onShow.store=()=>Store.render();
