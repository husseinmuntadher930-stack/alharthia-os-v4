
/* =====================================================================
   NATIVE MODE — connects the interface to the real Raspberry Pi
   (only active when served by alharthia_server.py)
   ===================================================================== */
const API={
  tok:window.ALH_TOKEN||'',
  async req(path,{body,raw,method}={}){
    const opt={method:method||(body!==undefined||raw!==undefined?'POST':'GET'),headers:{'X-Alharthia-Token':this.tok}};
    if(raw!==undefined) opt.body=raw; else if(body!==undefined){ opt.body=JSON.stringify(body); opt.headers['Content-Type']='application/json'; }
    const r=await fetch(path,opt);
    if(r.status===401){ location.reload(); throw new Error('session'); }
    const ct=r.headers.get('Content-Type')||'';
    const data=ct.includes('json')?await r.json():await r.arrayBuffer();
    if(!r.ok) throw new Error((data&&data.error)||('HTTP '+r.status));
    return data;
  },
  get(p){ return this.req(p); },
  post(p,b){ return this.req(p,{body:b||{}}); },
  url(p){ return '/api/fs/file?path='+encodeURIComponent(p)+'&t='+encodeURIComponent(this.tok); },
  q(o){ return Object.entries(o).map(([k,v])=>k+'='+encodeURIComponent(v)).join('&'); }
};
const WEB_APPS={geogebra:'https://www.geogebra.org/classic?lang=ar'};
const errMsg=e=>String(e&&e.message||e).slice(0,160);
const Native={
  on:false, roots:[], folders:{}, wifi:null, bt:null, sys:null, t0:Date.now(),
  async init(){
    if(!window.ALH_NATIVE||!API.tok) return;
    try{ const p=await API.get('/api/ping'); this.folders=p.folders; this.on=true; }catch(e){ return; }
    document.documentElement.classList.add('native');
    this.patch();
    FilePicker.install();
    await this.refreshRoots(true);
    this.syncInstalled();
    this.pollWifi(); this.pollBt();
    setInterval(()=>this.refreshRoots(),6000);
    setInterval(()=>this.pollWifi(),30000);
    setInterval(()=>{ if(current==='settings') this.pollBt(); },6000);
    setInterval(()=>this.pollBt(),45000);
    setInterval(()=>this.pollReceived(),4000);
    setInterval(()=>BtXfer.poll(),800);
    this.pushKbd();
    { const baseSave=save; let kt=0; save=function(m){ baseSave(m); clearTimeout(kt); kt=setTimeout(()=>Native.pushKbd(),600); }; }
    API.get('/api/volume').then(v=>{ if(v.value!=null){ S.vol=v.value; syncSettingsUI(); } }).catch(()=>{});
  },
  /* ---------- polling ---------- */
  async refreshRoots(first){
    try{ const r=await API.get('/api/fs/roots'); const before=this.roots.filter(x=>x.dev).map(x=>x.dev).join();
      this.roots=r.roots; this.folders=r.folders||this.folders;
      const now=this.roots.filter(x=>x.dev).map(x=>x.dev).join();
      if(!first&&now!==before){ if(now.length>before.length) toast('تم توصيل فلاشة USB'); else toast('تم فصل الفلاشة'); if(current==='files') Files.render(); if(current==='settings') Storage.render(); }
      updateStatus();
    }catch(e){}
  },
  async pollWifi(){ try{ this.wifi=await API.get('/api/wifi'); S.wifi=this.wifi.enabled; S.wifiNet=this.wifi.current||''; updateStatus(); if(current==='settings') renderConn(); }catch(e){} },
  async pollBt(){ try{ this.bt=await API.get('/api/bt'); if(this.bt.available){ S.bt=this.bt.powered; S.btName=this.bt.name||S.btName; S.btVisible=this.bt.discoverable; } updateStatus(); if(current==='settings') renderConn(); }catch(e){} },
  async pollReceived(){
    try{ const r=await API.get('/api/bt/received?since='+this.t0); for(const f of r.items){ const node=nodeOf(f); BT.showNative(node); } }catch(e){}
  },
  async syncInstalled(){
    try{ const r=await API.get('/api/apps/installed'); const web=S.installed.filter(id=>(STORE_APPS.find(a=>a.id===id)||{}).web);
      S.installed=[...new Set([...r.installed,...web])]; S.dock=S.dock.filter(id=>APPS_BUILTIN.some(a=>a.id===id)||S.installed.includes(id)); save(); appsChanged(); }catch(e){}
  },
  kbdSig:'',
  pushKbd(){
    const st={langs:S.kbdLangs||['ar','en','fr'],lang:S.kbdLang,mode:S.oskMode,size:S.oskSize,preview:S.oskPreview!==false,termKeys:S.oskTermKeys!==false,
      dark:document.documentElement.dataset.theme==='dark',acc:getComputedStyle(document.documentElement).getPropertyValue('--acc').trim()||S.acc,ar:S.ar,clickSound:!!S.clickSound,emojiRecent:S.emojiRecent||[]};
    const sig=JSON.stringify(st); if(sig===this.kbdSig) return; this.kbdSig=sig;
    API.post('/api/keyboard',st).catch(()=>{});
  },
  async launch(o,label){ try{ await API.post('/api/apps/launch',o); toast('جاري فتح '+(label||'البرنامج')+'…'); }catch(e){ toast(errMsg(e),false); } },
  job(j,onP){
    return new Promise((res,rej)=>{ const tick=async()=>{ try{ const s=await API.get('/api/jobs?id='+j.id); onP&&onP(s.progress,s); if(s.state==='done') res(s); else if(s.state==='error') rej(new Error(s.error||'فشل')); else setTimeout(tick,700); }catch(e){ rej(e); } }; tick(); });
  },
  async install(id){
    const a=STORE_APPS.find(x=>x.id===id); installing.set(id,.02); Store.refresh(id);
    try{ const j=await API.post('/api/apps/install',{id}); await this.job(j,p=>{ installing.set(id,p); Store.refresh(id); });
      installing.delete(id); if(!S.installed.includes(id)) S.installed.push(id); justInstalled.add(id); save(); Store.refresh(id); appsChanged(); toast(`تم تثبيت ${a.n} — تلكاه بقائمة التطبيقات`); }
    catch(e){ installing.delete(id); Store.refresh(id); toast('فشل التثبيت: '+errMsg(e),false); }
  },
  async remove(id){
    const a=STORE_APPS.find(x=>x.id===id); installing.set(id,.3); Store.refresh(id);
    try{ const j=await API.post('/api/apps/remove',{id}); await this.job(j,p=>{ installing.set(id,p); Store.refresh(id); });
      installing.delete(id); S.installed=S.installed.filter(x=>x!==id); S.dock=S.dock.filter(x=>x!==id); save(); Store.refresh(id); appsChanged(); toast('تمت إزالة '+a.n); }
    catch(e){ installing.delete(id); Store.refresh(id); toast('فشلت الإزالة: '+errMsg(e),false); }
  },
  rootOf(path){ return [...this.roots].sort((a,b)=>b.path.length-a.path.length).find(r=>path===r.path||path.startsWith(r.path+'/'))||this.roots[0]; },
  /* ---------- monkey patches ---------- */
  patch(){
    const self=this;
    // navigation: the browser opens the real Chromium
    const baseGo=go;
    go=function(id,arg){ if(id==='browser'){ if(window.ALH_HOST) console.log('ALHCMD:'+JSON.stringify({cmd:'browser'})); else self.launch({id:'chromium'},'Chromium'); return; } return baseGo(id,arg); };
    const baseLaunch=Apps.launch.bind(Apps);
    Apps.launch=function(id){
      const st=STORE_APPS.find(a=>a.id===id);
      if(id==='chromium') return go('browser');
      if(st&&!APPS_BUILTIN.some(a=>a.id===id)){ justInstalled.delete(id); if(st.web&&window.ALH_HOST&&WEB_APPS[id]){ console.log('ALHCMD:'+JSON.stringify({cmd:'browser',url:WEB_APPS[id]})); return; } if(st.web) return self.launch({id},st.n); return self.launch({id},st.n); }
      return baseLaunch(id);
    };
    // power
    const baseSys=sysMessage;
    sysMessage=function(txt,after,cb){
      baseSys(txt,after,cb);
      if(/Shutting down/i.test(txt)) setTimeout(()=>API.post('/api/power',{action:'off'}).catch(e=>toast(errMsg(e),false)),800);
      else if(/Restarting/i.test(txt)) setTimeout(()=>API.post('/api/power',{action:'reboot'}).catch(e=>toast(errMsg(e),false)),800);
    };
    // status bar
    wifiBars=function(){ const w=self.wifi; if(!w||!w.enabled||!w.current) return 0; const n=w.nets.find(x=>x.active); const s=n?n.signal:60; return s>75?4:s>50?3:s>25?2:1; };
    const baseStatus=updateStatus;
    updateStatus=function(){ baseStatus(); $('#tbUsb').hidden=!self.roots.some(r=>r.dev); $$('.st-bt').forEach(e=>e.style.opacity=S.bt?1:.35); };
    // volume + timezone
    let vt=0; const pushVol=()=>{ clearTimeout(vt); vt=setTimeout(()=>API.post('/api/volume',{value:S.vol}).catch(()=>{}),250); };
    document.addEventListener('input',e=>{ if(e.target.id==='sVol'||e.target.id==='qVol') pushVol(); });
    document.addEventListener('change',e=>{ if(e.target.dataset&&e.target.dataset.xsel==='tz') API.post('/api/time/tz',{tz:S.tz}).then(j=>self.job(j)).then(()=>toast('تم تغيير المنطقة الزمنية')).catch(er=>toast(errMsg(er),false)); });
    // quick panel toggles act on the real radios
    $('#qp').addEventListener('click',e=>{ const b=e.target.closest('[data-q]'); if(!b) return;
      if(b.dataset.q==='wifi') self.setWifi(S.wifi); if(b.dataset.q==='bt') self.setBt(S.bt); });
    // about
    renderAbout=async function(){
      $('#aboutCard').innerHTML='<div class="empty"><div class="spin"></div></div>';
      let s={}; try{ s=await API.get('/api/sys'); self.sys=s; }catch(e){}
      const up=s.uptime?`${nf(Math.floor(s.uptime/3600))} ساعة و ${nf(Math.floor(s.uptime%3600/60))} دقيقة`:'—';
      const rows=[['اسم النظام','Alharthia OS '+(s.version||'')],['نظام التشغيل',s.os],['الجهاز',s.model],['الذاكرة',s.ram?fmtSize(s.ram):'—'],['حرارة المعالج',s.temp!=null?nf(s.temp.toFixed(1))+'°م':'—'],
        ['التخزين',s.disk_total?`${fmtSize(s.disk_used)} مستخدمة من ${fmtSize(s.disk_total)}`:'—'],['النواة',s.kernel],['اسم الجهاز بالشبكة',s.hostname],['عنوان IP',(self.wifi&&self.wifi.ip)||'—'],['مدة التشغيل',up],['المستخدم',s.user]];
      $('#aboutCard').innerHTML=`<div style="display:flex;align-items:center;gap:18px;margin-bottom:10px"><img src="${logoSrc()}" alt="" class="logo-thumb" style="width:76px;height:76px"><div><div style="font-size:24px;font-weight:700;color:var(--head);direction:ltr;text-align:right">Alharthia <span style="color:var(--acc)">OS</span></div><div class="sub" style="margin:0">${esc(S.school)}</div></div></div>`+
        rows.map(([k,v])=>`<div class="row"><span class="lbl" style="color:var(--muted)">${k}</span><span style="font-weight:600;flex:1.4;direction:auto">${esc(v||'—')}</span></div>`).join('');
    };
    // connectivity
    renderConn=function(){ self.renderWifi(); self.renderBt(); };
    $('#sWifi').onchange=e=>self.setWifi(e.target.checked);
    $('#sBt').onchange=e=>self.setBt(e.target.checked);
    $('#wifiList').addEventListener('click',e=>self.onWifi(e));
    $('#btBody').addEventListener('click',e=>self.onBt(e));
    $('#btBody').addEventListener('change',e=>self.onBtChange(e));
    BT.incoming=()=>toast(`من الهاتف: شارك الملف بالبلوتوث واختر «${S.btName}»`);
    BT.showNative=node=>{
      if(BtXfer.shown.has(node.path)) return;
      const el=$('#btReq'); el.hidden=false; beep(2,990);
      el.innerHTML=`<div class="hd"><span class="ic" style="background:var(--ok)">${icon('bluetooth')}</span><div><b>تم استلام ملف بالبلوتوث</b><div class="hint">محفوظ في «المستلمة عبر البلوتوث»</div></div></div><div class="fn">${esc(node.name)}</div>
        <div class="btns" style="margin-top:14px;justify-content:flex-end"><button class="btn ghost" data-nbr="folder">${icon('folder')}فتح المجلد</button><button class="btn primary" data-nbr="open">فتح الملف</button></div>`;
      el.onclick=e=>{ const b=e.target.closest('[data-nbr]'); if(!b) return; el.hidden=true; if(b.dataset.nbr==='folder'){ go('files'); Files.open('internal','bt'); } else openFile(node); };
      clearTimeout(BT.hideT); BT.hideT=setTimeout(()=>el.hidden=true,12000);
    };
    // files, storage, office
    patchFiles(); patchStorage();
    const baseOpen=openFile;
    openFile=async function(node){ if(node&&node.native) return nativeOpen(node); return baseOpen(node); };
    FS.add=function(folderId,file){
      const dir=self.folders[folderId]||self.folders.docs;
      const node={native:true,id:uid(),name:file.name,type:file.type||extOf(file.name),size:file.size||0,mtime:Date.now(),blob:file.blob,data:file.data,path:null};
      let body=file.blob;
      if(!body&&file.data!==undefined) body=typeof file.data==='string'&&file.data.startsWith('data:')?new Blob([b64ToBuf(file.data.split(',')[1])]):new Blob([JSON.stringify(file.data)],{type:'application/json'});
      if(body) API.req('/api/fs/upload?'+API.q({dir,name:file.name}),{raw:body}).then(r=>{ node.path=r.path; node.name=r.name; if(current==='files') Files.render(); }).catch(e=>toast('تعذر الحفظ: '+errMsg(e),false));
      return node;
    };
    const baseOfficeOpen=Office.open.bind(Office);
    Office.open=async function(type,buf,name,path){ Office.curPath=path||null; return baseOfficeOpen(type,buf,name); };
    const baseOfficeBar=Office.onBar.bind(Office);
    Office.onBar=async function(e){ const b=e.target.closest('[data-ob=edit]'); if(b){ if(Office.curPath) self.launch({id:'office',path:Office.curPath},OFFICE_APPS[Office.mode].lo); else toast('احفظ الملف بالجهاز أولاً',false); return; } return baseOfficeBar(e); };
    Office.launch=async function(mode){
      this.mode=mode; const A=OFFICE_APPS[mode]; go('office'); setTitle(A.n); $('#ofThumbs').hidden=true; this.name=''; this.bar([]);
      $('#ofStage').innerHTML='<div class="empty"><div class="spin"></div></div>';
      let items=[]; try{ items=(await API.get('/api/fs/search?'+API.q({path:self.roots[0].path,ext:A.t==='docx'?'docx,doc,odt':A.t==='xlsx'?'xlsx,xls,ods,csv':'pptx,ppt,odp'}))).items; }catch(e){}
      for(const r of self.roots.filter(r=>r.dev)){ try{ items.push(...(await API.get('/api/fs/search?'+API.q({path:r.path,ext:A.t}))).items); }catch(e){} }
      items.sort((a,b)=>b.mtime-a.mtime);
      $('#ofStage').innerHTML=`<div style="max-width:900px;margin:0 auto">
        <div class="app-head"><span class="ficon" style="--c:${A.c};width:64px;height:64px">${icon(A.i)}</span><div><h1 class="h1">${A.n}</h1><p class="sub" style="margin:0">عرض سريع — والتعديل بـ ${A.lo}</p></div></div>
        <div class="btns" style="margin-bottom:20px"><button class="btn primary" data-onew="1">${icon('plus')}ملف جديد بـ ${A.lo}</button><button class="btn ghost" data-go="files">${icon('folder')}مستكشف الملفات</button></div>
        <div class="card"><h3>${icon('doc')}الملفات (${nf(items.length)})</h3>${items.length?`<div class="fgrid">${items.slice(0,120).map(f=>`<button class="fitem" data-npath="${esc(f.path)}"><span class="ficon" style="--c:${A.c}">${icon(A.i)}</span><span class="fname">${esc(f.name)}</span><span class="fmeta">${fmtSize(f.size)}</span></button>`).join('')}</div>`:'<div class="empty">ماكو ملفات من هذا النوع</div>'}</div></div>`;
      $('#ofStage').onclick=e=>{ const f=e.target.closest('[data-npath]'); if(f){ const it=items.find(x=>x.path===f.dataset.npath); openFile(nodeOf(it)); } if(e.target.closest('[data-onew]')) self.launch({id:mode},A.lo); };
    };
  },
  /* ---------- Wi-Fi ---------- */
  async setWifi(on){ try{ await API.post('/api/wifi/power',{on}); toast(on?'تم تشغيل الـ Wi-Fi':'تم إطفاء الـ Wi-Fi'); }catch(e){ toast(errMsg(e),false); } setTimeout(()=>this.pollWifi(),1500); },
  renderWifi(){
    const w=this.wifi, el=$('#wifiList'); if(!el) return;
    $('#sWifi').checked=!!(w&&w.enabled);
    if(!w){ el.innerHTML='<div class="empty"><div class="spin"></div>جاري البحث عن الشبكات…</div>'; return; }
    if(!w.available){ el.innerHTML='<p class="sub">NetworkManager غير متوفر</p>'; return; }
    if(!w.enabled){ el.innerHTML='<p class="sub" style="margin:4px 0 0">الـ Wi-Fi مطفأ</p>'; return; }
    el.innerHTML=(w.nets.length?w.nets.map(n=>`<div class="row" data-nnet="${esc(n.ssid)}" data-sec="${n.secure?1:0}" style="cursor:pointer">
      <span class="lbl" style="display:flex;align-items:center;gap:12px"><span style="font-size:22px;opacity:${.3+n.signal/140}">${icon('wifi')}</span><span style="direction:ltr">${esc(n.ssid)}</span>${n.secure?`<span style="font-size:15px;color:var(--muted)">${icon('lock')}</span>`:''}<span class="hint">${nf(n.signal)}٪</span></span>
      ${n.active?`<span style="color:var(--ok);font-weight:600">متصل</span><button class="btn sm ghost" data-nforget="${esc(n.ssid)}">نسيان</button>`:'<span class="btn sm ghost">اتصال</span>'}</div>`).join(''):'<p class="hint">ماكو شبكات قريبة</p>')+
      `<div class="btns" style="margin-top:10px"><button class="btn sm" data-nrescan="1">${icon('restart')}تحديث القائمة</button>${w.ip?`<span class="hint">IP: <b dir="ltr">${esc(w.ip)}</b></span>`:''}</div>`;
  },
  async onWifi(e){
    if(e.target.closest('[data-nrescan]')){ this.wifi=null; this.renderWifi(); return this.pollWifi(); }
    const f=e.target.closest('[data-nforget]'); if(f){ e.stopPropagation(); if(await confirmBox('نسيان الشبكة',`راح ينقطع الاتصال بـ ${esc(f.dataset.nforget)} وتنحذف كلمة المرور.`,'نسيان',true,'wifi')){ try{ await API.post('/api/wifi/forget',{ssid:f.dataset.nforget}); }catch(er){ toast(errMsg(er),false); } this.pollWifi(); } return; }
    const r=e.target.closest('[data-nnet]'); if(!r) return; const ssid=r.dataset.nnet; if(this.wifi&&this.wifi.current===ssid) return;
    let password='';
    if(r.dataset.sec==='1'){ password=await modal({title:'كلمة مرور '+esc(ssid),iconName:'lock',body:'<input class="field" type="password" id="wpw" placeholder="كلمة المرور" autocomplete="off"><p class="hint" style="margin-top:8px">إذا الشبكة محفوظة مسبقاً اتركها فارغة</p>',
      actions:[{label:'إلغاء',val:null,cls:'ghost'},{label:'اتصال',val:ov=>$('#wpw',ov).value,cls:'primary'}],onOpen:ov=>$('#wpw',ov).focus()}); if(password===null) return; }
    toast('جاري الاتصال بـ '+ssid+' …');
    try{ await API.post('/api/wifi/connect',{ssid,password}); toast('تم الاتصال بـ '+ssid); }catch(er){ toast('تعذر الاتصال: '+errMsg(er),false); }
    this.pollWifi();
  },
  /* ---------- Bluetooth ---------- */
  async setBt(on){ try{ await API.post('/api/bt/power',{on}); }catch(e){ toast(errMsg(e),false); } setTimeout(()=>this.pollBt(),1200); },
  renderBt(){
    const b=this.bt, el=$('#btBody'); if(!el) return;
    $('#sBt').checked=!!(b&&b.powered);
    if(!b){ el.innerHTML='<div class="empty"><div class="spin"></div></div>'; return; }
    if(!b.available){ el.innerHTML='<p class="sub">ماكو بلوتوث بهذا الجهاز</p>'; return; }
    if(!b.powered){ el.innerHTML='<p class="sub" style="margin:4px 0 0">البلوتوث مطفأ</p>'; return; }
    const dev=d=>icon(/phone/.test(d.icon)?'phone':/computer/.test(d.icon)?'laptop':/audio|head/.test(d.icon)?'headphones':'bluetooth');
    el.innerHTML=`
      <div class="row"><span class="lbl">اسم الجهاز<span class="hint">هذا الاسم يطلع للهواتف القريبة</span></span><b style="direction:ltr">${esc(b.name)}</b><button class="btn sm ghost" data-nbt="rename">${icon('edit')}تغيير</button></div>
      <div class="row"><label>مرئي للأجهزة القريبة<span class="hint">شغّله حتى الهاتف يكدر يلكى الجهاز ويرسل ملفات</span></label><label class="sw"><input type="checkbox" data-nbts="disc" ${b.discoverable?'checked':''}><span></span></label></div>
      <div class="row"><span class="lbl">استلام الملفات<span class="hint">${b.receiving?'مفعّل — الملفات تنحفظ تلقائياً في «المستلمة عبر البلوتوث»':'خدمة الاستلام (obexd) غير مثبتة'}</span></span><button class="btn ghost" data-nbt="folder">${icon('folder')}فتح المجلد</button></div>
      <h3 style="margin:18px 0 6px;font-size:16px">الأجهزة المقترنة</h3>
      ${b.paired.length?b.paired.map(d=>`<div class="row"><span class="lbl" style="display:flex;gap:12px;align-items:center"><span style="font-size:22px;color:var(--muted)">${dev(d)}</span>${esc(d.name)}${d.connected?'<span style="color:var(--ok);font-size:13px">متصل</span>':''}</span>
        <button class="btn sm" data-nbt="conn" data-mac="${d.mac}" data-on="${d.connected?0:1}">${d.connected?'قطع الاتصال':'اتصال'}</button><button class="btn sm ghost" data-nbt="remove" data-mac="${d.mac}">${icon('trash')}</button></div>`).join(''):'<p class="hint">ماكو أجهزة مقترنة</p>'}
      <h3 style="margin:18px 0 6px;font-size:16px;display:flex;align-items:center;gap:10px">أجهزة قريبة ${this.scanning?'<span class="spin" style="width:20px;height:20px;border-width:2px"></span>':''}<button class="btn sm ghost" data-nbt="scan" style="margin-inline-start:auto" ${this.scanning?'disabled':''}>${icon('search')}بحث</button></h3>
      ${(this.near||[]).length?this.near.map(d=>`<div class="row"><span class="lbl" style="display:flex;gap:12px;align-items:center"><span style="font-size:22px;color:var(--muted)">${icon('bluetooth')}</span>${esc(d.name)}</span><button class="btn sm primary" data-nbt="pair" data-mac="${d.mac}">اقتران</button></div>`).join(''):`<p class="hint">${this.scanning?'جاري البحث… الأجهزة تطلع هنا أول ما تنلكى. تأكد إن البلوتوث بالجهاز الثاني مفتوح وظاهر.':'اضغط «بحث» حتى تلكى الأجهزة القريبة'}</p>`}`;
  },
  async btScan(){
    if(this.scanning) return;
    this.scanning=true; this.renderBt();
    const upd=r=>{ this.near=r.devices||[]; if(current==='settings') this.renderBt(); };
    try{
      upd(await API.post('/api/bt/scan'));
      const t0=Date.now();
      while(Date.now()-t0<40000){
        await new Promise(r=>setTimeout(r,1500));
        const r=await API.get('/api/bt/scan'); upd(r);
        if(!r.scanning||current!=='settings') break;
      }
    }catch(er){ toast(errMsg(er),false); }
    this.scanning=false; if(current==='settings') this.renderBt();
  },
  async onBtChange(e){ if(e.target.dataset.nbts==='disc'){ try{ await API.post('/api/bt/discoverable',{on:e.target.checked}); }catch(er){ toast(errMsg(er),false); } this.pollBt(); } },
  async onBt(e){
    const b=e.target.closest('[data-nbt]'); if(!b) return; const a=b.dataset.nbt, mac=b.dataset.mac;
    try{
      if(a==='folder'){ go('files'); Files.open('internal','bt'); return; }
      if(a==='rename'){ const n=await promptBox('اسم الجهاز بالبلوتوث',this.bt.name); if(!n) return; await API.post('/api/bt/name',{name:n}); }
      if(a==='scan'){ return this.btScan(); }
      if(a==='pair'){ toast('جاري الاقتران… وافق على الطلب بالهاتف'); await API.post('/api/bt/pair',{mac}); this.near=(this.near||[]).filter(d=>d.mac!==mac); toast('تم الاقتران'); }
      if(a==='conn') await API.post('/api/bt/connect',{mac,on:b.dataset.on==='1'});
      if(a==='remove'){ if(!await confirmBox('إزالة الجهاز','تريد تلغي الاقتران مع هذا الجهاز؟','إزالة',true,'bluetooth')) return; await API.post('/api/bt/remove',{mac}); }
    }catch(er){ toast(errMsg(er),false); }
    this.pollBt();
  }
};
window.Native=Native;

