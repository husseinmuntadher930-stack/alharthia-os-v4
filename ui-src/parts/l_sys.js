
/* =====================================================================
   CONNECTIVITY: Wi-Fi, Bluetooth (+ receiving files), quick panel
   ===================================================================== */
const NETS=[['Harthiya-School',true,4],['Teachers-5G',true,3],['Lab-2',true,2],['Guest',false,1]];
const BT={
  paired:[{id:'p1',n:'هاتف المدرّس',t:'phone',on:true},{id:'p2',n:'سماعة الصف',t:'speaker',on:false}],
  near:[], scanning:false, pending:null,
  scan(){ if(!S.bt) return; this.scanning=true; this.near=[]; renderConn();
    const found=[{id:'n1',n:'Galaxy A54 (أحمد)',t:'phone'},{id:'n2',n:'لابتوب المختبر',t:'laptop'},{id:'n3',n:'Redmi Note (علي)',t:'phone'},{id:'n4',n:'JBL Flip',t:'headphones'}];
    found.forEach((d,i)=>setTimeout(()=>{ if(!this.scanning) return; this.near.push(d); renderConn(); if(i===found.length-1){ this.scanning=false; renderConn(); } },500+i*450)); },
  pair(id){ const d=this.near.find(x=>x.id===id); if(!d) return; toast('جاري الاقتران مع '+d.n+'…');
    setTimeout(()=>{ this.near=this.near.filter(x=>x!==d); this.paired.push({...d,on:true}); renderConn(); toast('تم الاقتران'); },1100); },
  toggle(id){ const d=this.paired.find(x=>x.id===id); if(d){ d.on=!d.on; renderConn(); toast(d.on?'تم الاتصال بـ '+d.n:'تم قطع الاتصال'); } },
  forget(id){ this.paired=this.paired.filter(x=>x.id!==id); renderConn(); },
  incoming(){
    if(!S.bt){ toast('البلوتوث مطفأ',false); return; }
    if(!S.btReceive){ toast('استقبال الملفات مطفأ من الإعدادات',false); return; }
    if(this.pending) return;
    const files=[['واجب الرياضيات - أحمد.pdf','pdf',1.2*MB],['صورة التجربة.jpg','art1',2.1*MB],['تقرير العلوم.docx','docx',48*KB],['عرض الطالب.pptx','pptx',3.4*MB],['جدول الدرجات.xlsx','xlsx',14*KB]];
    const senders=[['Galaxy A54 (أحمد)',false],['هاتف المدرّس',true],['Redmi Note (علي)',false]];
    const f=files[Math.floor(Math.random()*files.length)], s=senders[Math.floor(Math.random()*senders.length)];
    this.pending={name:f[0],sample:f[1],size:f[2],from:s[0],paired:s[1]};
    updateStatus();
    if(S.btAuto&&s[1]) this.accept(); else this.showReq();
  },
  showReq(){
    const p=this.pending, el=$('#btReq'); el.hidden=false;
    el.innerHTML=`<div class="hd"><span class="ic">${icon('bluetooth')}</span><div><b>طلب استلام ملف</b><div class="hint">من: ${esc(p.from)}</div></div></div>
      <div class="fn">${esc(p.name)}</div><div class="hint">${fmtSize(p.size)}</div>
      <div class="btns" style="margin-top:14px;justify-content:flex-end"><button class="btn ghost" data-bt="reject">رفض</button><button class="btn primary" data-bt="accept">${icon('download')}قبول</button></div>`;
    beep(1,660);
  },
  accept(){
    const p=this.pending, el=$('#btReq'); el.hidden=false;
    el.innerHTML=`<div class="hd"><span class="ic">${icon('bluetooth')}</span><div><b>جاري الاستلام…</b><div class="hint">من: ${esc(p.from)}</div></div></div><div class="fn">${esc(p.name)}</div>
      <div class="meter"><i id="btBar" style="width:0"></i></div><div class="hint" id="btTxt">٠٪</div>`;
    const dur=clamp(p.size/MB*1400,1800,5000), t0=performance.now();
    const step=()=>{ const k=Math.min(1,(performance.now()-t0)/dur); const b=$('#btBar'); if(b){ b.style.width=k*100+'%'; $('#btTxt').textContent=`${nf(Math.round(k*100))}٪ — ${fmtSize(p.size*k)} من ${fmtSize(p.size)}`; }
      if(k<1) requestAnimationFrame(step); else this.done(); };
    step();
  },
  done(){
    const p=this.pending, dir=FS.find('bt');
    const node=FS.add('bt',{name:FS.uniqueName(dir,p.name),type:extOf(p.name),size:p.size,sample:p.sample});
    this.pending=null; updateStatus();
    const el=$('#btReq');
    el.innerHTML=`<div class="hd"><span class="ic" style="background:var(--ok)">${icon('check')}</span><div><b>تم استلام الملف</b><div class="hint">محفوظ في «المستلمة عبر البلوتوث»</div></div></div><div class="fn">${esc(node.name)}</div>
      <div class="btns" style="margin-top:14px;justify-content:flex-end"><button class="btn ghost" data-bt="folder">${icon('folder')}فتح المجلد</button><button class="btn primary" data-bt="open" data-id="${node.id}">فتح الملف</button></div>`;
    clearTimeout(this.hideT); this.hideT=setTimeout(()=>{ el.hidden=true; },9000);
    beep(2,990); if(current==='settings') Storage.render&&0;
  }
};
$('#btReq').addEventListener('click',e=>{
  const b=e.target.closest('[data-bt]'); if(!b) return; const a=b.dataset.bt, el=$('#btReq');
  if(a==='reject'){ BT.pending=null; el.hidden=true; updateStatus(); toast('تم رفض الملف',false); }
  if(a==='accept') BT.accept();
  if(a==='folder'){ el.hidden=true; go('files'); Files.open('internal','bt'); }
  if(a==='open'){ el.hidden=true; openFile(FS.find(b.dataset.id)); }
});
function wifiBars(){ const net=NETS.find(n=>n[0]===S.wifiNet); return S.wifi&&net?net[2]:0; }
function updateStatus(){
  const bars=wifiBars();
  $$('#topbar .wf').forEach(w=>{ ['w1','w2','w3'].forEach((c,k)=>{ const p=w.querySelector('.'+c); if(p) p.style.opacity=S.wifi&&bars>=k+1?1:.28; }); const d=w.querySelector('.w0'); if(d) d.style.opacity=S.wifi&&bars?1:.28; w.querySelector('.wx').style.display=S.wifi?'none':''; });
  $$('.st-wifi').forEach(e=>e.classList.toggle('off',!S.wifi));
  $$('.strip .st-wifi').forEach(e=>{ e.innerHTML=icon(S.wifi?'wifi':'wifiOff'); e.style.opacity=S.wifi?1:.5; });
  $$('.st-bt').forEach(e=>{ e.style.opacity=S.bt?1:.35; e.querySelector('.badge')?.remove(); if(BT.pending){ const b=document.createElement('i'); b.className='badge'; e.appendChild(b);} });
  $('#tbUsb').hidden=!FS.drives.usb.connected;
}
function renderConn(){
  if(!$('#wifiList')) return;
  $('#sWifi').checked=S.wifi; $('#sBt').checked=S.bt;
  $('#wifiList').innerHTML=S.wifi?NETS.map(([n,l,s])=>`<div class="row" data-net="${n}" style="cursor:pointer">
      <span class="lbl" style="display:flex;align-items:center;gap:12px"><span style="font-size:22px;opacity:${.35+s*.16}">${icon('wifi')}</span><span style="direction:ltr">${n}</span>${l?`<span style="font-size:15px;color:var(--muted)">${icon('lock')}</span>`:''}</span>
      ${n===S.wifiNet?'<span style="color:var(--ok);font-weight:600">متصل</span>':'<span class="btn sm ghost">اتصال</span>'}</div>`).join(''):'<p class="sub" style="margin:4px 0 0">الـ Wi-Fi مطفأ</p>';
  const devIcon=t=>icon({phone:'phone',laptop:'laptop',speaker:'speaker',headphones:'headphones'}[t]||'bluetooth');
  $('#btBody').innerHTML=S.bt?`
    <div class="row"><span class="lbl">اسم الجهاز<span class="hint">هذا الاسم يطلع للأجهزة القريبة</span></span><b style="direction:ltr">${esc(S.btName)}</b><button class="btn sm ghost" data-btx="rename">${icon('edit')}تغيير</button></div>
    <div class="row"><label>مرئي للأجهزة القريبة</label><label class="sw"><input type="checkbox" data-bts="btVisible" ${S.btVisible?'checked':''}><span></span></label></div>
    <div class="row"><label>استقبال الملفات عبر البلوتوث<span class="hint">الملفات تنحفظ في «المستلمة عبر البلوتوث»</span></label><label class="sw"><input type="checkbox" data-bts="btReceive" ${S.btReceive?'checked':''}><span></span></label></div>
    <div class="row"><label>قبول تلقائي من الأجهزة المقترنة</label><label class="sw"><input type="checkbox" data-bts="btAuto" ${S.btAuto?'checked':''}><span></span></label></div>
    <div class="row"><span class="lbl">تجربة</span><button class="btn primary" data-btx="test">${icon('inbox')}محاكاة استلام ملف</button><button class="btn ghost" data-btx="folder">${icon('folder')}فتح مجلد المستلمة</button></div>
    <h3 style="margin:18px 0 6px;font-size:16px">الأجهزة المقترنة</h3>
    ${BT.paired.length?BT.paired.map(d=>`<div class="row"><span class="lbl" style="display:flex;gap:12px;align-items:center"><span style="font-size:22px;color:var(--muted)">${devIcon(d.t)}</span>${esc(d.n)}${d.on?'<span style="color:var(--ok);font-size:13px">متصل</span>':''}</span>
      <button class="btn sm" data-btx="toggle" data-id="${d.id}">${d.on?'قطع الاتصال':'اتصال'}</button><button class="btn sm ghost" data-btx="forget" data-id="${d.id}">${icon('trash')}</button></div>`).join(''):'<p class="hint">ماكو أجهزة مقترنة</p>'}
    <h3 style="margin:18px 0 6px;font-size:16px;display:flex;align-items:center;gap:10px">أجهزة قريبة ${BT.scanning?'<span class="spin" style="width:20px;height:20px;border-width:2px"></span>':''}<button class="btn sm ghost" data-btx="scan" style="margin-inline-start:auto">${icon('search')}بحث</button></h3>
    ${BT.near.length?BT.near.map(d=>`<div class="row"><span class="lbl" style="display:flex;gap:12px;align-items:center"><span style="font-size:22px;color:var(--muted)">${devIcon(d.t)}</span>${esc(d.n)}</span><button class="btn sm primary" data-btx="pair" data-id="${d.id}">اقتران</button></div>`).join(''):`<p class="hint">${BT.scanning?'جاري البحث…':'اضغط «بحث» حتى تلكى الأجهزة القريبة'}</p>`}`
    :'<p class="sub" style="margin:4px 0 0">البلوتوث مطفأ</p>';
}
function bindConn(){
  $('#sWifi').onchange=e=>{ S.wifi=e.target.checked; save(); renderConn(); updateStatus(); renderQP(); };
  $('#sBt').onchange=e=>{ S.bt=e.target.checked; if(!S.bt){BT.scanning=false;BT.near=[];} save(); renderConn(); updateStatus(); renderQP(); };
  $('#wifiList').addEventListener('click',e=>{ const r=e.target.closest('[data-net]'); if(!r||r.dataset.net===S.wifiNet) return;
    const [n,locked]=NETS.find(x=>x[0]===r.dataset.net);
    const doIt=()=>{ toast('جاري الاتصال بـ '+n+' …'); setTimeout(()=>{ S.wifiNet=n; save(); renderConn(); updateStatus(); toast('تم الاتصال'); },900); };
    if(locked) modal({title:'كلمة مرور '+n,iconName:'lock',body:'<input class="field" type="password" id="wpw" placeholder="كلمة المرور" style="-webkit-user-select:text">',actions:[{label:'إلغاء',val:false,cls:'ghost'},{label:'اتصال',val:true,cls:'primary'}],onOpen:ov=>$('#wpw',ov).focus()}).then(ok=>ok&&doIt());
    else doIt(); });
  $('#btBody').addEventListener('change',e=>{ const k=e.target.dataset.bts; if(k){ S[k]=e.target.checked; save(); renderQP(); } });
  $('#btBody').addEventListener('click',async e=>{ const b=e.target.closest('[data-btx]'); if(!b) return; const a=b.dataset.btx, id=b.dataset.id;
    if(a==='scan') BT.scan(); if(a==='pair') BT.pair(id); if(a==='toggle') BT.toggle(id); if(a==='forget') BT.forget(id);
    if(a==='test') BT.incoming(); if(a==='folder'){ go('files'); Files.open('internal','bt'); }
    if(a==='rename'){ const n=await promptBox('اسم الجهاز بالبلوتوث',S.btName); if(n){ S.btName=n; save(); renderConn(); } } });
}
function renderQP(){
  const q=$('#qp'); if(q.hidden) return;
  q.innerHTML=`<div style="display:flex;align-items:center;gap:10px"><b style="flex:1;font-size:16px">الإعدادات السريعة</b><span class="hint" style="direction:ltr">${esc(S.btName)}</span></div>
    <div class="qp-grid">
      <button class="qp-tile${S.wifi?' on':''}" data-q="wifi"><span class="ic">${icon(S.wifi?'wifi':'wifiOff')}</span><span><b>Wi-Fi</b><small>${S.wifi?S.wifiNet:'مطفأ'}</small></span></button>
      <button class="qp-tile${S.bt?' on':''}" data-q="bt"><span class="ic">${icon('bluetooth')}</span><span><b>البلوتوث</b><small>${S.bt?(BT.paired.filter(d=>d.on).length?nf(BT.paired.filter(d=>d.on).length)+' جهاز متصل':'مشغّل'):'مطفأ'}</small></span></button>
      <button class="qp-tile${S.bt&&S.btReceive?' on':''}" data-q="recv"><span class="ic">${icon('inbox')}</span><span><b>استقبال الملفات</b><small>${S.bt&&S.btReceive?'جاهز للاستلام':'مطفأ'}</small></span></button>
      <button class="qp-tile${effectiveMode()==='dark'?' on':''}" data-q="dark"><span class="ic">${icon(effectiveMode()==='dark'?'moon':'sun')}</span><span><b>الوضع ${effectiveMode()==='dark'?'الليلي':'الصباحي'}</b><small>${S.mode==='auto'?'تلقائي':'يدوي'}</small></span></button>
    </div>
    <div class="qp-row">${icon('sun')}<input type="range" id="qBright" min="10" max="100" value="${S.bright}"></div>
    <div class="qp-row">${icon('vol')}<input type="range" id="qVol" min="0" max="100" value="${S.vol}"></div>
    <div class="btns"><button class="btn sm" data-q="test">${icon('bluetooth')}تجربة استلام ملف</button><button class="btn sm ghost" data-q="settings">${icon('gear')}الاتصالات</button></div>`;
  $$('#qp input[type=range]').forEach(setRangeFill);
}
function toggleQP(){ const q=$('#qp'); q.hidden=!q.hidden; renderQP(); }
function closeQP(){ const q=$('#qp'); if(q) q.hidden=true; }
$('#qp').addEventListener('click',e=>{ const b=e.target.closest('[data-q]'); if(!b) return; const a=b.dataset.q;
  if(a==='wifi'){ S.wifi=!S.wifi; } if(a==='bt'){ S.bt=!S.bt; } if(a==='recv'){ if(!S.bt) S.bt=true; S.btReceive=!S.btReceive||!S.bt; }
  if(a==='dark'){ S.mode=effectiveMode()==='dark'?'light':'dark'; applyTheme(); syncSettingsUI(); }
  if(a==='test'){ closeQP(); BT.incoming(); return; }
  if(a==='settings'){ go('settings','conn'); return; }
  save(); updateStatus(); renderConn(); renderQP(); });
