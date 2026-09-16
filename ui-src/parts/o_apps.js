
/* =====================================================================
   APP MANAGEMENT: remove apps, home-dock pins, settings › apps
   ===================================================================== */
const PROTECTED=new Set(['settings','store','files']);
const appInfo=id=>{ const b=APPS_BUILTIN.find(a=>a.id===id); if(b) return {...b,sys:true}; const s=STORE_APPS.find(a=>a.id===id); return s?{...s,sys:false}:null; };
const appIcon=(a,cls='ai')=>a.sys?`<span class="${cls}" style="--c:${a.c}">${icon(a.i)}</span>`:`<i class="${cls} txt" style="--c:${a.c};font-style:normal">${a.g}</i>`;
function renderDock(){
  const pins=S.dock.map(appInfo).filter(a=>a&&(a.sys||S.installed.includes(a.id)));
  $('#dockIn').innerHTML=pins.map(a=>`<button class="tile" data-app="${a.id}">${a.sys?`<span class="ti" style="--c:${a.c}">${icon(a.i)}</span>`:`<span class="ti gl" style="--c:${a.c}">${a.g}</span>`}<span class="tl">${esc(({files:'الملفات',store:'المتجر',chromium:'Chromium'})[a.id]||a.n.replace(/^(مستندات|عروض|جداول) /,''))}</span></button>`).join('')+
    `<span class="dock-sep"></span><button class="tile" data-go="apps"><span class="ti glass">${icon('apps')}</span><span class="tl">التطبيقات</span></button>`;
  if(current==='home') layoutAll();
}
function appsChanged(){ renderDock(); if(current==='apps') Apps.render(); if(current==='settings'&&!$('#setMain .sec[data-sec=appsset]').hidden) Extra.renderSec('appsset'); }
Apps.editing=false;
Apps.render=function(){
  const q=this.q.toLowerCase(), m=a=>!q||(a.n+' '+(a.sub||'')).toLowerCase().includes(q), ed=this.editing;
  const sys=APPS_BUILTIN.filter(a=>ed||!S.hiddenApps.includes(a.id)).filter(m);
  const inst=S.installed.map(id=>STORE_APPS.find(a=>a.id===id)).filter(Boolean).filter(m);
  $('#appsMain').innerHTML=`<div class="app-head"><h1 class="h1">التطبيقات</h1><span class="grow"></span>
    <label class="search">${icon('search')}<input id="appQ" type="search" placeholder="ابحث عن تطبيق" value="${esc(this.q)}"></label>
    <button class="btn${ed?' primary':''}" data-ae="toggle">${icon(ed?'check':'edit')}${ed?'تم':'تعديل'}</button>
    <button class="btn ghost" data-go="settings" data-sec="appsset">${icon('gear')}إدارة التطبيقات</button>
    <button class="btn primary" data-go="store">${icon('store')}المتجر</button></div>
    ${ed?`<div class="card" style="padding:12px 18px"><span class="note">${icon('info')}اضغط ✕ على البرنامج حتى تحذفه، أو اضغط تطبيق النظام حتى تخفيه أو تظهره. الإعدادات والملفات والمتجر ما تنخفي.</span></div>`:''}
    <h3 class="sub" style="font-weight:600;margin:6px 0 12px">تطبيقات النظام</h3>
    <div class="apps-grid ${ed?'editing':''}">${sys.map(a=>{ const hid=S.hiddenApps.includes(a.id);
      return `<button class="appt${hid?' dim':''}" ${ed?`data-hide="${a.id}"`:`data-app="${a.id}"`}>${ed&&!PROTECTED.has(a.id)?`<span class="hidb">${icon(hid?'plus':'minus')}</span>`:''}<span class="ai" style="--c:${a.c}">${icon(a.i)}</span><b>${a.n}</b>${a.sub?`<small>${a.sub}</small>`:''}</button>`; }).join('')}</div>
    <h3 class="sub" style="font-weight:600;margin:26px 0 12px">البرامج المثبتة من المتجر (${nf(S.installed.length)})</h3>
    ${S.installed.length?`<div class="apps-grid ${ed?'editing':''}">${inst.map(a=>`<button class="appt" ${ed?`data-del="${a.id}"`:`data-sapp="${a.id}"`}>${ed?`<span class="rmb">${icon('x')}</span>`:justInstalled.has(a.id)?'<span class="new">جديد</span>':''}<i class="ai txt" style="--c:${a.c}">${a.g}</i><b>${esc(a.n)}</b><small>${fmtSize(a.size)}</small></button>`).join('')}</div>`
      :`<div class="card"><div class="empty">${icon('store')}<b>ما مثبت أي برنامج بعد</b><span>البرامج اللي تنزّلها من المتجر راح تطلع هنا</span><button class="btn primary" data-go="store">تصفح المتجر</button></div></div>`}`;
  const inp=$('#appQ'); inp.oninput=()=>{ this.q=inp.value; const pos=inp.selectionStart; this.render(); const n=$('#appQ'); n.focus(); n.setSelectionRange(pos,pos); };
};
$('#appsMain').addEventListener('click',async e=>{
  if(e.target.closest('[data-ae=toggle]')){ Apps.editing=!Apps.editing; Apps.render(); return; }
  const d=e.target.closest('[data-del]'); if(d){ await Store.remove(d.dataset.del); return; }
  const h=e.target.closest('[data-hide]'); if(h){ const id=h.dataset.hide; if(PROTECTED.has(id)){ toast('هذا تطبيق أساسي وما ينخفي',false); return; }
    S.hiddenApps=S.hiddenApps.includes(id)?S.hiddenApps.filter(x=>x!==id):[...S.hiddenApps,id]; save(); Apps.render(); }
});
onHide.apps=()=>{ Apps.editing=false; };