/* ---------------- Bluetooth transfer card (bottom-left, like the phone) ---------------- */
const BtXfer={
  shown:new Set(), seen:new Map(), active:null, hideT:0, t0:Date.now()/1000,
  async poll(){
    if(!(window.Native&&Native.on)) return;
    let r; try{ r=await API.get('/api/bt/transfers'); }catch(e){ return; }
    const items=(r.items||[]).filter(t=>t.started>=this.t0-2);
    const live=items.filter(t=>t.state==='receiving').sort((a,b)=>b.started-a.started);
    if(live.length){ this.active=live[0].id; this.render(live[0],live.length-1); return; }
    for(const t of items){
      const prev=this.seen.get(t.id); if(prev===t.state) continue;
      this.seen.set(t.id,t.state);
      if(t.state==='done'){ if(t.path) this.shown.add(t.path); this.render(t,0); beep(2,990); }
      else if(t.state==='failed'&&this.active===t.id) this.render(t,0);
    }
  },
  render(t,more){
    const el=$('#btReq'); el.hidden=false; el.classList.add('xfer');
    const pct=t.size?Math.min(100,Math.round(t.got/t.size*100)):0;
    const secs=Math.max(.5,(t.t||Date.now()/1000)-t.started), speed=t.got/secs;
    const done=t.state==='done', fail=t.state==='failed';
    const color=done?'var(--ok)':fail?'var(--danger)':'#2563eb';
    el.innerHTML=`<div class="hd"><span class="ic${!done&&!fail?' pulse':''}" style="background:${color}">${icon(done?'check':fail?'x':'bluetooth')}</span>
        <div class="grow"><b>${done?'تم استلام الملف':fail?'فشل استلام الملف':'جاري استلام ملف'}</b><div class="hint">${fail?'انقطع الاتصال مع الجهاز':'من: '+esc(t.from||'جهاز بلوتوث')}${more>0?` · و${nf(more)} ملف ثاني`:''}</div></div>
        <button class="icon-btn sm" data-xf="hide" title="إخفاء">${icon('x')}</button></div>
      <div class="fn">${esc(t.name)}</div>
      ${done?`<div class="hint">${fmtSize(t.got)} · محفوظ في «المستلمة عبر البلوتوث»</div>
        <div class="btns" style="margin-top:14px;justify-content:flex-end"><button class="btn ghost" data-xf="folder">${icon('folder')}فتح المجلد</button><button class="btn primary" data-xf="open">فتح الملف</button></div>`
      :fail?'':`<div class="meter"><i style="width:${t.size?pct:30}%"></i></div>
        <div class="xf-row"><span>${t.size?nf(pct)+'٪':''}</span><span>${fmtSize(t.got)}${t.size?' من '+fmtSize(t.size):''}</span><span>${fmtSize(speed)}/ث</span></div>`}`;
    el.onclick=e=>{ const b=e.target.closest('[data-xf]'); if(!b) return; const a=b.dataset.xf; el.hidden=true;
      if(a==='folder'){ go('files'); Files.open('internal','bt'); }
      if(a==='open'&&t.path) openFile(nodeOf({path:t.path,name:t.path.split('/').pop(),size:t.got,mtime:Date.now()})); };
    clearTimeout(this.hideT);
    if(done||fail) this.hideT=setTimeout(()=>{ el.hidden=true; el.classList.remove('xfer'); },done?15000:8000);
  }
};
window.BtXfer=BtXfer;
function nodeOf(f){ return {native:true,id:f.path,path:f.path,name:f.name,type:f.dir?'dir':extOf(f.name),size:f.size,mtime:f.mtime,count:f.count}; }
async function nativeOpen(node){
  const t=node.type;
  const buf=async()=>{ if(node.blob) return node.blob.arrayBuffer(); if(!node.path) throw new Error('الملف ما انحفظ بعد'); return API.req('/api/fs/file?path='+encodeURIComponent(node.path)); };
  try{
    if(t==='dir'){ go('files'); Files.openPath(node.path); return; }
    if(t==='pdf') return Pdf.open(await buf(),node.name);
    if(t==='docx'||t==='xlsx'||t==='pptx') return Office.open(t,await buf(),node.name,node.path);
    if(t==='png'||t==='jpg') return Office.openImage(node.path?API.url(node.path):URL.createObjectURL(node.blob),node.name);
    if(t==='board'){ const data=node.data||JSON.parse(new TextDecoder().decode(await buf()));
      if(Board.pages.some(p=>p.items.length)&&!await confirmBox('فتح سبورة محفوظة','الصفحات الحالية بالسبورة راح تتبدل بالملف المفتوح.','فتح الملف',false,'board')) return;
      Board.loadData(data); go('board'); return; }
    if(!node.path) return toast('الملف ما انحفظ بعد',false);
    if(t==='mp4'||t==='mp3'){
      const dir=node.path.replace(/\/[^/]*$/,'')||'/';
      const me={name:node.name,path:node.path,src:API.url(node.path)};
      let list=[me];
      try{ const r=await API.get('/api/fs/list?path='+encodeURIComponent(dir)); const same=mediaKind(node.name);
        list=r.items.filter(f=>!f.dir&&mediaKind(f.name)===same).sort((a,b)=>a.name.localeCompare(b.name,'ar',{numeric:true})).map(f=>({name:f.name,path:f.path,src:API.url(f.path)}));
        if(!list.some(x=>x.path===node.path)) list=[me]; }catch(e){}
      return Media.open(list.find(x=>x.path===node.path)||me,list);
    }
    await Native.launch({id:t==='csv'?'office':'open',path:node.path},node.name);
  }catch(e){ toast('تعذر فتح الملف: '+errMsg(e),false); }
}