$('#qp').addEventListener('input',e=>{ if(e.target.id==='qBright'){ S.bright=+e.target.value; applyBright(); } if(e.target.id==='qVol') S.vol=+e.target.value; setRangeFill(e.target); save(); });
document.addEventListener('pointerdown',e=>{ const q=$('#qp'); if(!q.hidden&&!e.target.closest('#qp,[data-qp]')) q.hidden=true; },true);

/* =====================================================================
   SETTINGS
   ===================================================================== */
const GRADES=['الأول متوسط','الثاني متوسط','الثالث متوسط','الرابع العلمي','الرابع الأدبي','الخامس العلمي','الخامس الأدبي','السادس العلمي','السادس الأدبي'];
const SECTIONS=['أ','ب','ج','د','هـ','و','ز'];
const WALLS=[['navy','لون الثيم'],['night','ليلي'],['sunrise','غروب'],['light','فاتح']];
function setRangeFill(r){ r.style.setProperty('--p',((r.value-r.min)/(r.max-r.min)*100)+'%'); }
function showSec(sec){
  $$('#setNav .nav-btn').forEach(b=>b.classList.toggle('on',b.dataset.sec===sec));
  $$('#setMain .sec').forEach(s=>s.hidden=s.dataset.sec!==sec);
  $('#setMain').scrollTop=0; setTitle('الإعدادات — '+$(`#setNav [data-sec=${sec}] .txt`).textContent);
  if(sec==='brand') requestAnimationFrame(()=>layoutBrand('pv'));
  if(sec==='about') renderAbout();
  if(sec==='storage') Storage.render();
  if(sec==='conn'){ renderConn(); if(window.Native&&Native.on&&Native.bt&&Native.bt.powered&&!(Native.near||[]).length) Native.btScan(); }
  if(sec==='sound') AudioOut.load();
  if(Extra.secs[sec]) Extra.renderSec(sec);
}
$('#setNav').addEventListener('click',e=>{ const b=e.target.closest('[data-sec]'); if(b) showSec(b.dataset.sec); });
onShow.settings=sec=>{ syncSettingsUI(); showSec(sec||$('#setNav .on').dataset.sec); };
function buildPosGrid(el,key){
  el.innerHTML=PRESETS.map(p=>`<button data-p="${p}" title="${PRESET_NAMES[p]}" aria-label="${PRESET_NAMES[p]}"></button>`).join('');
  el.addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return; S[key]={p:b.dataset.p,x:.5,y:.5}; selectItem(key==='logoPos'?'logo':'text'); layoutAll(); syncSettingsUI(); save(); });
}
function syncSettingsUI(){
  const set=(id,v)=>{ const e=$('#'+id); if(!e) return; if(e.type==='checkbox') e.checked=!!v; else if(document.activeElement!==e) e.value=v; if(e.type==='range') setRangeFill(e); };
  set('sSchool',S.school); set('sClass',S.cls);
  set('sShowSchool',S.showSchool); set('sShowText',S.showText); set('sShowLogo',S.showLogo); set('sStrip',S.strip);
  set('sTextSize',S.textSize); set('sLogoSize',S.logoSize);
  set('sClock',S.clock); set('s24',S.h24); set('sAr',S.ar);
  set('sSmooth',S.smooth); set('sPalm',S.palm); set('sPenOnly',S.penOnly); set('sAssistDef',S.assistDef); set('sAuto',S.autosave);
  set('sVol',S.vol); set('sBright',S.bright); set('sSleep',S.sleep);
  $$('#textGrid button').forEach(b=>b.classList.toggle('on',b.dataset.p===S.textPos.p));
  $$('#logoGrid button').forEach(b=>b.classList.toggle('on',b.dataset.p===S.logoPos.p));
  $('#besideLogo').classList.toggle('on',S.textPos.p==='beside');
  $('#logoThumb').src=logoSrc();
  const m=S.cls.match(/^الصف\s+(.+?)\s*-\s*(.+?)\s*-\s*$/);
  if(m&&GRADES.includes(m[1])) $('#sGrade').value=m[1]; if(m&&SECTIONS.includes(m[2])) $('#sSection').value=m[2];
  $$('#modeSeg button').forEach(b=>b.classList.toggle('on',b.dataset.mode===S.mode));
  $('#themeOpts').innerHTML=Object.entries(THEMES).map(([k,t])=>`<button class="theme-opt${S.theme===k?' on':''}" data-theme="${k}"><span class="pv" style="background:linear-gradient(135deg,${t.pri},color-mix(in srgb,${t.pri} 70%,#fff))"><b></b><i style="background:${t.acc}"></i></span>${t.n}</button>`).join('');
  const accs=ACCENTS.includes(S.acc)?ACCENTS:[...ACCENTS,S.acc];
  $('#accDots').innerHTML=accs.map(c=>`<button class="acc-dot${S.acc===c?' on':''}" data-acc="${c}" style="--c:${c}" aria-label="${c}"></button>`).join('')+`<button class="acc-dot custom" data-acc="custom" title="لون مخصص" aria-label="لون مخصص"></button>`;
  const walls=WALLS.concat((S.wallId&&galSrc(S.wallId))||S.wallImg?[['img','صورتي']]:[]);
  $('#wallChips').innerHTML=walls.map(([k,n])=>`<button class="chip${S.wall===k?' on':''}" data-wall="${k}">${n}</button>`).join('');
}
function bindSettings(){
  $('#sGrade').innerHTML=GRADES.map(g=>`<option>${g}</option>`).join('');
  $('#sSection').innerHTML=SECTIONS.map(s=>`<option value="${s}">شعبة ${s}</option>`).join('');
  buildPosGrid($('#textGrid'),'textPos'); buildPosGrid($('#logoGrid'),'logoPos');
  const txt=(id,key)=>$('#'+id).addEventListener('input',e=>{S[key]=e.target.value;layoutAll();save();});
  txt('sSchool','school'); txt('sClass','cls');
  const comp=()=>{S.cls=`الصف ${$('#sGrade').value} -${$('#sSection').value}-`;$('#sClass').value=S.cls;layoutAll();save('تم تغيير اسم الصف');};
  $('#sGrade').onchange=comp; $('#sSection').onchange=comp;
  const tog=(id,key,after)=>$('#'+id).addEventListener('change',e=>{S[key]=e.target.checked;after&&after();layoutAll();save();});
  tog('sShowSchool','showSchool'); tog('sShowText','showText'); tog('sShowLogo','showLogo'); tog('sStrip','strip');
  tog('sClock','clock',tick); tog('s24','h24',tick); tog('sAr','ar',()=>{tick();Board.changed();Timer.render();});
  tog('sPalm','palm'); tog('sPenOnly','penOnly'); tog('sAssistDef','assistDef',()=>{Board.assist=S.assistDef;Board.syncUI();}); tog('sAuto','autosave',()=>{if(S.autosave)Board.persist();});
  const rng=(id,key,after)=>$('#'+id).addEventListener('input',e=>{S[key]=+e.target.value;setRangeFill(e.target);after&&after();save();});
  rng('sTextSize','textSize',layoutAll); rng('sLogoSize','logoSize',layoutAll); rng('sVol','vol'); rng('sBright','bright',applyBright); rng('sSmooth','smooth');
  $('#sSleep').onchange=e=>{S.sleep=e.target.value;save('تم الحفظ');};
  $('#besideLogo').onclick=()=>{S.textPos={p:'beside',x:.5,y:.5};layoutAll();syncSettingsUI();save();};
  $('#brandReset').onclick=()=>{ for(const k of ['school','cls','showSchool','showText','showLogo','strip','logo','logoPos','textPos','logoSize','textSize']) S[k]=structuredClone(DEF[k]); layoutAll();syncSettingsUI();save('تمت استعادة الوضع الافتراضي'); };
  $('#liveDrag').onclick=()=>{go('home');setDrag(true);};
  $('#logoPick').onclick=()=>$('#logoFile').click();
  $('#logoFile').onchange=async e=>{ const f=e.target.files[0]; e.target.value=''; if(!f) return;
    try{ S.logo=(await shrinkImage(await readAsDataURL(f),512,'image/png')).url; layoutAll(); syncSettingsUI(); save('تم تغيير الشعار'); }catch(err){ toast('تعذر قراءة الصورة',false); } };
  $('#logoOrig').onclick=()=>{S.logo=null;layoutAll();syncSettingsUI();save('تمت استعادة الشعار الأصلي');};
  $('#modeSeg').addEventListener('click',e=>{ const b=e.target.closest('[data-mode]'); if(!b) return; S.mode=b.dataset.mode; applyTheme(); syncSettingsUI(); save(); Board.renderBg(); });
  $('#themeOpts').addEventListener('click',e=>{ const b=e.target.closest('[data-theme]'); if(!b) return; S.theme=b.dataset.theme; S.acc=THEMES[S.theme].acc; applyTheme(); syncSettingsUI(); save('تم تغيير ألوان الواجهة'); });
  $('#accDots').addEventListener('click',async e=>{ const b=e.target.closest('[data-acc]'); if(!b) return; let c=b.dataset.acc;
    if(c==='custom'){ c=await pickColorModal('لون التمييز',S.acc); if(!c) return; pushRecent(c); }
    S.acc=c; applyTheme(); syncSettingsUI(); save(); });
  $('#wallChips').addEventListener('click',e=>{ const b=e.target.closest('[data-wall]'); if(!b) return; S.wall=b.dataset.wall; applyWalls(); syncSettingsUI(); save(); });
  $('#wallPick').onclick=()=>$('#wallFile').click();
  $('#wallFile').onchange=async e=>{ const f=e.target.files[0]; e.target.value=''; if(!f) return;
    await Gallery.addFiles([f],'wall'); syncSettingsUI(); };
  $('#clearBoards').onclick=async()=>{ if(await confirmBox('حذف صفحات السبورة','راح تنمسح كل الصفحات الحالية بالسبورة.','حذف',true,'trash')){ Board.reset(); toast('تم حذف صفحات السبورة'); } };
  $('#storBody').addEventListener('click',e=>Storage.onClick(e));
  bindConn();
  makeDraggable('pv');
}
function renderAbout(){
  const rows=[['اسم النظام','Alharthia OS '+OS_VERSION],['الأساس','Raspberry Pi OS Lite (Debian) — 64-bit'],['الواجهة','Wayland (labwc) + واجهة الصف'],['الجهاز','Raspberry Pi 5 — ذاكرة 8 GB'],['التخزين','NVMe SSD — 256 GB'],['الشاشة',`${screen.width} × ${screen.height} — شاشة لمس تفاعلية`],['البرامج المثبتة من المتجر',nf(S.installed.length)],['المدرسة',S.school],['الصف',S.cls]];
  $('#aboutCard').innerHTML=`<div style="display:flex;align-items:center;gap:18px;margin-bottom:10px"><img src="${logoSrc()}" alt="" class="logo-thumb" style="width:76px;height:76px"><div><div style="font-size:24px;font-weight:700;color:var(--head);direction:ltr;text-align:right">Alharthia <span style="color:var(--acc)">OS</span></div><div class="sub" style="margin:0">الإصدار ${OS_VERSION} — نظام الصف التفاعلي</div></div></div>`+
    rows.map(([k,v])=>`<div class="row"><span class="lbl" style="color:var(--muted)">${k}</span><span style="font-weight:600;flex:1.4">${esc(v)}</span></div>`).join('')+
    `<div class="btns" style="margin-top:12px"><button class="btn" data-toast="النظام محدَّث لآخر إصدار">${icon('restart')}البحث عن تحديثات</button></div>`;
}

