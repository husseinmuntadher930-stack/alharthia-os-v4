  /* ---------- dock, tools, popovers ---------- */
  setTool(t){
    if(this.txt) this.closeText();
    if(this.eyedrop) this.setEyedrop(false);
    this.tool=t;
    $$('#boardDock [data-tool]').forEach(b=>b.classList.toggle('on',b.dataset.tool===t));
    $('#dGeo').classList.toggle('on',t==='compass');
    this.area.className='t-'+t;
    if(t!=='select') this.setSel([]); else this.updateSelUI();
    this.syncUI();
  },
  sizeCat(){ return this.tool==='eraser'?'eraser':this.tool==='text'?'text':(this.tool==='shape'?'shape':(this.tool==='ink'&&this.pen==='hl'?'hl':'ink')); },
  syncUI(){
    const pk=PEN_KINDS.find(k=>k[0]===this.pen);
    $('#dPen svg').innerHTML=ICONS[pk[2]]; $('#dPen .lb').textContent=pk[1];
    $('#dEraser svg').innerHTML=ICONS[this.eraser==='object'?'objErase':'eraser']; $('#dEraser .lb').textContent=this.eraser==='object'?'ممحاة أشكال':'ممحاة';
    $('#dShape svg').innerHTML=ICONS[this.shape];
    $('#dAssist').classList.toggle('on',this.assist);
    this.syncColors(); this.syncSize(); this.changed();
  },
  syncColors(){
    const dark=bgIsDark(this.page.bg), pal=dark?QUICK_DARK:QUICK_LIGHT, other=dark?QUICK_LIGHT:QUICK_DARK;
    const oi=other.indexOf(this.color); if(oi>=0) this.color=pal[oi];
    $('#dSw').innerHTML=pal.map(c=>`<button class="swc${c===this.color?' on':''}" data-color="${c}" style="--c:${c}" aria-label="لون"></button>`).join('')+
      `<button class="swc wheel${pal.includes(this.color)?'':' on'}" data-pop="color" style="--cur:${this.color}" title="كل الألوان" aria-label="كل الألوان"></button>`;
    this.syncSize();
  },
  syncSize(){
    const cat=this.sizeCat(), v=this.sizes[cat], i=$('#dSize .sizeprev i'), px=clamp(cat==='text'?v/2.4:cat==='eraser'?v/2.2:v,3,32);
    Object.assign(i.style,{width:px+'px',height:px+'px',background:cat==='eraser'?'transparent':this.color,border:cat==='eraser'?'2px solid var(--text-2)':(this.color.toLowerCase()==='#ffffff'?'1px solid #94a3b8':'0'),opacity:cat==='hl'?.5:1});
  },
  setColor(c,noSwitch){
    this.color=c;
    if(!noSwitch&&(this.tool==='eraser'||(this.tool==='select'&&!this.sel.length))) this.setTool('ink');
    if(this.txt){ this.txt.color=c; this.txt.ed.style.color=c; }
    this.syncColors();
  },
  bindDock(){
    $('#boardDock').addEventListener('click',e=>{
      const b=e.target.closest('button'); if(!b||b.dataset.go) return;
      if(b.dataset.color){
        const c=b.dataset.color;
        if(this.tool==='select'&&this.sel.length){ const items=this.selItems(), before=items.map(cloneItem); items.forEach(it=>{if(it.t!=='img')it.c=c;}); this.record({type:'xform',before,after:items.map(cloneItem)}); this.redraw(); this.setColor(c,true); }
        else this.setColor(c);
        return;
      }
      const tool=b.dataset.tool, pop=b.dataset.pop;
      if(tool){ if(this.tool===tool&&pop) this.togglePop(pop,b); else { this.setTool(tool); this.closePop(); } return; }
      if(pop){ this.togglePop(pop,b); return; }
      this.doAct(b.dataset.act);
    });
    $('#focusBtn').onclick=()=>this.doAct('focus');
    const pop=$('#bPop');
    pop.addEventListener('click',async e=>{
      const b=e.target.closest('[data-pen],[data-er],[data-shape],[data-fill],[data-geo],[data-sz],[data-bg],[data-fit],[data-all],[data-page],[data-pa],[data-save],[data-eyed]'); if(!b) return;
      const D=b.dataset;
      if(D.pen){ this.pen=D.pen; this.setTool('ink'); this.closePop(); }
      else if(D.er){ this.eraser=D.er; this.setTool('eraser'); this.openPop('eraser'); }
      else if(D.shape){ this.shape=D.shape; this.setTool('shape'); this.closePop(); }
      else if(D.fill){ this.fill=!this.fill; this.openPop('shapes'); }
      else if(D.geo){ this.closePop();
        if(D.geo==='compass'){ this.setTool('compass'); toast('فرجال: اضغط على المركز واسحب لتحديد نصف القطر ثم لف'); }
        else if(D.geo==='axes') this.addAxes();
        else if(D.geo==='hide'){ this.inst=[]; this.renderInst(); }
        else this.addInst(D.geo); }
      else if(D.sz){ this.sizes[this.sizeCat()]=+D.sz; this.syncSize(); this.openPop(this.popName); }
      else if(D.bg){
        if(D.bg==='color'){ this.closePop(); const c=await pickColorModal('لون السبورة',this.page.bg.color||'#fef3c7'); if(c) this.setBg({type:'color',color:c}); }
        else if(D.bg==='image'){ this.closePop(); $('#bBgFile').click(); }
        else { this.setBg({type:D.bg}); this.openPop('bg'); }
      }
      else if(D.fit){ this.setBg({...this.page.bg,fit:D.fit}); this.openPop('bg'); }
      else if(D.all){ this.setBg(this.page.bg,true); toast('تم تطبيق نوع السبورة على كل الصفحات'); this.closePop(); }
      else if(D.page){ this.goPage(+D.page); this.closePop(); }
      else if(D.pa){ this.closePop();
        if(D.pa==='new') this.addPage(false); if(D.pa==='dup') this.addPage(true);
        if(D.pa==='del'&&await confirmBox('حذف الصفحة','راح تنحذف الصفحة الحالية وكل ما عليها.','حذف',true,'trash')) this.delPage();
        if(D.pa==='clear') this.clearPage(); }
      else if(D.save){ this.closePop(); this.save(D.save); }
      else if(D.eyed){ this.closePop(); this.setEyedrop(true); }
    });
    pop.addEventListener('input',e=>{ if(e.target.id==='szRange'){ this.sizes[this.sizeCat()]=+e.target.value; setRangeFill(e.target); this.syncSize(); $('#szVal').textContent=nf(e.target.value); this.drawSizePrev(); } });
  },
  doAct(a){
    switch(a){
      case 'image': $('#bImgFile').click(); break;
      case 'assist': this.assist=!this.assist; this.syncUI(); toast(this.assist?'مساعد الخط المستقيم مفعّل — الخطوط والأشكال تتعدل تلقائياً':'تم إيقاف مساعد الخط المستقيم'); break;
      case 'eyedrop': this.setEyedrop(!this.eyedrop); break;
      case 'undo': this.undo(); break;
      case 'redo': this.redo(); break;
      case 'clear': this.clearPage(); break;
      case 'prev': this.goPage(this.pi-1); break;
      case 'next': this.goPage(this.pi+1); break;
      case 'add': this.addPage(false); break;
      case 'full': toggleFullscreen(); break;
      case 'focus': $('#board').classList.toggle('focus'); this.closePop(); break;
    }
  },
  closePop(){ const p=$('#bPop'); if(p){ p.hidden=true; this.popName=null; } $$('#boardDock .dbtn.pop-open').forEach(b=>b.classList.remove('pop-open')); },
  togglePop(name,anchor){ if(this.popName===name){ this.closePop(); return; } this.anchor=anchor; this.openPop(name); },
  openPop(name){
    const pop=$('#bPop'); this.popName=name; pop.innerHTML=this.popHTML(name); pop.hidden=false;
    if(name==='color'){ colorPicker($('#cpBoard'),this.color,c=>{ this.setColor(c); clearTimeout(this.rcT); this.rcT=setTimeout(()=>pushRecent(c),600); }); }
    if(name==='bg') $$('#bPop .bgo canvas').forEach(cv=>{ const t=cv.dataset.t; this.thumbBg(cv,t==='__cur'?this.page.bg:{type:t,color:'#fde68a'}); });
    if(name==='pages') $$('#bPop .pgt canvas').forEach(cv=>this.renderThumb(cv,this.pages[+cv.dataset.i]));
    if(name==='size'){ setRangeFill($('#szRange')); this.drawSizePrev(); }
    const board=$('#board').getBoundingClientRect(), dock=$('#boardDock').getBoundingClientRect(), a=(this.anchor||$('#dPen')).getBoundingClientRect();
    pop.style.bottom=(board.bottom-dock.top+10)+'px';
    const pw=pop.offsetWidth; pop.style.left=clamp(a.left+a.width/2-pw/2-board.left,10,board.width-pw-10)+'px';
  },
  drawSizePrev(){
    const cv=$('#szPrev'); if(!cv) return; const x=cv.getContext('2d'), cat=this.sizeCat(), v=this.sizes[cat], d=devicePixelRatio||1;
    cv.width=260*d; cv.height=70*d; x.scale(d,d); x.clearRect(0,0,260,70);
    const k=this.W/REF, w=v*k;
    if(cat==='text'){ x.fillStyle=this.color; x.font=`500 ${Math.min(60,v*k)}px ${UIFONT}`; x.textAlign='center'; x.textBaseline='middle'; x.fillText('نص تجريبي',130,36); return; }
    const s={t:'ink',k:cat==='eraser'?'pen':(cat==='hl'?'hl':this.pen==='laser'?'pen':this.pen),c:cat==='eraser'?'#94a3b8':this.color,w:w/260,p:[]};
    for(let i=0;i<=40;i++){ const t=i/40; s.p.push([(20+t*220)/260,(35+Math.sin(t*Math.PI*2)*14)/260,s.k==='fountain'?.6+.6*Math.sin(t*Math.PI):1]); }
    drawInk(x,s,260);
  },
  thumbBg(cv,bg){ const VW=560,VH=348, x=cv.getContext('2d'); cv.width=200; cv.height=124; x.setTransform(200/VW,0,0,200/VW,0,0); drawBg(x,bg,VW,VH,()=>this.thumbBg(cv,bg)); },
  renderPage(page,scale,W=this.W,H=this.H){
    const c=document.createElement('canvas'); c.width=Math.round(W*scale); c.height=Math.round(H*scale);
    const x=c.getContext('2d'); x.setTransform(scale,0,0,scale,0,0); drawBg(x,page.bg,W,H);
    const o=document.createElement('canvas'); o.width=c.width; o.height=c.height; const ox=o.getContext('2d'); ox.setTransform(scale,0,0,scale,0,0);
    for(const it of page.items) drawItem(ox,it,W);
    x.setTransform(1,0,0,1,0,0); x.drawImage(o,0,0); return c;
  },
  renderThumb(cv,page){ const r=this.renderPage(page,300/this.W); cv.width=r.width; cv.height=r.height; cv.getContext('2d').drawImage(r,0,0); },
  popHTML(n){
    const on=(a,b)=>a===b?' on':'';
    switch(n){
      case 'pens': return `<h5>${icon('pen')}نوع القلم</h5><div class="opt-grid" style="width:min(470px,90vw)">${PEN_KINDS.map(([k,t,i])=>`<button class="opt${on(k,this.pen)}" data-pen="${k}">${icon(i)}${t}</button>`).join('')}</div>`;
      case 'eraser': return `<h5>${icon('eraser')}نوع الممحاة</h5><div class="opt-grid" style="width:min(360px,90vw)">
          <button class="opt${on('pixel',this.eraser)}" data-er="pixel">${icon('eraser')}ممحاة عادية</button>
          <button class="opt${on('object',this.eraser)}" data-er="object">${icon('objErase')}ممحاة الأشكال</button>
          <button class="opt" data-pa="clear">${icon('trash')}مسح الصفحة</button></div>
          <h5>الحجم</h5>${this.sizeRow('eraser')}`;
      case 'shapes': return `<h5>${icon('shapes')}الأشكال</h5><div class="opt-grid" style="width:min(520px,90vw)">${SHAPE_KINDS.map(([k,t])=>`<button class="opt${on(k,this.shape)}" data-shape="${k}">${icon(k)}${t}</button>`).join('')}</div>
          <div class="chips" style="margin-top:12px"><button class="chip${this.fill?' on':''}" data-fill="1">${icon('fill')}تعبئة الشكل</button><span class="hint" style="align-self:center">فعّل «خط مستقيم» حتى تثبت الزوايا والمربعات</span></div>`;
      case 'geo': return `<h5>${icon('setsq')}أدوات هندسية</h5><div class="opt-grid" style="width:min(470px,90vw)">
          ${Object.entries(INST_DEF).map(([k,d])=>`<button class="opt${this.inst.some(i=>i.kind===k)?' on':''}" data-geo="${k}">${icon(d.i)}${d.n}</button>`).join('')}
          <button class="opt${this.tool==='compass'?' on':''}" data-geo="compass">${icon('compass')}فرجال</button>
          <button class="opt" data-geo="axes">${icon('axes')}محاور إحداثية</button></div>
          <p class="hint" style="margin:10px 4px 0;max-width:440px">ارسم بالقلم بمحاذاة حافة المسطرة أو المثلث وراح يطلع الخط مستقيم تماماً. حرّك الأداة بالسحب ولفّها من الزر البرتقالي.</p>
          ${this.inst.length?`<div class="btns" style="margin-top:10px"><button class="btn sm ghost" data-geo="hide">${icon('x')}إخفاء كل الأدوات</button></div>`:''}`;
      case 'size': { const cat=this.sizeCat(); return `<h5>${icon('pen')}${{ink:'سُمك القلم',hl:'سُمك قلم التظليل',eraser:'حجم الممحاة',shape:'سُمك خط الأشكال',text:'حجم الخط'}[cat]}</h5>${this.sizeRow(cat)}`; }
      case 'color': return `<h5>${icon('palette')}اختيار اللون</h5><div id="cpBoard" style="width:min(560px,86vw)"></div>
          <div class="btns" style="margin-top:10px"><button class="btn sm" data-eyed="1">${icon('eyedrop')}التقاط لون من السبورة</button></div>`;
      case 'bg': { const cur=this.page.bg.type; return `<h5>${icon('grid')}نوع السبورة</h5><div class="bg-grid" style="width:min(640px,90vw)">
          ${BG_TYPES.map(([k,t])=>`<button class="bgo${on(k,cur)}" data-bg="${k}"><canvas data-t="${k}"></canvas>${t}</button>`).join('')}
          <button class="bgo${on('color',cur)}" data-bg="color"><canvas data-t="${cur==='color'?'__cur':'color'}"></canvas>لون مخصص</button>
          <button class="bgo${on('image',cur)}" data-bg="image">${cur==='image'?'<canvas data-t="__cur"></canvas>':`<span style="width:100px;height:62px;border-radius:10px;border:1.5px dashed var(--line);display:grid;place-items:center;font-size:26px;color:var(--muted)">${icon('upload')}</span>`}صورة من الجهاز</button></div>
          ${cur==='image'?`<div class="chips" style="margin-top:10px"><button class="chip${this.page.bg.fit!=='contain'?' on':''}" data-fit="cover">ملء السبورة</button><button class="chip${this.page.bg.fit==='contain'?' on':''}" data-fit="contain">إظهار الصورة كاملة</button><button class="chip" data-bg="image">${icon('upload')}تغيير الصورة</button></div>`:''}
          <div class="btns" style="margin-top:12px"><button class="btn sm ghost" data-all="1">${icon('copy')}تطبيق على كل الصفحات</button></div>`; }
      case 'pages': return `<h5>${icon('pages')}الصفحات (${nf(this.pages.length)})</h5><div class="page-grid">${this.pages.map((p,i)=>`<button class="pgt${i===this.pi?' on':''}" data-page="${i}"><canvas data-i="${i}"></canvas>صفحة ${nf(i+1)}</button>`).join('')}</div>
          <div class="btns" style="margin-top:12px"><button class="btn sm primary" data-pa="new">${icon('plus')}صفحة جديدة</button><button class="btn sm" data-pa="dup">${icon('copy')}تكرار الصفحة</button><button class="btn sm danger" data-pa="del">${icon('trash')}حذف الصفحة</button></div>`;
      case 'save': return `<h5>${icon('save')}حفظ وتصدير</h5><div class="opt-grid" style="width:min(400px,90vw)">
          <button class="opt" data-save="board">${icon('folder')}حفظ في الملفات</button>
          <button class="opt" data-save="png">${icon('image')}صورة PNG</button>
          <button class="opt" data-save="pdf">${icon('pdf')}ملف PDF (كل الصفحات)</button></div>`;
    }
    return '';
  },
  sizeRow(cat){
    const presets={ink:[2,4,7,12,20],hl:[14,22,32,46,64],eraser:[20,40,70,110,160],shape:[2,4,7,12,20],text:[28,40,56,80,120]}[cat];
    const max={ink:60,hl:100,eraser:220,shape:40,text:180}[cat], v=this.sizes[cat];
    return `<div class="size-row" style="width:min(460px,86vw)"><input type="range" id="szRange" min="1" max="${max}" value="${v}"><b id="szVal" style="min-width:36px;text-align:center">${nf(v)}</b></div>
      <div class="size-dots" style="margin-top:8px">${presets.map(p=>`<button data-sz="${p}" class="${p===v?'on':''}"><i style="width:${clamp(p/(max/30),3,30)}px;height:${clamp(p/(max/30),3,30)}px"></i></button>`).join('')}</div>
      <canvas id="szPrev" style="width:260px;height:70px;margin-top:8px;display:block;border-radius:12px;background:${bgIsDark(this.page.bg)?'#1f2937':'var(--surface-2)'}"></canvas>`;
  },
  async save(kind){
    const dt=new Date(), stamp=`${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
    if(kind==='board'){
      const name=await promptBox('اسم ملف السبورة',`سبورة ${S.cls.replace(/^الصف\s*/,'')} - ${shortDate()}`); if(!name) return;
      const data=this.exportData(), json=JSON.stringify(data);
      FS.add('boards',{name:name+'.board',type:'board',size:json.length,data});
      toast('تم الحفظ في «السبورات المحفوظة»');
    }
    if(kind==='png'){
      const c=this.renderPage(this.page,Math.max(2,this.d)); const x=c.getContext('2d');
      x.setTransform(c.width/this.W,0,0,c.width/this.W,0,0);
      x.font=`500 15px ${UIFONT}`; x.fillStyle=bgIsDark(this.page.bg)?'rgba(255,255,255,.6)':'rgba(19,37,87,.55)'; x.direction='rtl'; x.textAlign='right';
      x.fillText(`${S.school} — ${S.cls} — ${dateStr()}`,this.W-16,this.H-14);
      const url=c.toDataURL('image/png'), name=`سبورة-${stamp}-صفحة${this.pi+1}.png`;
      downloadURL(url,name); FS.add('boards',{name,type:'png',size:Math.round(url.length*.75),data:url});
      toast('تم تصدير الصفحة كصورة');
    }
    if(kind==='pdf'){
      toast('جاري تجهيز ملف PDF…');
      try{
        const PL=await lib('pdflib'); const doc=await PL.PDFDocument.create();
        for(const p of this.pages){ const c=this.renderPage(p,1.5); const u=c.toDataURL('image/jpeg',.9); const img=await doc.embedJpg(b64ToBuf(u.split(',')[1]));
          const pg=doc.addPage([this.W,this.H]); pg.drawImage(img,{x:0,y:0,width:this.W,height:this.H}); }
        const bytes=await doc.save(); const blob=new Blob([bytes],{type:'application/pdf'}); const url=URL.createObjectURL(blob), name=`سبورة-${stamp}.pdf`;
        downloadURL(url,name); FS.add('boards',{name,type:'pdf',size:bytes.length,blob});
        toast('تم تصدير كل الصفحات كملف PDF');
      }catch(e){ toast('تعذر تحميل مكتبة PDF — تحتاج إنترنت بهاي المعاينة',false); }
    }
  }
};
window.Board=Board;
onShow.board=()=>{ Board.resize(); Board.changed(); };
onHide.board=()=>{ if(Board.txt) Board.closeText(); Board.persist(); };