/* ---------------- native file explorer ---------------- */
function patchFiles(){
  const NF={path:null,items:[],view:'grid',selMode:false,sel:new Set(),q:''};
  const N=Native;
  const root=()=>N.rootOf(NF.path||N.roots[0].path);
  const QUICK_N=[['docs','المستندات','doc'],['boards','السبورات المحفوظة','board'],['down','التنزيلات','download'],['pics','الصور','image'],['vids','الفيديو','video'],['bt','المستلمة عبر البلوتوث','bluetooth']];
  Files.openPath=function(p){ NF.path=p; NF.sel.clear(); NF.selMode=false; NF.q=''; this.render(); };
  Files.open=function(drive,folder){
    let p;
    if(folder) p=N.folders[folder];
    else if(drive==='usb'){ const u=N.roots.find(r=>r.dev); if(!u){ toast('ماكو فلاشة موصولة',false); } p=(u||N.roots[0]).path; }
    else p=(N.roots.find(r=>r.id===drive)||N.roots[0]).path;
    this.openPath(p);
  };
  Files.render=async function(){ if(!NF.path) NF.path=N.roots[0].path; const want=NF.path+'|'+NF.q; this.renderSide(); await this.load(); if(want!==NF.path+'|'+NF.q) return; this.renderMain(); };
  Files.load=async function(){
    const want=NF.path+'|'+NF.q;
    try{ const r=NF.q?await API.get('/api/fs/search?'+API.q({path:NF.path,q:NF.q})):await API.get('/api/fs/list?path='+encodeURIComponent(NF.path)); if(want===NF.path+'|'+NF.q) NF.items=r.items.map(nodeOf); }
    catch(e){ toast(errMsg(e),false); NF.items=[]; if(NF.path!==N.roots[0].path){ NF.path=N.roots[0].path; return this.load(); } }
  };
  Files.renderSide=function(){
    const I=N.roots[0], usb=N.roots.filter(r=>r.dev), cur=p=>NF.path===p;
    $('#fxSide').innerHTML=`<h4>الذاكرة الداخلية</h4>
      <button class="nav-btn${cur(I.path)?' on':''}" data-npath="${esc(I.path)}">${icon('hdd')}<span class="txt">الذاكرة الداخلية</span></button>
      <div class="drive-card"><div class="meter"><i style="width:${I.used/I.total*100}%"></i></div>${fmtSize(I.free)} متوفرة من ${fmtSize(I.total)}</div>
      ${QUICK_N.map(([id,n,ic])=>`<button class="nav-btn${cur(N.folders[id])?' on':''}" data-npath="${esc(N.folders[id]||'')}">${icon(ic)}<span class="txt">${n}</span></button>`).join('')}
      <h4>الأجهزة الخارجية</h4>
      ${usb.length?usb.map(u=>`<button class="nav-btn${root().path===u.path?' on':''}" data-npath="${esc(u.path)}">${icon('usb')}<span class="txt">${esc(u.name)}</span><span class="end" data-neject="${esc(u.dev)}" title="إخراج">${icon('eject')}</span></button>
        <div class="drive-card"><div class="meter"><i style="width:${(u.used||0)/(u.total||1)*100}%"></i></div>${u.free!=null?fmtSize(u.free)+' متوفرة من '+fmtSize(u.total):''} • ${esc(u.fstype||'')}</div>`).join('')
        :'<div class="drive-card">ماكو فلاشة موصولة — وصّلها وراح تطلع هنا</div>'}`;
  };
  $('#fxSide').addEventListener('click',async e=>{
    const ej=e.target.closest('[data-neject]'); if(ej){ e.stopPropagation(); return Files.ejectDev(ej.dataset.neject); }
    const b=e.target.closest('[data-npath]'); if(b&&b.dataset.npath) Files.openPath(b.dataset.npath);
  },true);
  Files.ejectDev=async function(dev){
    if(!await confirmBox('إخراج الفلاشة','تأكد إن ماكو ملف مفتوح من الفلاشة.','إخراج',false,'eject')) return;
    try{ await API.post('/api/storage/eject',{dev}); toast('يمكنك سحب الفلاشة بأمان'); }catch(e){ toast(errMsg(e),false); }
    await N.refreshRoots(true); if(N.rootOf(NF.path||'').dev===dev||!N.roots.some(r=>NF.path&&NF.path.startsWith(r.path))) NF.path=N.roots[0].path; this.render();
  };
  Files.eject=function(){ const u=N.roots.find(r=>r.dev); if(u) this.ejectDev(u.dev); };
  Files.renderMain=function(){
    const r=root(), rel=NF.path.slice(r.path.length).split('/').filter(Boolean);
    const crumbs=[[r.path,r.dev?'فلاشة '+r.name:'الذاكرة الداخلية']]; let acc=r.path; for(const s of rel){ acc+='/'+s; crumbs.push([acc,s]); }
    const other=r.dev?'الذاكرة الداخلية':'الفلاشة', canOther=!!r.dev||N.roots.some(x=>x.dev);
    $('#fxMain').innerHTML=`<div class="fx-bar">
        <button class="icon-btn" data-nfx="up" ${rel.length?'':'disabled'} title="رجوع">${icon('chevR')}</button>
        <div class="crumbs">${crumbs.map(([p,nm],i)=>`${i?'<span class="sepc">›</span>':''}<button data-ncrumb="${esc(p)}">${esc(nm)}</button>`).join('')}</div>
        <label class="search" style="min-width:200px;height:44px">${icon('search')}<input id="nfxQ" type="search" placeholder="بحث بهذا المجلد" value="${esc(NF.q)}"></label>
        <button class="icon-btn" data-nfx="view" title="طريقة العرض">${icon(NF.view==='grid'?'list':'apps')}</button>
        <button class="icon-btn${NF.selMode?' on':''}" data-nfx="select" title="تحديد">${icon('check')}</button>
        <button class="icon-btn" data-nfx="newdir" title="مجلد جديد">${icon('folderPlus')}</button>
        <button class="icon-btn" data-nfx="refresh" title="تحديث">${icon('restart')}</button>
      </div><div class="${NF.view==='list'?'flist':''} ${NF.selMode?'selmode':''}"><div class="fgrid" id="fxGrid"></div></div>
      <div id="fxSelBar">${NF.selMode&&NF.sel.size?`<div class="selbar"><b>تم تحديد ${nf(NF.sel.size)}</b>
        ${NF.sel.size===1?`<button class="btn sm" data-nfx="open">${icon('doc')}فتح</button><button class="btn sm" data-nfx="rename">${icon('edit')}إعادة تسمية</button>`:''}
        <button class="btn sm" data-nfx="copy" ${canOther?'':'disabled'}>${icon('copy')}نسخ إلى ${other}</button>
        <button class="btn sm" data-nfx="move" ${canOther?'':'disabled'}>${icon('upload')}نقل إلى ${other}</button>
        <button class="btn sm danger" data-nfx="del">${icon('trash')}حذف</button></div>`:''}</div>`;
    const qi=$('#nfxQ'); let qt=0; qi.oninput=()=>{ clearTimeout(qt); qt=setTimeout(async()=>{ NF.q=qi.value.trim(); await Files.load(); Files.renderGrid(); },350); };
    this.renderGrid();
  };
  Files.renderGrid=function(){
    const g=$('#fxGrid'); if(!g) return;
    const list=[...NF.items].sort((a,b)=>(a.type==='dir'?0:1)-(b.type==='dir'?0:1)||b.mtime-a.mtime);
    g.innerHTML=list.length?list.map(it=>{ const [c,ic]=FT[it.type]||FT.other, img=it.type==='png'||it.type==='jpg';
      return `<button class="fitem${NF.sel.has(it.path)?' sel':''}" data-nitem="${esc(it.path)}"><span class="ck">${icon('check')}</span>
        <span class="ficon${img?' thumbimg':''}" style="--c:${c};${img?`background-image:url('${API.url(it.path)}')`:''}">${img?'':icon(ic)}</span>
        <span class="fname">${esc(it.name)}</span><span class="fmeta">${it.type==='dir'?nf(it.count||0)+' عنصر':fmtSize(it.size)}</span></button>`; }).join('')
      :`<div class="empty" style="grid-column:1/-1">${icon(NF.q?'search':'folder')}<b>${NF.q?'ماكو نتائج':'المجلد فارغ'}</b></div>`;
  };
  Files.renderSel=function(){ this.renderMain(); };
  Files.onMain=async function(e){
    const cr=e.target.closest('[data-ncrumb]'); if(cr) return this.openPath(cr.dataset.ncrumb);
    const b=e.target.closest('[data-nfx]');
    if(b){ const a=b.dataset.nfx, sel=[...NF.sel];
      try{
        if(a==='up'){ NF.path=NF.path.slice(0,NF.path.lastIndexOf('/')); NF.sel.clear(); return this.render(); }
        if(a==='view'){ NF.view=NF.view==='grid'?'list':'grid'; return this.renderMain(); }
        if(a==='select'){ NF.selMode=!NF.selMode; NF.sel.clear(); return this.renderMain(); }
        if(a==='refresh') return this.render();
        if(a==='newdir'){ const n=await promptBox('اسم المجلد الجديد','مجلد جديد'); if(n){ await API.post('/api/fs/mkdir',{path:NF.path,name:n}); this.render(); } return; }
        if(a==='open'){ const it=NF.items.find(x=>x.path===sel[0]); NF.selMode=false; NF.sel.clear(); this.renderMain(); return this.openNode(it); }
        if(a==='rename'){ const it=NF.items.find(x=>x.path===sel[0]); const n=await promptBox('إعادة تسمية',it.name); if(n&&n!==it.name){ await API.post('/api/fs/rename',{path:it.path,name:n}); NF.sel.clear(); this.render(); toast('تمت إعادة التسمية'); } return; }
        if(a==='del'){ if(await confirmBox('حذف الملفات',`راح ينحذف ${nf(sel.length)} عنصر نهائياً.`,'حذف',true,'trash')){ await API.post('/api/fs/delete',{paths:sel}); NF.sel.clear(); this.render(); toast('تم الحذف'); } return; }
        if(a==='copy'||a==='move'){
          const r=root(), dest=r.dev?N.folders.docs:(N.roots.find(x=>x.dev)||{}).path; if(!dest) return toast('ماكو فلاشة',false);
          const box=modal({title:a==='copy'?'جاري النسخ…':'جاري النقل…',iconName:'copy',body:'<div class="empty"><div class="spin"></div>انتظر لحد ما تخلص العملية</div>',actions:[]});
          try{ await API.post('/api/fs/copy',{paths:sel,dest,move:a==='move'}); toast(a==='copy'?'تم النسخ':'تم النقل'); }
          finally{ $('#modalHost .overlay:last-child')?.remove(); }
          NF.sel.clear(); N.refreshRoots(true); return this.render();
        }
      }catch(er){ toast(errMsg(er),false); }
      return;
    }
    const it=e.target.closest('[data-nitem]'); if(!it) return;
    const node=NF.items.find(x=>x.path===it.dataset.nitem); if(!node) return;
    if(NF.selMode){ NF.sel.has(node.path)?NF.sel.delete(node.path):NF.sel.add(node.path); it.classList.toggle('sel'); const y=$('#fxMain').scrollTop; this.renderMain(); $('#fxMain').scrollTop=y; return; }
    this.openNode(node);
  };
  Files.openNode=async function(node){ if(!node) return; if(node.type==='dir'){ NF.q=''; return this.openPath(node.path); } return nativeOpen(node); };
  Files.importDevice=async function(f){
    const r=await API.req('/api/fs/upload?'+API.q({dir:NF.path||N.folders.down,name:f.name}),{raw:f}).catch(e=>{ toast(errMsg(e),false); });
    if(r){ toast('تم نسخ «'+r.name+'»'); this.render(); nativeOpen(nodeOf(r)); }
  };
  onShow.files=arg=>{ if(arg==='usb') Files.open('usb'); else Files.render(); };
}