/* =====================================================================
   POWER / LOCK / KEYBOARD / BOOT
   ===================================================================== */
function lockNow(){ layoutAll(); $('#lock').hidden=false; }
$('#lock').onclick=async()=>{ if(S.pin&&!await pinPad('أدخل رمز القفل')) return; $('#lock').hidden=true; lastAct=Date.now(); };
/* شاشة الإطفاء / إعادة التشغيل: الشعار + نص إنكليزي، وتبقى ظاهرة لحد ما ينطفي الجهاز.
   after==='hold' يعني لا تنزل الشاشة أبداً (بالمعاينة فقط تنسد باللمس، بدون أي نص). */
function sysMessage(txt,after,cb){
  const m=$('#sysMsg'); $('#sysTxt').textContent=txt; m.hidden=false; m.querySelector('.spin').hidden=false; m.onclick=null;
  m.classList.toggle('power',after==='hold');
  document.documentElement.classList.add('sysmsg');
  const close=()=>{ m.hidden=true; m.onclick=null; m.classList.remove('power'); document.documentElement.classList.remove('sysmsg'); };
  if(after==='hold'){
    if(!(window.Native&&Native.on)) m.onclick=close;
    return;
  }
  setTimeout(()=>{ if(cb){ cb(); return; } close(); },1800);
}
$('#tbKbd').onclick=()=>Keyboard.toggleEnabled();
$('#tbPower').onclick=()=>modal({title:'خيارات التشغيل',iconName:'power',body:`<div class="power-grid">
    <button data-pw="lock">${icon('lock')}قفل الشاشة</button><button data-pw="restart">${icon('restart')}إعادة التشغيل</button><button data-pw="off" class="red">${icon('power')}إيقاف التشغيل</button></div>`,
  actions:[{label:'إلغاء',val:null,cls:'ghost'}],
  onOpen:(ov,done)=>ov.addEventListener('click',e=>{ const b=e.target.closest('[data-pw]'); if(!b) return; done(null); const a=b.dataset.pw;
    if(a==='lock') lockNow(); if(a==='restart'){ Board.persist(); sysMessage('Restarting…','hold'); }
    if(a==='off'){ Board.persist(); sysMessage('Shutting down…','hold'); } })});