Extra.secs.appsset=function(){
  const inst=S.installed.map(id=>STORE_APPS.find(a=>a.id===id)).filter(Boolean);
  const total=inst.reduce((t,a)=>t+a.size,0);
  const pins=S.dock.map(appInfo).filter(a=>a&&(a.sys||S.installed.includes(a.id)));
  const unpinned=[...APPS_BUILTIN.map(a=>a.id),...S.installed].filter(id=>!S.dock.includes(id)).map(appInfo);
  const openers=(list)=>list.map(([v,n])=>[v,n]);
  const dsel=(k,label,opts)=>`<div class="row"><label>${label}</label><select class="field" data-def="${k}">${opts.map(([v,n])=>`<option value="${v}" ${S.defaults[k]===v?'selected':''}>${n}</option>`).join('')}</select></div>`;
  const has=id=>S.installed.includes(id);
  return `<h1 class="h1">التطبيقات</h1><p class="sub">إدارة البرامج المثبتة، الشاشة الرئيسية، والتطبيقات الافتراضية.</p>
  <div class="card"><div class="stat-row">
    <div class="stat"><small>تطبيقات النظام</small><b>${nf(APPS_BUILTIN.length)}</b></div>
    <div class="stat"><small>البرامج المثبتة</small><b>${nf(inst.length)}</b></div>
    <div class="stat"><small>مساحة البرامج المثبتة</small><b dir="ltr">${fmtSize(total)}</b></div></div>
    <div class="btns" style="margin-top:14px"><button class="btn primary" data-go="store">${icon('store')}فتح المتجر</button><button class="btn" data-go="apps">${icon('apps')}قائمة التطبيقات</button></div></div>

  <div class="card"><h3>${icon('home')}أيقونات الشاشة الرئيسية (${nf(pins.length)} من ٧)</h3>
    ${pins.map((a,i)=>`<div class="app-row">${appIcon(a)}<div class="nm"><b>${esc(a.n)}</b><small>${a.sys?'تطبيق نظام':'من المتجر'}</small></div>
      <button class="icon-btn" data-pin="up" data-id="${a.id}" ${i?'':'disabled'} title="تقديم">${icon('chevUp')}</button>
      <button class="icon-btn" data-pin="down" data-id="${a.id}" ${i<pins.length-1?'':'disabled'} title="تأخير">${icon('chevDown')}</button>
      <button class="btn sm ghost" data-pin="off" data-id="${a.id}">${icon('x')}إزالة من الرئيسية</button></div>`).join('')||'<p class="hint">ماكو أيقونات — الشاشة الرئيسية بيها بس زر التطبيقات</p>'}
    ${pins.length<7&&unpinned.length?`<div class="row"><span class="lbl">إضافة للرئيسية</span><select class="field" id="pinAdd">${unpinned.map(a=>`<option value="${a.id}">${esc(a.n)}</option>`).join('')}</select><button class="btn primary" data-pin="add">${icon('plus')}إضافة</button></div>`:''}
  </div>

  <div class="card"><h3>${icon('store')}البرامج المثبتة${inst.length?`<span class="end"><button class="btn sm danger" data-apx="removeAll">${icon('trash')}إزالة الكل</button></span>`:''}</h3>
    ${inst.length?inst.map(a=>`<div class="app-row"><i class="ai" style="--c:${a.c}">${a.g}</i><div class="nm"><b>${esc(a.n)}</b><small>${STORE_CATS.find(c=>c[0]===a.cat)[1]} • الإصدار ${a.v} • ${fmtSize(a.size)} • ${a.src}</small></div>
      <button class="btn sm" data-apx="open" data-id="${a.id}">فتح</button>
      <button class="btn sm ghost" data-pin="${S.dock.includes(a.id)?'off':'addId'}" data-id="${a.id}">${icon('home')}${S.dock.includes(a.id)?'إزالة من الرئيسية':'على الرئيسية'}</button>
      <button class="btn sm danger" data-apx="remove" data-id="${a.id}">${icon('trash')}حذف</button></div>`).join('')
      :`<div class="empty">${icon('store')}<b>ما مثبت أي برنامج</b></div>`}
  </div>

  <div class="card"><h3>${icon('apps')}تطبيقات النظام</h3>
    ${APPS_BUILTIN.map(a=>`<div class="app-row">${appIcon({...a,sys:true})}<div class="nm"><b>${a.n}</b><small>${a.sub||'مدمج بالنظام'}${PROTECTED.has(a.id)?' • أساسي':''}</small></div>
      <span class="hint">إظهار بالقائمة</span><label class="sw"><input type="checkbox" data-vis="${a.id}" ${S.hiddenApps.includes(a.id)?'':'checked'} ${PROTECTED.has(a.id)?'disabled':''}><span></span></label>
      <button class="btn sm" data-apx="open" data-id="${a.id}">فتح</button></div>`).join('')}
  </div>

  <div class="card"><h3>${icon('doc')}التطبيقات الافتراضية</h3>
    ${dsel('pdf','ملفات PDF',[['pdf','قارئ PDF'],['chromium','Chromium'],...(has('onlyoffice')?[['onlyoffice','ONLYOFFICE']]:[])])}
    ${dsel('docx','ملفات Word و PowerPoint و Excel',[['word','LibreOffice'],...(has('onlyoffice')?[['onlyoffice','ONLYOFFICE']]:[])])}
    ${dsel('img','الصور',[['viewer','عارض الصور'],...(has('gimp')?[['gimp','GIMP']]:[]),...(has('krita')?[['krita','Krita']]:[])])}
    ${dsel('video','الفيديو والصوت',[['vlc','مشغل الوسائط'+(has('vlc')?' (VLC)':'')]])}
  </div>`;
};
$('#setMain').addEventListener('change',e=>{
  const v=e.target.dataset.vis; if(v){ S.hiddenApps=e.target.checked?S.hiddenApps.filter(x=>x!==v):[...S.hiddenApps,v]; save(); toast(e.target.checked?'التطبيق يظهر بالقائمة':'تم إخفاء التطبيق من القائمة'); }
  const d=e.target.dataset.def; if(d){ S.defaults[d]=e.target.value; save('تم تغيير التطبيق الافتراضي'); }
});
$('#setMain').addEventListener('click',async e=>{
  const p=e.target.closest('[data-pin]');
  if(p){ const a=p.dataset.pin, id=p.dataset.id, D=S.dock, i=D.indexOf(id);
    if(a==='up'&&i>0) [D[i-1],D[i]]=[D[i],D[i-1]];
    if(a==='down'&&i<D.length-1) [D[i+1],D[i]]=[D[i],D[i+1]];
    if(a==='off') S.dock=D.filter(x=>x!==id);
    if(a==='add'||a==='addId'){ const nid=a==='add'?$('#pinAdd').value:id; if(S.dock.length>=7){ toast('الحد الأقصى ٧ أيقونات',false); return; } if(!S.dock.includes(nid)) S.dock.push(nid); }
    save(); renderDock(); Extra.renderSec('appsset'); return; }
  const x=e.target.closest('[data-apx]'); if(!x) return; const a=x.dataset.apx, id=x.dataset.id;
  if(a==='open') Apps.launch(id);
  if(a==='remove') await Store.remove(id);
  if(a==='removeAll'){ if(S.pin&&S.lockStore&&!await pinPad('أدخل الرمز')) return;
    if(!await confirmBox('إزالة كل البرامج',`راح تنحذف ${nf(S.installed.length)} برامج من الجهاز.`,'إزالة الكل',true,'trash')) return;
    await Files.progress('جاري إزالة البرامج…',500*MB); S.dock=S.dock.filter(i=>!S.installed.includes(i)); S.installed=[]; save(); toast('تمت إزالة كل البرامج'); appsChanged(); }
});