/* ---------------- native storage page ---------------- */
function patchStorage(){
  const N=Native;
  Storage.internalUsed=()=>N.roots[0]?N.roots[0].used:0;
  Storage.render=async function(){
    const el=$('#storBody'); if(!el.innerHTML.trim()) el.innerHTML='<div class="empty"><div class="spin"></div></div>';
    let d; try{ d=await API.get('/api/storage'); }catch(e){ el.innerHTML=`<div class="empty">${esc(errMsg(e))}</div>`; return; }
    this.data=d; const I=d.internal, c=d.cats;
    const known=c.docs+c.boards+c.pics+c.vids+c.down+c.bt+d.cache;
    const cats=[['النظام والبرامج',Math.max(0,I.used-known),'#132557'],['المستندات',c.docs,'#2563eb'],['السبورات',c.boards,'#f0703e'],['الصور',c.pics,'#0e9f8e'],['الفيديو',c.vids,'#db2777'],['التنزيلات',c.down,'#7c3aed'],['المستلمة بالبلوتوث',c.bt,'#0ea5e9'],['ملفات مؤقتة',d.cache,'#f59e0b']];
    const usbCard=u=>`<div class="card"><h3>${icon('usb')}فلاشة ${esc(u.label)}<span class="end btns">${u.mount?`<button class="btn sm" data-nst="open" data-path="${esc(u.mount)}">${icon('folder')}فتح</button>`:''}<button class="btn sm" data-nst="eject" data-dev="${u.dev}">${icon('eject')}إخراج</button><button class="btn sm danger fill" data-nst="format" data-dev="${u.dev}" data-label="${esc(u.label)}">${icon('format')}فورمات</button></span></h3>
      ${u.used!=null?`<div class="stor-top"><div class="donut" style="background:${this.donut([['مستخدم',u.used,'#2563eb']],u.size)}"><span><span>${fmtSize(u.free)}<small>متوفرة</small></span></span></div>
      <div style="flex:1;min-width:260px"><div style="display:flex;gap:30px;flex-wrap:wrap"><div><div class="hint">المستخدمة</div><span class="big-num">${fmtSize(u.used)}</span></div><div><div class="hint">المتوفرة</div><span class="big-num" style="color:var(--ok)">${fmtSize(u.free)}</span></div><div><div class="hint">السعة</div><span class="big-num">${fmtSize(u.size)}</span></div></div></div></div>`:'<p class="hint">الفلاشة غير مفتوحة</p>'}
      <div class="kv"><div><small>الجهاز</small><b dir="ltr">${esc(u.dev)}</b></div><div><small>نظام الملفات</small><b>${esc(u.fstype||'—')}</b></div><div><small>الموديل</small><b>${esc(u.model||'—')}</b></div><div><small>نقطة التركيب</small><b dir="ltr">${esc(u.mount||'—')}</b></div></div></div>`;
    el.innerHTML=`<div class="card"><h3>${icon('hdd')}الذاكرة الداخلية ${I.nvme?'(NVMe SSD)':''}</h3>
        <div class="stor-top"><div class="donut" style="background:${this.donut(cats,I.total)}"><span><span>${fmtSize(I.free)}<small>متوفرة</small></span></span></div>
          <div style="flex:1;min-width:260px"><div style="display:flex;gap:30px;flex-wrap:wrap;margin-bottom:12px">
            <div><div class="hint">المستخدمة</div><span class="big-num">${fmtSize(I.used)}</span></div>
            <div><div class="hint">المتوفرة</div><span class="big-num" style="color:var(--ok)">${fmtSize(I.free)}</span></div>
            <div><div class="hint">السعة الكلية</div><span class="big-num">${fmtSize(I.total)}</span></div></div>
            <div class="meter" style="height:14px">${cats.map(([n,v,col])=>`<i style="width:${v/I.total*100}%;background:${col}" title="${n}"></i>`).join('')}</div></div></div>
        <div class="legend" style="margin-top:16px">${cats.map(([n,v,col])=>`<div><i style="--c:${col}"></i>${n}<b>${fmtSize(v)}</b></div>`).join('')}</div>
        <div class="kv"><div><small>القرص</small><b dir="ltr">${esc(I.source||'—')}</b></div><div><small>الموديل</small><b>${esc(I.model||'—')}</b></div>
          <div><small>نظام الملفات</small><b>${esc(I.fstype)}</b></div><div><small>الحرارة</small><b>${I.temp!=null?nf(I.temp.toFixed(0))+'°م':'—'}</b></div></div>
        <div class="btns" style="margin-top:16px"><button class="btn" data-nst="clean">${icon('clean')}تنظيف الملفات المؤقتة (${fmtSize(d.cache)})</button><button class="btn" data-go="files">${icon('folder')}مستكشف الملفات</button><button class="btn" data-nst="refresh">${icon('restart')}تحديث</button></div>
        <p class="hint" style="margin-top:10px">ما ينفع تسوي فورمات لقرص النظام وهو شغّال.</p></div>
      ${d.usb.length?d.usb.map(usbCard).join(''):`<div class="card"><h3>${icon('usb')}فلاشة USB</h3><div class="empty">${icon('usb')}<b>ماكو فلاشة موصولة</b><span>وصّل الفلاشة وراح تطلع هنا تلقائياً</span></div></div>`}`;
  };
  Storage.onClick=async function(e){
    const b=e.target.closest('[data-nst]'); if(!b) return; const a=b.dataset.nst;
    try{
      if(a==='refresh') return this.render();
      if(a==='open'){ go('files'); return Files.openPath(b.dataset.path); }
      if(a==='eject'){ await Files.ejectDev(b.dataset.dev); return this.render(); }
      if(a==='clean'){ const r=await API.post('/api/storage/clean'); toast('تم تحرير '+fmtSize(r.freed)); return this.render(); }
      if(a==='format'){
        const res=await modal({title:'فورمات الفلاشة',iconName:'format',body:`
          <p style="color:var(--danger);font-weight:600">تحذير: الفورمات يمسح كل الملفات اللي على الفلاشة <span dir="ltr">${esc(b.dataset.dev)}</span>.</p>
          <div class="row"><label>اسم الفلاشة</label><input class="field" id="fmName" value="${esc(b.dataset.label).replace(/[^A-Za-z0-9_ -]/g,'').slice(0,11)||'USB'}" maxlength="11" style="min-width:0;direction:ltr"></div>
          <div class="row"><label>نظام الملفات</label><select class="field" id="fmFs"><option value="exfat">exFAT (يُنصح به)</option><option value="vfat">FAT32</option><option value="ntfs">NTFS</option><option value="ext4">ext4 (لينكس فقط)</option></select></div>
          <p class="hint">اسم الفلاشة بالحروف الإنجليزية والأرقام فقط.</p>`,
          actions:[{label:'إلغاء',val:null,cls:'ghost'},{label:'فورمات الآن',cls:'danger fill',val:ov=>({label:$('#fmName',ov).value.trim()||'USB',fs:$('#fmFs',ov).value})}]});
        if(!res||!await confirmBox('متأكد؟','ما تكدر ترجع الملفات بعد الفورمات.','نعم، امسح كل شي',true,'trash')) return;
        let setP=()=>{};
        modal({title:'جاري الفورمات…',iconName:'format',body:'<div class="meter" style="height:12px"><i id="fmBar" style="width:5%;background:var(--acc)"></i></div>',actions:[],onOpen:ov=>{ setP=p=>{ const m=$('#fmBar',ov); if(m) m.style.width=Math.round(p*100)+'%'; }; }});
        try{ const j=await API.post('/api/storage/format',{dev:b.dataset.dev,...res}); await N.job(j,p=>setP(p)); toast('تم فورمات الفلاشة ('+res.fs+')'); }
        finally{ $('#modalHost .overlay:last-child')?.remove(); }
        await N.refreshRoots(true); return this.render();
      }
    }catch(er){ toast(errMsg(er),false); }
  };
}
