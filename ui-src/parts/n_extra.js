
/* =====================================================================
   EXTRA SYSTEM SETTINGS: image gallery, display, language/time,
   accessibility, security (PIN), power, backup
   ===================================================================== */
const Gallery={
  items:store.get('gallery',[]),
  save(){ if(!store.set('gallery',this.items)){ toast('مساحة الصور ممتلئة — احذف صورة قديمة',false); return false; } return true; },
  async addFiles(files,useAs){
    let last=null;
    for(const f of files){
      if(!/^image\//.test(f.type)){ toast('الملف '+f.name+' مو صورة',false); continue; }
      try{
        const {url}=await shrinkImage(await readAsDataURL(f),1600,'image/jpeg',.8);
        const it={id:uid(),src:url,name:f.name,colors:extractColors(await loadImg(url))};
        this.items.unshift(it);
        if(this.items.length>8){ this.items.pop(); toast('الحد الأقصى ٨ صور — انحذفت أقدم صورة'); }
        if(!this.save()){ this.items.shift(); continue; }
        last=it;
      }catch(e){ toast('تعذر قراءة '+f.name,false); }
    }
    if(last&&useAs) this.use(last.id,useAs);
    else if(last) toast('تمت إضافة الصور');
    if(current==='settings') Extra.renderSec('gallery');
    return last;
  },
  use(id,as){
    const it=this.items.find(x=>x.id===id); if(!it) return;
    if(as==='wall'){ S.wallId=id; S.wall='img'; if(S.autoColors) this.applyColors(it); toast('تم وضع الصورة خلفية للشاشة الرئيسية'); }
    if(as==='lock'){ S.lockId=id; S.lockMode='img'; toast('تم وضع الصورة لشاشة القفل'); }
    if(as==='app'){ S.appBgId=id; toast('تم وضع الصورة خلفية للنوافذ'); }
    if(as==='board'){ Board.setBg({type:'image',img:it.src,fit:'cover'}); toast('تم وضع الصورة خلفية للسبورة'); }
    if(as==='colors'){ this.applyColors(it); toast('تم تلوين الواجهة من الصورة'); }
    save(); applyWalls(); applySystemPrefs(); syncSettingsUI(); if(current==='settings') Extra.renderSec('gallery');
  },
  applyColors(it){ if(!it.colors) return; S.theme='custom'; S.customPri=it.colors.pri; S.acc=it.colors.acc; applyTheme(); },
  remove(id){
    this.items=this.items.filter(x=>x.id!==id); this.save();
    if(S.wallId===id){ S.wallId=null; if(S.wall==='img'&&!S.wallImg) S.wall='navy'; }
    if(S.lockId===id){ S.lockId=null; S.lockMode='same'; }
    if(S.appBgId===id) S.appBgId=null;
    save(); applyWalls(); applySystemPrefs(); Extra.renderSec('gallery');
  }
};
function galSrc(id){ const it=id&&Gallery.items.find(x=>x.id===id); return it?it.src:null; }
function extractColors(im){
  const c=document.createElement('canvas'); c.width=c.height=48; const x=c.getContext('2d'); x.drawImage(im,0,0,48,48);
  const d=x.getImageData(0,0,48,48).data; let best=null,bs=-1; const bins={};
  for(let i=0;i<d.length;i+=4){ const [h,s,v]=rgb2hsv([d[i],d[i+1],d[i+2]]); const score=s*v*(v>.3?1:.2);
    const key=Math.round(h/20); bins[key]=(bins[key]||0)+score; if(score>bs){bs=score;best=[h,s,v];} }
  let hue=best?best[0]:20; const top=Object.entries(bins).sort((a,b)=>b[1]-a[1])[0]; if(top) hue=+top[0]*20;
  const sat=best?Math.max(.55,best[1]):.7;
  return {acc:rgb2hex(hsv2rgb(hue,Math.min(.85,sat),.9)),pri:rgb2hex(hsv2rgb(hue,.65,.3))};
}
function pinPad(title,verify=true){
  return new Promise(resolve=>{
    let val='';
    modal({title,iconName:'lock',body:`<div class="pin-dots">${'<i></i>'.repeat(4)}</div><div class="pin-pad">${[1,2,3,4,5,6,7,8,9,'x',0,'⌫'].map(k=>`<button data-k="${k}">${k==='x'?icon('x'):k}</button>`).join('')}</div>`,actions:[],
      onOpen:(ov,done)=>{
        const dots=$$('.pin-dots i',ov);
        const show=()=>dots.forEach((d,i)=>d.classList.toggle('on',i<val.length));
        const press=k=>{
          if(k==='x'){ done(null); resolve(verify?false:null); return; }
          if(k==='⌫'){ val=val.slice(0,-1); show(); return; }
          if(val.length<4){ val+=k; show(); }
          if(val.length===4) setTimeout(()=>{
            if(!verify){ done(null); resolve(val); return; }
            if(val===S.pin){ done(null); resolve(true); }
            else { const m=$('.modal',ov); m.classList.remove('shake'); void m.offsetWidth; m.classList.add('shake'); val=''; show(); }
          },120);
        };
        ov.addEventListener('click',e=>{ const b=e.target.closest('[data-k]'); if(b) press(b.dataset.k); });
        const kd=e=>{ if(!document.body.contains(ov)){ removeEventListener('keydown',kd); return; } if(/^\d$/.test(e.key)) press(e.key); if(e.key==='Backspace') press('⌫'); };
        addEventListener('keydown',kd);
      }});
  });
}
let nightEl=null;
function applySystemPrefs(){
  const r=document.documentElement;
  r.style.setProperty('--uz',S.uiScale/100); r.style.setProperty('--ds',S.dockScale/100);
  r.classList.toggle('nolabels',!S.dockLabels); r.classList.toggle('hc',S.contrast); r.classList.toggle('rm',S.reduceMotion);
  r.classList.toggle('bigcur',S.bigCursor&&!S.hideCursor); r.classList.toggle('nocur',S.hideCursor); r.classList.toggle('bold',S.boldText);
  r.style.setProperty('--wdim',S.wallDim/100); r.style.setProperty('--wblur',S.wallBlur+'px');
  const ab=galSrc(S.appBgId); r.style.setProperty('--appbg',ab?`url("${ab}")`:'none'); r.style.setProperty('--appbgop',S.appBgOp);
  if(!nightEl){ nightEl=document.createElement('div'); nightEl.id='nightL'; document.body.appendChild(nightEl); }
  const h=tzNow().getHours(), nightOn=S.nightLight||(S.nightAuto&&(h>=18||h<6));
  nightEl.style.opacity=nightOn?(S.nightLevel/100*.55).toFixed(2):0;
}
const TZS=[['Asia/Baghdad','بغداد (UTC+3)'],['Asia/Riyadh','الرياض (UTC+3)'],['Asia/Dubai','دبي (UTC+4)'],['Asia/Tehran','طهران (UTC+3:30)'],['Africa/Cairo','القاهرة'],['Europe/Istanbul','إسطنبول (UTC+3)'],['Europe/London','لندن'],['UTC','UTC']];
const APP_START=[['home','الشاشة الرئيسية'],['board','السبورة'],['pdf','قارئ PDF'],['apps','التطبيقات'],['files','مستكشف الملفات']];
const sw=(key,label,hint='')=>`<div class="row"><label>${label}${hint?`<span class="hint">${hint}</span>`:''}</label><label class="sw"><input type="checkbox" data-xs="${key}" ${S[key]?'checked':''}><span></span></label></div>`;
const rg=(key,label,min,max,step=1,suffix='',hint='')=>`<div class="row"><label>${label}${hint?`<span class="hint">${hint}</span>`:''}</label><input type="range" data-xr="${key}" min="${min}" max="${max}" step="${step}" value="${S[key]}"><b style="min-width:60px;text-align:center" data-xv="${key}">${nf(S[key])}${suffix}</b></div>`;
const sel=(key,label,opts,hint='')=>`<div class="row"><label>${label}${hint?`<span class="hint">${hint}</span>`:''}</label><select class="field" data-xsel="${key}">${opts.map(([v,n])=>`<option value="${v}" ${String(S[key])===String(v)?'selected':''}>${n}</option>`).join('')}</select></div>`;
const Extra={
  suffix:{uiScale:'٪',dockScale:'٪',nightLevel:'٪',wallDim:'٪',wallBlur:'px',appBgOp:''},
  secs:{
    gallery(){
      const tags=it=>[S.wall==='img'&&S.wallId===it.id?'الرئيسية':'',S.lockMode==='img'&&S.lockId===it.id?'القفل':'',S.appBgId===it.id?'النوافذ':''].filter(Boolean).map(t=>`<span>${t}</span>`).join('');
      return `<h1 class="h1">صور الواجهة</h1><p class="sub">ارفع صورك وغيّر بيها شكل النظام: خلفية الشاشة الرئيسية، شاشة القفل، خلفية النوافذ، والسبورة — وحتى ألوان الواجهة.</p>
      <div class="card"><label class="drop" id="galDrop">${icon('upload')}<b>اضغط لرفع صور أو اسحبها هنا</b><span class="hint">JPG أو PNG — لحد ٨ صور، وتنضغط تلقائياً حتى يبقى النظام سريع</span><input type="file" id="galFile" accept="image/*" multiple hidden></label></div>
      <div class="card"><h3>${icon('image')}صوري (${nf(Gallery.items.length)})</h3>
        ${Gallery.items.length?`<div class="gal-grid">${Gallery.items.map(it=>`<div class="gal"><div class="ph" style="background-image:url('${it.src}')"><div class="tags">${tags(it)}</div></div>
          <div class="acts"><button class="btn" data-g="wall" data-id="${it.id}">${icon('home')}الرئيسية</button><button class="btn" data-g="lock" data-id="${it.id}">${icon('lock')}شاشة القفل</button>
          <button class="btn" data-g="app" data-id="${it.id}">${icon('apps')}خلفية النوافذ</button><button class="btn" data-g="board" data-id="${it.id}">${icon('board')}السبورة</button>
          <button class="btn" data-g="colors" data-id="${it.id}"><span class="swatch-row"><i style="background:${it.colors?.pri}"></i><i style="background:${it.colors?.acc}"></i></span>ألوانها</button><button class="btn danger" data-g="del" data-id="${it.id}">${icon('trash')}حذف</button></div></div>`).join('')}</div>`
          :`<div class="empty">${icon('image')}<b>ما رفعت صور بعد</b></div>`}</div>
      <div class="card"><h3>${icon('palette')}خيارات الخلفية</h3>
        ${sw('autoColors','تلوين الواجهة تلقائياً من صورة الخلفية','يختار لون الأزرار والشريط من ألوان الصورة')}
        ${rg('wallDim','تعتيم الخلفية',0,80,5,'٪','حتى يبقى الشعار والساعة واضحين')}
        ${rg('wallBlur','تغبيش الخلفية',0,20,1,'px')}
        ${sw('slideshow','تبديل الخلفية تلقائياً','يتنقل بين صورك')}
        ${sel('slideMin','كل',[['1','دقيقة'],['5','٥ دقائق'],['10','١٠ دقائق'],['30','٣٠ دقيقة'],['60','ساعة']])}
        ${sel('lockMode','شاشة القفل',[['same','نفس خلفية الرئيسية'],['img','صورة خاصة']])}
        ${rg('appBgOp','وضوح صورة خلفية النوافذ',0.05,0.6,0.05,'')}
        <div class="row"><span class="lbl">إزالة الصور</span><button class="btn ghost" data-g="clearWall">رجوع للخلفية الملونة</button><button class="btn ghost" data-g="clearApp">إزالة خلفية النوافذ</button></div>
      </div>`;
    },
    display(){
      return `<h1 class="h1">الشاشة والعرض</h1><p class="sub">حجم العناصر، شريط التطبيقات، والإضاءة الليلية.</p>
      <div class="card"><h3>${icon('monitor')}الحجم والتخطيط</h3>
        ${rg('uiScale','حجم الواجهة',80,140,5,'٪','يكبّر النوافذ والأزرار — مفيد للشاشات الكبيرة')}
        ${rg('dockScale','حجم أيقونات الشاشة الرئيسية',70,140,5,'٪')}
        ${sw('dockLabels','إظهار أسماء الأيقونات')}
        ${sel('orient','اتجاه الشاشة',[['landscape','أفقي'],['portrait','عمودي'],['landscape-flip','أفقي مقلوب']],'يطبَّق على الشاشة الحقيقية')}
        ${sel('res','الدقة',[['auto','تلقائي (موصى به)'],['4k','3840 × 2160'],['1080','1920 × 1080'],['720','1280 × 720']])}
      </div>
      <div class="card"><h3>${icon('moon')}الإضاءة الليلية</h3>
        ${sw('nightLight','تفعيل الإضاءة الليلية','تقلل الضوء الأزرق وتريح العين')}
        ${sw('nightAuto','تشغيل تلقائي من ٦ المساء لـ ٦ الصبح')}
        ${rg('nightLevel','الدرجة',10,100,5,'٪')}
      </div>
      <div class="card"><h3>${icon('move')}اللمس</h3>
        <div class="row"><span class="lbl">معايرة شاشة اللمس<span class="hint">إذا اللمس ما يطابق مكان الإصبع</span></span><button class="btn" data-x="calib">${icon('move')}بدء المعايرة</button></div>
      </div>`;
    },
    time(){
      return `<h1 class="h1">اللغة والوقت</h1><p class="sub">لغة النظام، المنطقة الزمنية، وشكل التاريخ والأرقام.</p>
      <div class="card"><h3>${icon('globe')}اللغة</h3>
        ${sel('lang','لغة الواجهة',[['ar','العربية'],['en','English'],['ku','کوردی (قريباً)']])}
        ${sw('ar','الأرقام العربية (١٢٣)')}
        <div class="row"><span class="lbl">لغات الكيبورد<span class="hint">تتبدل بزر 🌐 أو من الشريط فوق الكيبورد — نفس اللغات تنضاف لكيبورد برامج النظام</span></span><div class="chips">${Object.entries(OSK_LANGS).map(([l,L])=>`<button class="chip${(S.kbdLangs||[]).includes(l)?' on':''}" data-kl="${l}">${L.n}</button>`).join('')}</div></div>
        <div class="row"><label>جرّب الكيبورد</label><input class="field" type="text" placeholder="اكتب هنا…"></div>
      </div>
      <div class="card"><h3>${icon('timer')}التاريخ والوقت</h3>
        <div class="row"><span class="lbl">الوقت الحالي</span><b style="font-size:20px" id="xNow">${timeParts().t} ${timeParts().ap} — ${dateStr()}</b></div>
        ${sw('autoTime','ضبط الوقت تلقائياً من الإنترنت')}
        ${sel('tz','المنطقة الزمنية',TZS)}
        ${sw('h24','نظام ٢٤ ساعة')}
        ${sel('dateFmt','شكل التاريخ',[['long','الثلاثاء ١٥ أيلول ٢٠٢٦'],['short','الثلاثاء ١٥/٩/٢٠٢٦']])}
        ${S.autoTime?'':`<div class="row"><span class="lbl">ضبط يدوي</span><input class="field" type="datetime-local" style="min-width:0;flex:none" data-x="manualTime"></div>`}
      </div>`;
    },
    access(){
      return `<h1 class="h1">سهولة الاستخدام</h1><p class="sub">خيارات تسهّل القراءة والاستخدام على الشاشة الكبيرة.</p>
      <div class="card"><h3>${icon('eyedrop')}العرض</h3>
        ${sw('contrast','تباين عالي','حدود وألوان أوضح')}
        ${sw('boldText','خط عريض')}
        ${sw('reduceMotion','تقليل الحركة','إيقاف الحركات والانتقالات')}
      </div>
      <div class="card"><h3>${icon('cursor')}المؤشر والإدخال</h3>
        ${sw('bigCursor','مؤشر ماوس كبير')}
        ${sw('hideCursor','إخفاء المؤشر','مناسب لشاشات اللمس')}
      </div>
      <div class="card"><h3>${icon('grip')}القائمة الجانبية</h3>
        ${sel('sideDir','اتجاه القائمة',[['v','عمودية'],['h','أفقية']])}
        <div class="row"><span class="lbl">مكان القائمة<span class="hint">تكدر تسحبها من زر النقاط لأي مكان بالشاشة</span></span><button class="btn sm" data-x="sideReset">${icon('restart')}رجّعها لمكانها</button></div>
        <p class="hint">السهم الصغير على الجانبين يفتح القائمة بكل الصفحات.</p>
      </div>
      <div class="card"><h3>${icon('keyboard')}كيبورد الشاشة</h3>
        ${sel('oskMode','متى يطلع الكيبورد',[['auto','تلقائياً عند لمس خانة الكتابة'],['always','دائماً (حتى بالماوس)'],['off','مطفأ']])}
        ${sel('oskSize','حجم الكيبورد',[['s','صغير'],['m','متوسط'],['l','كبير']])}
        ${sw('oskPreview','تكبير الحرف عند الضغط')}
        <div class="row"><label>جرّب الكيبورد</label><input class="field" type="text" placeholder="اكتب هنا…"></div>
        ${sw('oskTopBtn','زر الكيبورد بالشريط العلوي (يشغّل ويطفي الكيبورد)')}
        ${sw('oskTermKeys','أزرار Esc و Tab و Ctrl والأسهم (للطرفية والبرامج)')}
        <p class="hint">نفس هذا الكيبورد يطلع بكل مكان: الطرفية، LibreOffice، Chromium وباقي البرامج. بالبرامج يطلع تلقائياً من تلمس خانة كتابة، أو من زر ⌨ بالشريط العلوي.</p>
        ${sw('clickSound','صوت عند الضغط')}
      </div>`;
    },
    security(){
      return `<h1 class="h1">الأمان والقفل</h1><p class="sub">رمز PIN يحمي الجهاز والإعدادات من التغيير.</p>
      <div class="card"><h3>${icon('lock')}رمز القفل (PIN)</h3>
        <div class="row"><span class="lbl">الحالة<span class="hint">${S.pin?'رمز مكوّن من ٤ أرقام مفعّل':'ماكو رمز — أي أحد يكدر يفتح القفل'}</span></span>
          ${S.pin?`<button class="btn" data-x="pinChange">${icon('edit')}تغيير الرمز</button><button class="btn danger" data-x="pinRemove">${icon('trash')}إزالة</button>`:`<button class="btn primary" data-x="pinSet">${icon('lock')}تعيين رمز</button>`}</div>
        ${S.pin?sw('lockOnStart','قفل الشاشة عند التشغيل')+sw('lockSettings','طلب الرمز لفتح الإعدادات','حتى الطلاب ما يغيرون الإعدادات')+sw('lockStore','طلب الرمز لتثبيت أو إزالة البرامج'):'<p class="hint">عيّن رمز حتى تظهر خيارات الحماية.</p>'}
        <div class="row"><span class="lbl">قفل الشاشة الآن</span><button class="btn" data-x="lockNow">${icon('lock')}قفل</button></div>
      </div>
      <div class="card"><h3>${icon('shield')}الخصوصية</h3>
        <div class="row"><span class="lbl">سجل المتصفح والملفات الأخيرة</span><button class="btn" data-x="clearHist">${icon('clean')}مسح</button></div>
        <div class="row"><span class="lbl">إعادة ضبط المصنع<span class="hint">تمسح كل شي وترجع النظام جديد</span></span><button class="btn danger" data-x="factory">${icon('restart')}إعادة الضبط</button></div>
      </div>`;
    },
    power(){
      return `<h1 class="h1">التشغيل والطاقة</h1><p class="sub">شنو يطلع عند التشغيل، ومتى يطفي الجهاز تلقائياً.</p>
      <div class="card"><h3>${icon('power')}عند التشغيل</h3>
        ${sel('startApp','التطبيق اللي يفتح عند التشغيل',APP_START)}
        ${sw('bootSound','صوت الإقلاع')}
      </div>
      <div class="card"><h3>${icon('timer')}الإيقاف التلقائي</h3>
        ${sw('offOn','إطفاء الجهاز تلقائياً بنهاية الدوام','يحفظ السبورة ويطفي، ويطلع تنبيه قبل ٥ دقائق')}
        <div class="row"><label>وقت الإطفاء</label><input class="field" type="time" data-x="offTime" value="${S.offTime}" style="min-width:0;flex:none;direction:ltr"></div>
        ${sel('sleep','قفل الشاشة بعد عدم الاستخدام',[['5','٥ دقائق'],['10','١٠ دقائق'],['30','٣٠ دقيقة'],['0','أبداً']])}
      </div>
      <div class="card"><h3>${icon('restart')}أوامر</h3><div class="btns">
        <button class="btn" data-x="restart">${icon('restart')}إعادة التشغيل</button><button class="btn danger" data-x="off">${icon('power')}إيقاف التشغيل</button></div></div>`;
    },
    backup(){
      return `<h1 class="h1">النسخ الاحتياطي والتحديث</h1><p class="sub">احفظ إعداداتك بملف وانقلها لجهاز ثاني بالمدرسة.</p>
      <div class="card"><h3>${icon('save')}النسخ الاحتياطي</h3>
        <div class="row"><span class="lbl">تصدير الإعدادات<span class="hint">الألوان، الشعار، اسم الصف، الصور، والبرامج المثبتة</span></span><button class="btn primary" data-x="export">${icon('download')}تصدير ملف</button></div>
        <div class="row"><span class="lbl">استيراد إعدادات من ملف</span><button class="btn" data-x="import">${icon('upload')}استيراد</button><input type="file" id="impFile" accept=".json,application/json" hidden></div>
        <div class="row"><span class="lbl">إرجاع الإعدادات للأصل<span class="hint">الملفات والسبورات تبقى</span></span><button class="btn danger" data-x="resetSettings">${icon('restart')}إرجاع</button></div>
      </div>
      <div class="card"><h3>${icon('download')}التحديثات</h3>
        ${sw('autoUpdate','تحديث تلقائي خارج وقت الدوام')}
        <div class="row"><span class="lbl">الإصدار الحالي<span class="hint">Alharthia OS ${OS_VERSION}</span></span><button class="btn" data-x="checkUpd">${icon('restart')}البحث عن تحديثات</button></div>
      </div>`;
    }
  },
  renderSec(sec){
    const el=$(`#setMain .sec[data-sec=${sec}]`); if(!el||!this.secs[sec]) return;
    el.innerHTML=this.secs[sec]();
    paintIcons(el); $$('input[type=range]',el).forEach(setRangeFill);
    const drop=$('#galDrop',el);
    if(drop){ const fi=$('#galFile',el); fi.onchange=e=>{ Gallery.addFiles([...e.target.files]); e.target.value=''; };
      drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('over');}); drop.addEventListener('dragleave',()=>drop.classList.remove('over'));
      drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('over');Gallery.addFiles([...e.dataTransfer.files]);}); }
    const imp=$('#impFile',el); if(imp) imp.onchange=e=>{ const f=e.target.files[0]; e.target.value=''; if(f) this.importFile(f); };
  },
  after(key){
    if(['ar','h24','dateFmt','tz'].includes(key)){ tick(); Board.changed(); Timer.render(); const n=$('#xNow'); if(n) n.textContent=`${timeParts().t} ${timeParts().ap} — ${dateStr()}`; }
    if(['wallDim','wallBlur','appBgOp','lockMode'].includes(key)) applyWalls();
    if(key==='slideshow'||key==='slideMin') this.startSlides();
    if(key==='autoTime') this.renderSec('time');
    if(key==='orient'||key==='res') toast('يطبَّق على الشاشة الحقيقية بعد التأكيد');
    if(key==='lang'){
      if(S.lang==='ku'){ toast('الكردية راح تتوفر بالإصدار القادم',false); S.lang='ar'; this.renderSec('time'); }
      else { save(); Lang.apply(); if(S.lang==='ar') return; this.renderSec('time'); toast('تم تبديل لغة الواجهة'); }
    }
    if(key==='oskSize'&&!Keyboard.el.hidden) Keyboard.show();
    if(key==='sideDir'&&Side.open) Side.show(Side.side);
    if(/^osk|^kbd/.test(key)){ Keyboard.syncBtn(); if(key==='oskMode'&&S.oskMode==='off') Keyboard.hide(); if(window.Native&&Native.on) Native.pushKbd(); }
    applySystemPrefs(); layoutAll();
  },
  init(){
    const m=$('#setMain');
    m.addEventListener('change',e=>{ const t=e.target;
      if(t.dataset.xs){ S[t.dataset.xs]=t.checked; save(); this.after(t.dataset.xs); }
      if(t.dataset.xsel){ const k=t.dataset.xsel; S[k]=t.value; save(); this.after(k); }
      if(t.dataset.x==='offTime'){ S.offTime=t.value; save('تم ضبط وقت الإطفاء'); }
      if(t.dataset.x==='manualTime') toast('تم ضبط الوقت يدوياً');
    });
    m.addEventListener('input',e=>{ const t=e.target; if(!t.dataset.xr) return; const k=t.dataset.xr; S[k]=+t.value; setRangeFill(t);
      const v=$(`[data-xv=${k}]`); if(v) v.textContent=nf(S[k])+(this.suffix[k]??''); save(); this.after(k); });
    m.addEventListener('click',async e=>{
      const kl=e.target.closest('[data-kl]');
      if(kl){ const l=kl.dataset.kl; let L=S.kbdLangs||[]; L=L.includes(l)?L.filter(x=>x!==l):[...L,l]; if(!L.length){ toast('لازم تبقى لغة وحدة على الأقل',false); return; } S.kbdLangs=Object.keys(OSK_LANGS).filter(x=>L.includes(x)); if(!L.includes(Keyboard.lang)) Keyboard.lang=S.kbdLangs[0]; save(); kl.classList.toggle('on'); if(window.Native&&Native.on) Native.pushKbd(); return; }
      const g=e.target.closest('[data-g]');
      if(g){ const a=g.dataset.g, id=g.dataset.id;
        if(a==='del'){ if(await confirmBox('حذف الصورة','تريد تحذف هاي الصورة؟','حذف',true,'trash')) Gallery.remove(id); }
        else if(a==='clearWall'){ S.wall='navy'; S.wallId=null; S.wallImg=null; if(S.theme==='custom'){ S.theme='harthia'; S.acc=THEMES.harthia.acc; applyTheme(); } save(); applyWalls(); syncSettingsUI(); this.renderSec('gallery'); }
        else if(a==='clearApp'){ S.appBgId=null; save(); applySystemPrefs(); this.renderSec('gallery'); }
        else Gallery.use(id,a);
        return; }
      const b=e.target.closest('[data-x]'); if(!b||b.tagName==='INPUT') return; const a=b.dataset.x;
      if(a==='pinSet'||a==='pinChange'){
        if(a==='pinChange'&&!await pinPad('أدخل الرمز الحالي')) return;
        const p1=await pinPad('اختر رمز جديد (٤ أرقام)',false); if(!p1) return;
        const p2=await pinPad('أعد إدخال الرمز',false); if(p2!==p1){ toast('الرمزين مو متطابقين',false); return; }
        S.pin=p1; save('تم تعيين الرمز'); this.renderSec('security'); }
      if(a==='pinRemove'){ if(!await pinPad('أدخل الرمز للإزالة')) return; S.pin=null; S.lockSettings=S.lockStore=S.lockOnStart=false; save('تمت إزالة الرمز'); this.renderSec('security'); }
      if(a==='lockNow') lockNow();
      if(a==='clearHist') toast('تم مسح السجل');
      if(a==='factory'){ if(await confirmBox('إعادة ضبط المصنع','راح تنحذف كل الإعدادات والسبورات والملفات والصور والبرامج المثبتة.','إعادة الضبط',true,'restart')){ try{ Object.keys(localStorage).filter(k=>k.startsWith('alharthia.')).forEach(k=>localStorage.removeItem(k)); }catch(_){} sysMessage('جاري إعادة ضبط النظام…',null,()=>location.reload()); } }
      if(a==='restart'){ Board.persist(); sysMessage('Restarting…','hold'); }
      if(a==='off'){ Board.persist(); sysMessage('Shutting down…','hold'); }
      if(a==='calib') this.calibrate();
      if(a==='export') this.exportFile();
      if(a==='import') $('#impFile').click();
      if(a==='sideReset'){ S.sidePos=null; save('تم إرجاع القائمة لمكانها'); if(Side.open) Side.show(Side.side); }
      if(a==='resetSettings'){ if(await confirmBox('إرجاع الإعدادات','كل الإعدادات ترجع للأصل (الملفات والسبورات تبقى).','إرجاع',true,'restart')){ const keep={installed:S.installed}; Object.keys(S).forEach(k=>delete S[k]); Object.assign(S,structuredClone(DEF),keep); store.set('settings',S); location.reload(); } }
      if(a==='checkUpd'){ await Files.progress('جاري البحث عن تحديثات…',200*MB); toast('النظام محدَّث لآخر إصدار'); }
    });
    // settings / store protection
    const baseGo=go;
    let unlocked=false;
    go=async function(id,arg){
      if(id==='settings'&&current!=='settings'&&S.pin&&S.lockSettings&&!unlocked){ if(!await pinPad('أدخل الرمز لفتح الإعدادات')) return; unlocked=true; setTimeout(()=>unlocked=false,5*60e3); }
      baseGo(id,arg);
    };
    const inst=Store.install.bind(Store), rm=Store.remove.bind(Store);
    Store.install=async id=>{ if(S.pin&&S.lockStore&&!await pinPad('أدخل الرمز للتثبيت')) return; inst(id); };
    Store.remove=async id=>{ if(S.pin&&S.lockStore&&!await pinPad('أدخل الرمز للإزالة')) return; await rm(id); };
    // click sound
    document.addEventListener('pointerdown',e=>{ if(S.clickSound&&e.target.closest('button')) tickSound(); },true);
    // auto power-off + night light schedule
    let warned='', fired='';
    setInterval(()=>{
      applySystemPrefs();
      if(!S.offOn) return; const n=tzNow(), day=n.toDateString(), hm=pad(n.getHours())+':'+pad(n.getMinutes());
      const [h,mn]=S.offTime.split(':').map(Number); const w=new Date(n); w.setHours(h,mn-5,0,0); const whm=pad(w.getHours())+':'+pad(w.getMinutes());
      if(hm===whm&&warned!==day){ warned=day; toast('تنبيه: الجهاز راح يطفي بعد ٥ دقائق — احفظ عملك',false); beep(2,700); }
      if(hm===S.offTime&&fired!==day){ fired=day; Board.persist(); sysMessage('Shutting down…','hold'); }
    },20e3);
    this.startSlides(); applySystemPrefs();
  },
  startSlides(){
    clearInterval(this.slT); if(!S.slideshow) return;
    this.slT=setInterval(()=>{ const ids=Gallery.items.map(i=>i.id); if(ids.length<2) return; const i=ids.indexOf(S.wallId); S.wallId=ids[(i+1)%ids.length]; S.wall='img';
      const it=Gallery.items.find(x=>x.id===S.wallId); if(S.autoColors) Gallery.applyColors(it); save(); applyWalls(); },(+S.slideMin||10)*60e3);
  },
  exportFile(){
    const data={app:'Alharthia OS',v:1,date:new Date().toISOString(),settings:S,gallery:Gallery.items};
    const url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));
    downloadURL(url,`alharthia-settings-${S.cls.replace(/[^\p{L}\p{N}]+/gu,'-')}.json`); toast('تم تصدير الإعدادات');
  },
  async importFile(f){
    try{ const d=JSON.parse(await f.text()); if(d.app!=='Alharthia OS') throw 0;
      if(!await confirmBox('استيراد الإعدادات','راح تتبدل الإعدادات الحالية بإعدادات الملف.','استيراد',false,'upload')) return;
      Object.assign(S,d.settings||{}); store.set('settings',S); if(Array.isArray(d.gallery)){ Gallery.items=d.gallery; Gallery.save(); }
      sysMessage('جاري تطبيق الإعدادات…',null,()=>location.reload());
    }catch(e){ toast('الملف مو ملف إعدادات صالح',false); }
  },
  calibrate(){
    const pts=[[.1,.1],[.9,.1],[.9,.9],[.1,.9],[.5,.5]]; let i=0;
    const ov=document.createElement('div'); ov.style.cssText='position:fixed;inset:0;z-index:150;background:#0b1224;color:#fff;touch-action:none';
    ov.innerHTML='<div style="position:absolute;top:40%;width:100%;text-align:center;font-size:22px;font-weight:600">المس مركز كل هدف بالترتيب</div><div id="calT" style="position:absolute;width:60px;height:60px;margin:-30px 0 0 -30px;border-radius:50%;border:3px solid #f0703e;display:grid;place-items:center"><i style="width:8px;height:8px;background:#f0703e;border-radius:50%"></i></div>';
    document.body.appendChild(ov); const t=$('#calT',ov);
    const place=()=>{ t.style.left=pts[i][0]*100+'%'; t.style.top=pts[i][1]*100+'%'; };
    place();
    ov.addEventListener('pointerdown',()=>{ i++; beep(1,880); if(i>=pts.length){ ov.remove(); toast('تمت معايرة شاشة اللمس'); } else place(); });
  }
};
function tickSound(){ try{ const ac=tickSound.ac||(tickSound.ac=new (window.AudioContext||window.webkitAudioContext)()); const o=ac.createOscillator(),g=ac.createGain(); o.frequency.value=1500; o.connect(g); g.connect(ac.destination); const t=ac.currentTime; g.gain.setValueAtTime(.08*(S.vol/100),t); g.gain.exponentialRampToValueAtTime(.0001,t+.04); o.start(t); o.stop(t+.05); }catch(e){} }