let lastAct=Date.now();
['pointerdown','keydown','wheel'].forEach(t=>addEventListener(t,()=>{lastAct=Date.now();},{passive:true,capture:true}));
setInterval(()=>{ const mins=+S.sleep; if(!mins||!$('#lock').hidden||Timer.running()) return; if(Date.now()-lastAct>mins*60e3) lockNow(); },15e3);

addEventListener('keydown',e=>{
  if(e.target.matches('input,select,textarea,[contenteditable]')) return;
  const k=e.key, mod=e.ctrlKey||e.metaKey;
  if(k==='Escape'){ if(!$('#showOv').hidden){ Office.endShow(); return; } Board.closePop(); closeQP(); if(dragOn) setDrag(false); if(current==='board'){ if(Board.eyedrop) Board.setEyedrop(false); else if(Board.sel.length) Board.setSel([]); else if($('#board').classList.contains('focus')) Board.doAct('focus'); } return; }
  if(!$('#showOv').hidden){ if(k==='ArrowLeft'||k===' '){ Office.goSlide(Office.si+1); Office.syncShow(); } if(k==='ArrowRight'){ Office.goSlide(Office.si-1); Office.syncShow(); } return; }
  if(current==='board'){
    if(mod&&(k==='z'||k==='Z')){ e.preventDefault(); e.shiftKey?Board.redo():Board.undo(); }
    else if(mod&&(k==='y'||k==='Y')){ e.preventDefault(); Board.redo(); }
    else if((k==='Delete'||k==='Backspace')&&Board.sel.length){ e.preventDefault(); $('#selMenu [data-sel=del]').click(); }
    else if(k==='PageDown') Board.goPage(Board.pi+1); else if(k==='PageUp') Board.goPage(Board.pi-1);
  }
  if(current==='pdf'){ if(k==='ArrowLeft'||k==='PageDown'||k===' '){e.preventDefault();Pdf.goto(Pdf.i+1);} if(k==='ArrowRight'||k==='PageUp'){e.preventDefault();Pdf.goto(Pdf.i-1);} if(mod&&k==='z'){e.preventDefault();Pdf.ink.undo();} }
  if(current==='office'&&Office.mode==='ppt'){ if(k==='ArrowLeft') Office.goSlide(Office.si+1); if(k==='ArrowRight') Office.goSlide(Office.si-1); }
  if(k==='F11'){ e.preventDefault(); toggleFullscreen(); }
});

