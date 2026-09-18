
/* =====================================================================
   SIDE DRAWER + DRAW-OVER-SCREEN MODE
   سهم صغير ثابت على الجانبين، يفتح قائمة أيقونات سريعة،
   وبيها وضع «الكتابة فوق الشاشة»: يجمّد الصفحة وتكدر تكتب عليها بأي مكان.
   ===================================================================== */
ICONS.semi='<path d="M3 16h18"/><path d="M21 16a9 9 0 0 0-18 0"/>';
ICONS.square='<rect x="4" y="4" width="16" height="16" rx="1"/>';
ICONS.penScreen='<path d="M4 20h16"/><path d="m14.5 3.5 6 6L9 21H3v-6z"/>';
ICONS.camera='<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>';
ICONS.grip='<circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/>';
ICONS.exit='<path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><path d="m16 16 4-4-4-4"/><path d="M20 12H10"/>';
const SIDE_SHAPES=[['line','خط مستقيم','line'],['semi','نصف دائرة','semi'],['circle','دائرة','circle'],['rect','مربع / مستطيل','square'],['triangle','مثلث','triangle']];
const SIDE_COLORS=['#111827','#e11d48','#f0703e','#f59e0b','#16a34a','#2563eb','#7c3aed','#ffffff'];

const Side={
  open:false, side:'r', pop:null, snap:null,
  init(){
    const wrap=document.createElement('div'); wrap.id='sideWrap';
    wrap.innerHTML=`<button class="side-h r" data-sideh="r" title="أدوات سريعة">${icon('chevR')}</button>
      <button class="side-h l" data-sideh="l" title="أدوات سريعة">${icon('chevL')}</button>
      <div id="sidePanel" hidden></div><div id="sidePop" hidden></div>`;
    document.body.appendChild(wrap);
    wrap.addEventListener('click',e=>this.onClick(e));
    wrap.addEventListener('pointerdown',e=>{ const g=e.target.closest('.side-b.grip'); if(g){ e.preventDefault(); this.startDrag(e); } });
    addEventListener('resize',()=>{ if(this.open) this.show(this.side); });
    wrap.addEventListener('input',e=>{
      const r=e.target.closest('input[type=range]'); if(!r) return;
      setRangeFill(r);
      if(r.dataset.k==='ink'){ Board.sizes.ink=+r.value; Board.sizes.shape=+r.value; }
      if(r.dataset.k==='eraser') Board.sizes.eraser=+r.value;
      Board.syncSize();
    });
    addEventListener('keydown',e=>{ if(e.key==='Escape'){ if(this.pop) this.closePop(true); else if(this.open) this.hide(); } });
  },
  /* ---------- panel ---------- */
  show(side){
    this.side=side||this.side; this.open=true;
    const p=$('#sidePanel');
    const horiz=S.sideDir==='h';
    p.className='side-'+this.side+(horiz?' horiz':'')+(S.sidePos?' free':''); p.hidden=false;
    if(S.sidePos){ p.style.left=S.sidePos.x+'px'; p.style.top=S.sidePos.y+'px'; p.style.right='auto'; p.style.transform='none'; }
    else { p.style.left=p.style.top=p.style.right=p.style.transform=''; }
    p.innerHTML=(Annot.on?this.drawTools():this.mainTools()).map(b=>b===null?'<span class="side-sep"></span>':
      `<button class="side-b${b.on?' on':''}${b.danger?' danger':''}${b.grip?' grip':''}" data-sb="${b.k}" title="${esc(b.t)}" aria-label="${esc(b.t)}">${icon(b.i)}</button>`).join('');
    $$('#sideWrap .side-h').forEach(h=>h.classList.toggle('hide',h.dataset.sideh===this.side||!!S.sidePos));
    this.clampPos();
  },
  clampPos(){
    if(!S.sidePos) return;
    const p=$('#sidePanel'), r=p.getBoundingClientRect();
    S.sidePos.x=clamp(S.sidePos.x,4,innerWidth-r.width-4); S.sidePos.y=clamp(S.sidePos.y,4,innerHeight-r.height-4);
    p.style.left=S.sidePos.x+'px'; p.style.top=S.sidePos.y+'px';
  },
  startDrag(e){
    const p=$('#sidePanel'), r=p.getBoundingClientRect();
    const dx=e.clientX-r.left, dy=e.clientY-r.top;
    this.closePop();
    const mv=ev=>{ S.sidePos={x:ev.clientX-dx,y:ev.clientY-dy}; p.classList.add('free'); p.style.right='auto'; p.style.transform='none'; this.clampPos(); };
    const up=()=>{ removeEventListener('pointermove',mv); removeEventListener('pointerup',up); save(); this.show(this.side); };
    addEventListener('pointermove',mv); addEventListener('pointerup',up);
  },
  hide(){ this.open=false; this.closePop(); $('#sidePanel').hidden=true; $$('#sideWrap .side-h').forEach(h=>h.classList.remove('hide')); },
  mainTools(){
    return [{k:'grip',t:'اسحب لتحريك القائمة',i:'grip',grip:true},null,
      {k:'files',t:'الملفات',i:'folder'},{k:'bt',t:'البلوتوث',i:'bluetooth'},{k:'board',t:'السبورة',i:'board'},
      {k:'shot',t:'لقطة شاشة',i:'camera'},{k:'cast',t:'العرض اللاسلكي',i:'cast'},null,
      {k:'annot',t:'الكتابة فوق الشاشة',i:'penScreen'},null,{k:'close',t:'إغلاق القائمة',i:'x'}];
  },
  drawTools(){
    const B=Board;
    return [{k:'grip',t:'اسحب لتحريك القائمة',i:'grip',grip:true},null,
      {k:'pen',t:'القلم واللون والسُمك',i:'pen',on:B.tool==='ink'},
      {k:'eraser',t:'الممحاة',i:'eraser',on:B.tool==='eraser'},
      {k:'shapes',t:'الأشكال',i:'shapes',on:B.tool==='shape'},
      {k:'geo',t:'الأدوات الهندسية',i:'setsq',on:!!B.inst.length||B.tool==='compass'},
      {k:'assist',t:'مساعد الخط المستقيم',i:'straight',on:B.assist},null,
      {k:'undo',t:'تراجع',i:'undo'},{k:'clear',t:'مسح كل الكتابة',i:'trash'},
      {k:'shot',t:'حفظ الصورة الحالية PNG',i:'camera'},null,
      {k:'exit',t:'الخروج من وضع الكتابة',i:'exit',danger:true}];
  },
  onClick(e){
    const h=e.target.closest('[data-sideh]');
    if(h){ const s=h.dataset.sideh; if(this.open&&this.side===s) this.hide(); else this.show(s); return; }
    const o=e.target.closest('[data-sopt]');
    if(o){ this.optClick(o.dataset.sopt,o); return; }
    const b=e.target.closest('[data-sb]'); if(!b) return;
    const k=b.dataset.sb;
    if(k==='grip') return;
    if(['pen','eraser','shapes','geo'].includes(k)) return this.togglePop(k);
    this.closePop();
    switch(k){
      case 'files': Annot.exit(); this.hide(); go('files'); break;
      case 'bt': Annot.exit(); this.hide(); go('settings','conn'); break;
      case 'board': Annot.exit(); this.hide(); go('board'); break;
      case 'annot': Annot.enter(); this.show(this.side); break;
      case 'assist': Board.doAct('assist'); this.show(this.side); break;
      case 'undo': Board.undo(); break;
      case 'clear': Board.clearPage(); break;
      case 'exit': Annot.exit(); this.show(this.side); break;
      case 'cast': Annot.exit(); this.hide(); go('cast'); break;
      case 'shot': Shot.take(); break;
      case 'close': this.hide(); break;
    }
  },
  /* ---------- popups ---------- */
  togglePop(name){ if(this.pop===name){ this.closePop(true); return; } this.openPop(name); },
  openPop(name){
    const B=Board;
    this.snap={color:B.color,ink:B.sizes.ink,shape:B.shape,shapeSize:B.sizes.shape,eraser:B.eraser,erSize:B.sizes.eraser,fill:B.fill,tool:B.tool,inst:B.inst.map(i=>i.kind)};
    this.pop=name;
    const el=$('#sidePop'); el.hidden=false; el.className='side-'+this.side;
    el.innerHTML=this.popHTML(name)+`<div class="sp-btns"><button class="btn sm ghost" data-sopt="cancel">${icon('x')}إلغاء</button><button class="btn sm primary" data-sopt="ok">${icon('check')}تطبيق</button></div>`;
    $$('#sidePop input[type=range]').forEach(r=>setRangeFill(r));
    const r=$('#sidePanel').getBoundingClientRect(), pw=el.offsetWidth, ph=el.offsetHeight;
    let left,top;
    if(S.sideDir==='h'){ left=clamp(r.left+r.width/2-pw/2,8,innerWidth-pw-8); top=r.top>innerHeight/2?r.top-ph-10:r.bottom+10; }
    else { left=r.left>innerWidth/2?r.left-pw-10:r.right+10; top=clamp(r.top,8,innerHeight-ph-8); }
    el.style.left=clamp(left,8,Math.max(8,innerWidth-pw-8))+'px'; el.style.top=clamp(top,8,Math.max(8,innerHeight-ph-8))+'px';
  },
  closePop(revert){
    if(revert&&this.snap){ const B=Board, s=this.snap;
      Object.assign(B,{color:s.color,shape:s.shape,eraser:s.eraser,fill:s.fill});
      B.sizes.ink=s.ink; B.sizes.shape=s.shapeSize; B.sizes.eraser=s.erSize;
      if(B.tool!==s.tool) B.setTool(s.tool);
      if(B.inst.map(i=>i.kind).join()!==s.inst.join()){ B.inst=B.inst.filter(i=>s.inst.includes(i.kind)); B.renderInst(); }
      B.syncColors(); B.syncSize(); B.redraw&&B.redraw();
    }
    this.snap=null; this.pop=null; const el=$('#sidePop'); if(el) el.hidden=true;
    if(this.open) this.show(this.side);
  },
  popHTML(name){
    const B=Board;
    const colors=()=>`<div class="sp-colors">${SIDE_COLORS.map(c=>`<button class="sp-c${c===B.color?' on':''}" data-sopt="color" data-c="${c}" style="--c:${c}"></button>`).join('')}
      <button class="sp-c wheel" data-sopt="wheel" title="كل الألوان"></button></div>`;
    const size=(k,v,max)=>`<div class="sp-row"><span>السُمك</span><input type="range" data-k="${k}" min="1" max="${max}" value="${v}"><b id="spSzV">${nf(v)}</b></div>`;
    switch(name){
      case 'pen': return `<h5>${icon('pen')}القلم</h5>${colors()}${size('ink',B.sizes.ink,40)}`;
      case 'eraser': return `<h5>${icon('eraser')}الممحاة</h5>
        <div class="sp-opts"><button class="sp-o${B.eraser==='pixel'?' on':''}" data-sopt="er" data-v="pixel">${icon('eraser')}ممحاة عادية</button>
        <button class="sp-o${B.eraser==='object'?' on':''}" data-sopt="er" data-v="object">${icon('objErase')}تمسح الخط كامل</button></div>${size('eraser',B.sizes.eraser,220)}`;
      case 'shapes': return `<h5>${icon('shapes')}الأشكال</h5>
        <div class="sp-opts">${SIDE_SHAPES.map(([k,t,i])=>`<button class="sp-o${B.shape===k?' on':''}" data-sopt="shape" data-v="${k}">${icon(i)}${t}</button>`).join('')}</div>
        <div class="sp-opts"><button class="sp-o${B.fill?' on':''}" data-sopt="fill">${icon('fill')}تعبئة الشكل</button></div>${colors()}`;
      case 'geo': return `<h5>${icon('setsq')}أدوات هندسية</h5><div class="sp-opts">
        ${Object.entries(INST_DEF).map(([k,d])=>`<button class="sp-o${B.inst.some(i=>i.kind===k)?' on':''}" data-sopt="geo" data-v="${k}">${icon(d.i)}${d.n}</button>`).join('')}
        <button class="sp-o${B.tool==='compass'?' on':''}" data-sopt="geo" data-v="compass">${icon('compass')}فرجال</button>
        <button class="sp-o" data-sopt="geo" data-v="axes">${icon('axes')}محاور</button>
        <button class="sp-o" data-sopt="geo" data-v="hide">${icon('x')}إخفاء الأدوات</button></div>`;
    }
    return '';
  },
  async optClick(a,b){
    const B=Board, v=b.dataset.v;
    if(a==='ok'){ this.snap=null; this.closePop(); return; }
    if(a==='cancel'){ this.closePop(true); return; }
    if(a==='color'){ B.setColor(b.dataset.c); if(B.tool!=='shape') B.setTool('ink'); this.openPop(this.pop); return; }
    if(a==='wheel'){ const c=await pickColorModal('لون القلم',B.color); if(c){ B.setColor(c); pushRecent(c); } this.openPop(this.pop); return; }
    if(a==='er'){ B.eraser=v; B.setTool('eraser'); this.openPop('eraser'); return; }
    if(a==='shape'){ B.shape=v; B.setTool('shape'); this.openPop('shapes'); return; }
    if(a==='fill'){ B.fill=!B.fill; this.openPop('shapes'); return; }
    if(a==='geo'){
      if(v==='compass'){ B.setTool('compass'); toast('فرجال: اضغط على المركز واسحب'); }
      else if(v==='axes') B.addAxes();
      else if(v==='hide'){ B.inst=[]; B.renderInst(); }
      else B.addInst(v);
      this.openPop('geo'); return;
    }
  }
};