/* ---------------- tick ---------------- */
function tick(){
  const now=tzNow(), tp=timeParts(now);
  $('#tbClock').textContent=tp.t+(tp.ap?' '+tp.ap:'');
  $('.cw-time').innerHTML=tp.t+(tp.ap?`<small>${tp.ap}</small>`:'');
  $('.cw-date').textContent=dateStr(now);
  $$('.s-clock').forEach(e=>e.textContent=tp.t);
  $('#pvClock').textContent=tp.t; $('#lockTime').textContent=tp.t;
}

/* ---------------- boot ---------------- */
(function boot(){
  paintIcons();
  applyTheme();
  FS.init();
  Board.init();
  Pdf.init();
  Files.init();
  Office.init();
  bindSettings();
  makeDraggable('home');
  Timer.init();
  initBrowser();
  onShow.home=()=>requestAnimationFrame(layoutAll);
  onShow.timer=()=>Timer.render();
  applyWalls(); applyBright(); syncSettingsUI(); layoutAll(); tick(); updateStatus();
  setInterval(tick,1000);
  setInterval(()=>{ if(S.mode==='auto'){ const before=document.documentElement.dataset.theme; applyTheme(); if(before!==document.documentElement.dataset.theme) Board.renderBg(); } },60e3);
  let rz=0; addEventListener('resize',()=>{ cancelAnimationFrame(rz); rz=requestAnimationFrame(layoutAll); });
  $('#bLogo').addEventListener('load',layoutAll);
  document.fonts&&document.fonts.ready.then(()=>{ layoutAll(); Board.redraw(); });
  addEventListener('beforeunload',()=>{ Board.persist(); FS.persist(); });
  Extra.init();
  Attend.init();
  renderDock();
  Keyboard.init(); Media.init(); AudioOut.init(); Term.init(); Side.init(); Cast.init(); Lang.apply(true);
  Native.init();
  const m=$('#sysMsg'); $('#sysTxt').textContent='جاري التشغيل…'; m.hidden=false; if(S.bootSound) setTimeout(()=>beep(1,523),200);
  setTimeout(()=>{ m.hidden=true; if(S.startApp&&S.startApp!=='home') go(S.startApp); if(S.lockOnStart) lockNow(); },700);
})();
</script>
</body>
</html>