/* ---------- draw over the frozen screen ---------- */
const Annot={
  on:false, prev:null, doc:null,
  enter(){
    if(this.on) return;
    this.prev=current;
    this.doc={pages:Board.pages,pi:Board.pi};
    Board.pages=[Board.newPage({type:'none'})]; Board.pi=0;
    Board.overlay=true;
    document.documentElement.classList.add('annot');
    const b=$('#board'); b.classList.add('on','annot-mode');
    Board.setTool('ink');
    requestAnimationFrame(()=>{ Board.resize(); Board.goPage(0); });
    this.on=true;
    toast('وضع الكتابة فوق الشاشة — الصفحة مجمّدة، اكتب بأي مكان');
  },
  exit(){
    if(!this.on) return;
    this.on=false;
    Board.closePop&&Board.closePop();
    Board.inst=[]; Board.renderInst();
    Board.pages=this.doc.pages; Board.pi=this.doc.pi; this.doc=null;
    Board.overlay=false;
    document.documentElement.classList.remove('annot');
    const b=$('#board'); b.classList.remove('annot-mode');
    if(this.prev!=='board') b.classList.remove('on');
    requestAnimationFrame(()=>{ Board.resize(); Board.goPage(Board.pi); });
  }
};

/* ---------- screenshot ---------- */
const Shot={
  busy:false,
  async take(){
    if(this.busy) return; this.busy=true;
    const panelWasOpen=Side.open;
    Side.closePop(); $('#sidePanel').hidden=true; const el=$('#btReq'); const cardWas=el.hidden; el.hidden=true;
    await new Promise(r=>setTimeout(r,260));
    try{
      if(window.Native&&Native.on){
        const r=await API.post('/api/screenshot',{});
        this.done(r.path,r.name);
      } else {
        const url=Board.overlay?$('#bdBase').toDataURL('image/png'):($('#bdBase')?$('#bdBase').toDataURL('image/png'):null);
        if(url) downloadURL(url,'لقطة-'+Date.now()+'.png');
        toast('تم حفظ اللقطة (معاينة المتصفح تحفظ الرسم فقط)');
      }
    }catch(e){ toast('تعذر حفظ اللقطة: '+(window.errMsg?errMsg(e):e),false); }
    finally{
      this.busy=false; if(!cardWas) el.hidden=false;
      if(panelWasOpen) Side.show(Side.side);
    }
  },
  done(path,name){
    beep(1,1200);
    const el=$('#btReq'); el.hidden=false; el.classList.add('xfer');
    el.innerHTML=`<div class="hd"><span class="ic" style="background:var(--ok)">${icon('camera')}</span>
        <div class="grow"><b>تم حفظ لقطة الشاشة</b><div class="hint">محفوظة في مجلد «الصور»</div></div>
        <button class="icon-btn sm" data-shot="hide">${icon('x')}</button></div>
      <div class="fn">${esc(name||'')}</div>
      <div class="btns" style="margin-top:14px;justify-content:flex-end"><button class="btn ghost" data-shot="folder">${icon('folder')}فتح المجلد</button><button class="btn primary" data-shot="open">فتح الصورة</button></div>`;
    el.onclick=e=>{ const b=e.target.closest('[data-shot]'); if(!b) return; el.hidden=true;
      if(b.dataset.shot==='folder'){ go('files'); Files.open('internal','pics'); }
      if(b.dataset.shot==='open'&&path) openFile(nodeOf({path,name:name||path.split('/').pop(),size:0,mtime:Date.now()})); };
    clearTimeout(this.hideT); this.hideT=setTimeout(()=>{ el.hidden=true; },12000);
  }
};
