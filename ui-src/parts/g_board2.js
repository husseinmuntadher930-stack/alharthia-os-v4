
/* =====================================================================
   WHITEBOARD — controller
   ===================================================================== */
const PEN_KINDS=[['pen','قلم عادي','pen'],['fountain','قلم حبر','fountain'],['callig','قلم خط عربي','nib'],['hl','قلم تظليل','marker'],['laser','قلم ليزر','laser']];
const SHAPE_KINDS=[['line','خط'],['semi','نصف دائرة'],['dline','خط متقطع'],['arrow','سهم'],['darrow','سهم مزدوج'],['rect','مستطيل'],['circle','دائرة'],['ellipse','بيضوي'],['triangle','مثلث'],['rtri','مثلث قائم'],['diamond','معيّن'],['pentagon','خماسي'],['hexagon','سداسي'],['star','نجمة']];
const INST_DEF={
  ruler:{n:'مسطرة ٣٠ سم',i:'ruler',w:30*PXCM+48,h:92},
  sq45:{n:'مثلث قائم ٤٥°',i:'setsq',w:16*PXCM,h:16*PXCM},
  sq30:{n:'مثلث ٣٠°-٦٠°',i:'setsq30',w:18*PXCM,h:18*PXCM*Math.tan(Math.PI/6)},
  prot:{n:'منقلة',i:'protractor',w:2*9*PXCM+70,h:9*PXCM+64}
};
const Board={
  pages:[], pi:0, tool:'ink', pen:'pen', eraser:'pixel', shape:'rect', fill:false,
  color:'#111827', sizes:{ink:5,hl:26,eraser:44,shape:5,text:44},
  assist:false, eyedrop:false, act:new Map(), trails:[], inst:[], sel:[], raf:0, W:1, H:1, d:1,
  newPage(bg){ return {id:uid(),bg:bg?structuredClone(bg):{type:S.boardBg},items:[],undo:[],redo:[]}; },
  get page(){ return this.pages[this.pi]; },
  init(){
    this.area=$('#boardArea'); this.cBg=$('#bdBg'); this.cBase=$('#bdBase'); this.cLive=$('#bdLive');
    this.xBg=this.cBg.getContext('2d'); this.xBase=this.cBase.getContext('2d');
    this.xLive=this.cLive.getContext('2d',{desynchronized:true})||this.cLive.getContext('2d');
    this.assist=!!S.assistDef;
    const saved=S.autosave&&store.get('board',null);
    if(saved&&saved.pages&&saved.pages.length){ this.pages=saved.pages.map(p=>({id:p.id||uid(),bg:p.bg||{type:'white'},items:p.items||[],undo:[],redo:[]})); this.pi=clamp(saved.pi|0,0,this.pages.length-1); }
    else this.pages=[this.newPage()];
    const lv=this.cLive;
    lv.addEventListener('pointerdown',e=>this.down(e));
    lv.addEventListener('pointermove',e=>this.move(e));
    for(const t of ['pointerup','pointercancel']) lv.addEventListener(t,e=>this.up(e,t==='pointercancel'));
    lv.addEventListener('contextmenu',e=>e.preventDefault());
    new ResizeObserver(()=>this.resize()).observe(this.area);
    const watch=()=>{ try{ matchMedia(`(resolution: ${devicePixelRatio}dppx)`).addEventListener('change',()=>{this.resize(true);watch();},{once:true}); }catch(e){} };
    watch();
    this.bindDock(); this.bindSelection();
    $('#bImgFile').onchange=e=>{const f=e.target.files[0]; if(f) this.insertImage(f); e.target.value='';};
    $('#bBgFile').onchange=async e=>{const f=e.target.files[0]; e.target.value=''; if(!f) return;
      try{ const {url}=await shrinkImage(await readAsDataURL(f),2400,'image/jpeg',.88); this.setBg({type:'image',img:url,fit:'cover'}); toast('تم وضع الصورة كخلفية'); }catch(err){ toast('تعذر قراءة الصورة',false); } };
    this.syncUI();
  },
  /* ---------- canvas & rendering ---------- */
  resize(force){
    const w=Math.round(this.area.clientWidth), h=Math.round(this.area.clientHeight), d=Math.min(window.devicePixelRatio||1,3);
    if(!w||!h||(!force&&w===this.W&&h===this.H&&d===this.d)) return;
    this.W=w; this.H=h; this.d=d;
    for(const c of [this.cBg,this.cBase,this.cLive]){ c.width=Math.round(w*d); c.height=Math.round(h*d); c.style.width=w+'px'; c.style.height=h+'px'; }
    for(const x of [this.xBg,this.xBase,this.xLive]){ x.setTransform(d,0,0,d,0,0); x.imageSmoothingQuality='high'; }
    this.renderBg(); this.redraw(); this.layoutInst(); this.updateSelUI();
  },
  renderBg(){ if(this.overlay){ this.xBg.clearRect(-9e4,-9e4,2e5,2e5); this.area.style.background='transparent'; return; } drawBg(this.xBg,this.page.bg,this.W,this.H,()=>this.renderBg()); this.area.style.background=''; },
  redraw(exclude){
    const x=this.xBase; x.save(); x.setTransform(1,0,0,1,0,0); x.clearRect(0,0,this.cBase.width,this.cBase.height); x.restore();
    for(const it of this.page.items){ if(exclude&&exclude.has(it.id)) continue; if(it.t==='clear') continue; drawItem(x,it,this.W,()=>this.redraw()); }
  },
  sched(){ if(!this.raf) this.raf=requestAnimationFrame(()=>this.frame()); },
  frame(){
    this.raf=0; const x=this.xLive, W=this.W, k=W/REF;
    x.save(); x.setTransform(1,0,0,1,0,0); x.clearRect(0,0,this.cLive.width,this.cLive.height); x.restore();
    let again=false;
    for(const st of this.act.values()){
      if(st.kind==='ink') drawInk(x,st.s,W);
      else if(st.kind==='erase'){ this.eraseInc(st); const q=st.s.p[st.s.p.length-1]; this.cursorCircle(x,q,st.s.w*W/2); }
      else if(st.kind==='oerase'){ this.cursorCircle(x,st.last,st.r*W); }
      else if(st.kind==='shape'&&st.it){ drawShape(x,st.it,W); if(LINE_KINDS.has(st.it.k)) this.measureLabel(x,st.it.a,st.it.b); }
      else if(st.kind==='marquee'){}
      else if(st.kind==='compass') this.drawCompass(x,st);
      else if(st.kind==='xform'){ for(const it of this.page.items) if(st.ids.has(it.id)) drawItem(x,it,W); }
    }
    if(this.trails.length){
      const now=performance.now();
      this.trails=this.trails.filter(t=>t.live||t.pts.some(p=>now-p[2]<900));
      for(const t of this.trails){
        const pts=t.pts.filter(p=>now-p[2]<900); t.pts=pts; if(pts.length<1) continue;
        x.save(); x.lineCap='round'; x.lineJoin='round';
        for(let i=1;i<pts.length;i++){ const a=1-(now-pts[i][2])/900; if(a<=0) continue;
          x.globalAlpha=a; x.strokeStyle='rgba(239,68,68,.35)'; x.lineWidth=14*Math.max(k,.6); x.beginPath(); x.moveTo(pts[i-1][0]*W,pts[i-1][1]*W); x.lineTo(pts[i][0]*W,pts[i][1]*W); x.stroke();
          x.strokeStyle='#ef4444'; x.lineWidth=5*Math.max(k,.6); x.stroke(); }
        const l=pts[pts.length-1]; if(t.live){ x.globalAlpha=1; x.fillStyle='#ef4444'; x.shadowColor='#ef4444'; x.shadowBlur=16; x.beginPath(); x.arc(l[0]*W,l[1]*W,7*Math.max(k,.6),0,7); x.fill(); }
        x.restore();
      }
      again=this.trails.length>0;
    }
    if(again) this.sched();
  },
  cursorCircle(x,q,r){ const W=this.W; x.save(); x.beginPath(); x.arc(q[0]*W,q[1]*W,Math.max(4,r),0,7); x.fillStyle='rgba(240,112,62,.10)'; x.fill(); x.lineWidth=2; x.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--acc')||'#f0703e'; x.stroke(); x.restore(); },
  measureLabel(x,a,b){
    const W=this.W, k=W/REF, L=dist(a,b)*REF/PXCM; if(L<.3) return;
    let an=-Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI; if(an<0) an+=360;
    const txt=`${nf(L.toFixed(1))} سم  •  ${nf(Math.round(an))}°`;
    x.save(); x.font=`600 ${Math.max(13,15*k)}px ${UIFONT}`; const tw=x.measureText(txt).width;
    const px=b[0]*W+16, py=b[1]*W-34; x.fillStyle='rgba(19,37,87,.9)'; x.beginPath(); x.roundRect(px,py,tw+18,28,8); x.fill();
    x.fillStyle='#fff'; x.textBaseline='middle'; x.direction='rtl'; x.textAlign='right'; x.fillText(txt,px+tw+9,py+14); x.restore();
  },
  drawCompass(x,st){
    const W=this.W, c=[st.c[0]*W,st.c[1]*W], r=st.r*W; if(r<2) return;
    x.save(); x.strokeStyle=this.color; x.lineWidth=this.sizes.ink/REF*W; x.lineCap='round';
    if(st.a0!=null&&Math.abs(st.sweep)>.05){ x.beginPath(); x.arc(c[0],c[1],r,Math.min(st.a0,st.a0+st.sweep),Math.max(st.a0,st.a0+st.sweep)); x.stroke(); }
    x.setLineDash([6,6]); x.lineWidth=1.5; x.strokeStyle='rgba(100,116,139,.8)'; x.beginPath(); x.arc(c[0],c[1],r,0,Math.PI*2); x.stroke();
    x.beginPath(); x.moveTo(c[0],c[1]); x.lineTo(st.p[0]*W,st.p[1]*W); x.stroke(); x.setLineDash([]);
    x.fillStyle='#132557'; x.beginPath(); x.arc(c[0],c[1],4,0,7); x.fill();
    const txt=`نق = ${nf((st.r*REF/PXCM).toFixed(1))} سم`; x.font=`600 15px ${UIFONT}`; const tw=x.measureText(txt).width;
    x.fillStyle='rgba(19,37,87,.9)'; x.beginPath(); x.roundRect(c[0]-tw/2-9,c[1]-44,tw+18,28,8); x.fill();
    x.fillStyle='#fff'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(txt,c[0],c[1]-30); x.restore();
  },
  /* ---------- input ---------- */
  pt(e){ const r=this.rect||this.cLive.getBoundingClientRect(); return [(e.clientX-r.left)/this.W,(e.clientY-r.top)/this.W]; },
  down(e){
    if(e.pointerType==='mouse'&&e.button!==0) return;
    this.closePop();
    this.rect=this.cLive.getBoundingClientRect();
    const p=this.pt(e);
    if(this.eyedrop){ this.sampleColor(p); return; }
    const touch=e.pointerType==='touch';
    if(touch&&S.palm&&(e.width>55||e.height>55)) return;
    if(touch&&S.penOnly&&this.tool!=='select') return;
    e.preventDefault();
    try{ this.cLive.setPointerCapture(e.pointerId); }catch(_){}
    const W=this.W, id=e.pointerId;
    if(this.tool!=='select'&&this.sel.length) this.setSel([]);
    switch(this.tool){
      case 'ink': {
        if(this.pen==='laser'){ const t={pts:[[p[0],p[1],performance.now()]],live:true}; this.trails.push(t); this.act.set(id,{kind:'laser',t}); break; }
        const snap=this.findSnap(p); const q=snap?this.projectSnap(snap,p):p;
        const w=(this.pen==='hl'?this.sizes.hl:this.sizes.ink)/REF;
        const s={id:uid(),t:'ink',k:this.pen,c:this.color,w,p:[[q[0],q[1],1]]};
        this.act.set(id,{kind:'ink',s,sm:q.slice(),lt:e.timeStamp,f:1,snap,raw:q}); break;
      }
      case 'eraser': {
        if(this.eraser==='object'){ this.act.set(id,{kind:'oerase',last:p,r:this.sizes.eraser/REF/2,removed:[]}); this.objErase(this.act.get(id),p); break; }
        const s={id:uid(),t:'ink',k:'eraser',c:'#000',w:this.sizes.eraser/REF,p:[[p[0],p[1],1]]};
        this.act.set(id,{kind:'erase',s,n:0}); break;
      }
      case 'shape': {
        const snap=this.findSnap(p); const q=snap?this.projectSnap(snap,p):p;
        this.act.set(id,{kind:'shape',a:q,snap,it:null}); break;
      }
      case 'compass': this.act.set(id,{kind:'compass',c:p,p,r:0,a0:null,sweep:0,prev:0}); break;
      case 'text': this.openText(p); return;
      case 'select': {
        const hit=this.hitTest(p);
        if(hit){ if(!this.sel.includes(hit.id)) this.setSel([hit.id]); this.beginXform('move',e); return; }
        this.setSel([]); this.act.set(id,{kind:'marquee',a:p,b:p}); break;
      }
    }
    this.sched();
  },
  move(e){
    const st=this.act.get(e.pointerId); if(!st) return;
    const evs=(e.getCoalescedEvents&&e.getCoalescedEvents())||[]; const list=evs.length?evs:[e];
    const W=this.W;
    if(st.kind==='ink'){
      const s=st.s, sm=S.smooth;
      for(const ev of list){
        let q=this.pt(ev); if(st.snap) q=this.projectSnap(st.snap,q);
        st.raw=q;
        const k=st.snap?0:sm; st.sm[0]+= (q[0]-st.sm[0])*(1-k); st.sm[1]+=(q[1]-st.sm[1])*(1-k);
        const last=s.p[s.p.length-1], dpx=Math.hypot(st.sm[0]-last[0],st.sm[1]-last[1])*W;
        if(dpx<.7) continue;
        let f=1;
        if(s.k==='fountain'){
          const pr=ev.pointerType==='pen'&&ev.pressure>0?ev.pressure:null;
          const dt=Math.max(1,ev.timeStamp-st.lt), v=dpx/dt;
          const target=pr!=null&&pr!==.5?.3+pr*1.25:clamp(1.35-v*.42,.42,1.35);
          f=st.f+(target-st.f)*.28;
        } else if(s.k==='callig'){
          const th=Math.atan2(st.sm[1]-last[1],st.sm[0]-last[0]), target=.16+.84*Math.abs(Math.sin(th-70*Math.PI/180));
          f=st.f+(target-st.f)*.35;
        }
        st.f=f; st.lt=ev.timeStamp;
        s.p.push([+st.sm[0].toFixed(5),+st.sm[1].toFixed(5),+f.toFixed(3)]);
      }
    } else if(st.kind==='erase'){
      for(const ev of list){ const q=this.pt(ev), l=st.s.p[st.s.p.length-1]; if(Math.hypot(q[0]-l[0],q[1]-l[1])*W<1) continue; st.s.p.push([q[0],q[1],1]); }
    } else if(st.kind==='oerase'){
      for(const ev of list){ const q=this.pt(ev); this.objErase(st,q); st.last=q; }
    } else if(st.kind==='laser'){
      for(const ev of list){ const q=this.pt(ev); st.t.pts.push([q[0],q[1],performance.now()]); }
    } else if(st.kind==='shape'){
      let b=this.pt(list[list.length-1]); if(st.snap) b=this.projectSnap(st.snap,b);
      st.it=this.makeShape(st.a,b,e.shiftKey);
    } else if(st.kind==='compass'){
      const p=this.pt(list[list.length-1]); st.p=p; st.r=dist(p,st.c);
      const a=Math.atan2(p[1]-st.c[1],p[0]-st.c[0]);
      if(st.a0==null){ if(st.r*W>12){st.a0=a;st.prev=a;} }
      else { let da=a-st.prev; if(da>Math.PI) da-=2*Math.PI; if(da<-Math.PI) da+=2*Math.PI; st.sweep+=da; st.prev=a; }
    } else if(st.kind==='xform'){ this.xformMove(st,list[list.length-1]); return;
    } else if(st.kind==='marquee'){
      st.b=this.pt(list[list.length-1]); const m=$('#marquee');
      const x0=Math.min(st.a[0],st.b[0])*W, y0=Math.min(st.a[1],st.b[1])*W;
      Object.assign(m.style,{left:x0+'px',top:y0+'px',width:Math.abs(st.b[0]-st.a[0])*W+'px',height:Math.abs(st.b[1]-st.a[1])*W+'px'}); m.hidden=false;
    }
    this.sched();
  },
  up(e,cancel){
    const st=this.act.get(e.pointerId); if(!st) return;
    this.act.delete(e.pointerId);
    const W=this.W;
    if(st.kind==='ink'){
      const s=st.s, l=s.p[s.p.length-1];
      if(!cancel&&Math.hypot(st.raw[0]-l[0],st.raw[1]-l[1])*W>.5) s.p.push([st.raw[0],st.raw[1],s.p.length>1?l[2]:1]);
      let out=s;
      if(this.assist&&!st.snap){ const r=recognize(s,W); if(r){ out=r; } }
      this.commitAdd([out]);
    } else if(st.kind==='erase'){ this.eraseInc(st); this.commitAdd([st.s],true); }
    else if(st.kind==='oerase'){ if(st.removed.length) this.record({type:'remove',entries:st.removed}); }
    else if(st.kind==='laser'){ st.t.live=false; }
    else if(st.kind==='shape'){ if(st.it){ const bb=itemBBox(st.it); if((bb[2]-bb[0])*W>6||(bb[3]-bb[1])*W>6) this.commitAdd([st.it]); } }
    else if(st.kind==='compass'){
      if(st.r*W>8){ let a0=0,a1=Math.PI*2; const sw=Math.abs(st.sweep);
        if(st.a0!=null&&sw>.35&&sw<Math.PI*2-.12){ a0=Math.min(st.a0,st.a0+st.sweep); a1=Math.max(st.a0,st.a0+st.sweep); }
        this.commitAdd([{id:uid(),t:'shape',k:'arc',cx:st.c[0],cy:st.c[1],r:st.r,a0,a1,c:this.color,w:this.sizes.ink/REF}]); }
    } else if(st.kind==='marquee'){
      $('#marquee').hidden=true;
      const x0=Math.min(st.a[0],st.b[0]),x1=Math.max(st.a[0],st.b[0]),y0=Math.min(st.a[1],st.b[1]),y1=Math.max(st.a[1],st.b[1]);
      if((x1-x0)*W>4||(y1-y0)*W>4) this.setSel(this.page.items.filter(it=>it.t!=='clear'&&it.k!=='eraser').filter(it=>{const b=itemBBox(it);return b[0]<x1&&b[2]>x0&&b[1]<y1&&b[3]>y0;}).map(it=>it.id));
    } else if(st.kind==='xform') this.endXform(st);
    this.sched();
  },
  eraseInc(st){
    const P=st.s.p, x=this.xBase, W=this.W; if(st.n>=P.length) return;
    x.save(); x.globalCompositeOperation='destination-out'; x.strokeStyle=x.fillStyle='#000'; x.lineWidth=st.s.w*W; x.lineCap='round'; x.lineJoin='round';
    x.beginPath(); const i0=Math.max(0,st.n-1); x.moveTo(P[i0][0]*W,P[i0][1]*W);
    if(P.length===1) x.lineTo(P[0][0]*W+.01,P[0][1]*W); for(let i=i0+1;i<P.length;i++) x.lineTo(P[i][0]*W,P[i][1]*W);
    x.stroke(); x.restore(); st.n=P.length;
  },
  objErase(st,p){
    const items=this.page.items; let changed=false;
    for(let i=items.length-1;i>=0;i--){ const it=items[i]; if(it.k==='eraser'||it.t==='clear') continue;
      if(itemHit(it,p,st.r)){ st.removed.push({it,idx:i}); items.splice(i,1); changed=true; } }
    if(changed){ st.removed.forEach((r,j)=>{}); this.redraw(); }
  },
  makeShape(a,b,sq){
    const base={id:uid(),t:'shape',k:this.shape,c:this.color,w:this.sizes.shape/REF,fill:this.fill,rot:0};
    if(LINE_KINDS.has(this.shape)){ if(this.assist||sq) b=snapAngle(a,b,this.assist?7:45); return {...base,a,b}; }
    let dx=b[0]-a[0], dy=b[1]-a[1];
    if(this.shape==='circle'||sq||this.shape==='axes'&&false){ const m=Math.max(Math.abs(dx),Math.abs(dy)); dx=Math.sign(dx||1)*m; dy=Math.sign(dy||1)*m; }
    else if(this.assist&&Math.abs(Math.abs(dx)-Math.abs(dy))<.1*Math.max(Math.abs(dx),Math.abs(dy))){ const m=Math.max(Math.abs(dx),Math.abs(dy)); dx=Math.sign(dx||1)*m; dy=Math.sign(dy||1)*m; }
    return {...base,bx:Math.min(a[0],a[0]+dx),by:Math.min(a[1],a[1]+dy),bw:Math.abs(dx),bh:Math.abs(dy)};
  },
  hitTest(p){ const tol=12/this.W; const it=this.page.items; for(let i=it.length-1;i>=0;i--){ if(it[i].k==='eraser'||it[i].t==='clear') continue; if(itemHit(it[i],p,tol)) return it[i]; } return null; },
  sampleColor(p){
    const d=this.d, W=this.W, c=document.createElement('canvas'); c.width=c.height=1; const x=c.getContext('2d');
    const sx=Math.floor(p[0]*W*d), sy=Math.floor(p[1]*W*d);
    x.drawImage(this.cBg,sx,sy,1,1,0,0,1,1); x.drawImage(this.cBase,sx,sy,1,1,0,0,1,1);
    const [r,g,b]=x.getImageData(0,0,1,1).data; const hex=rgb2hex([r,g,b]);
    this.setEyedrop(false); this.setColor(hex); toast('تم التقاط اللون '+hex.toUpperCase());
  },
  setEyedrop(on){ this.eyedrop=on; $('#dEye').classList.toggle('on',on); this.area.classList.toggle('t-eyedrop',on); if(on) toast('المس أي مكان بالسبورة لالتقاط لونه'); },
  /* ---------- history ---------- */
  record(op){ const p=this.page; p.undo.push(op); if(p.undo.length>200) p.undo.shift(); p.redo=[]; this.changed(); },
  commitAdd(items,noRedraw){ this.page.items.push(...items); this.record({type:'add',items}); if(!noRedraw) for(const it of items){ if(it.k==='eraser') continue; drawItem(this.xBase,it,this.W,()=>this.redraw()); } },
  applyOp(op,dir){
    const items=this.page.items, byId=id=>items.findIndex(i=>i.id===id);
    const undo=dir<0;
    switch(op.type){
      case 'add': if(undo){ const ids=new Set(op.items.map(i=>i.id)); this.page.items=items.filter(i=>!ids.has(i.id)); } else items.push(...op.items); break;
      case 'remove': if(undo){ [...op.entries].sort((a,b)=>a.idx-b.idx).forEach(e=>items.splice(e.idx,0,e.it)); } else { const ids=new Set(op.entries.map(e=>e.it.id)); this.page.items=items.filter(i=>!ids.has(i.id)); } break;
      case 'clear': this.page.items=undo?op.items.slice():[]; break;
      case 'xform': for(const it of (undo?op.before:op.after)){ const i=byId(it.id); if(i>=0) items[i]=cloneItem(it); } break;
      case 'order': this.page.items=(undo?op.before:op.after).slice(); break;
      case 'bg': this.page.bg=structuredClone(undo?op.before:op.after); this.renderBg(); break;
      case 'edit': { const target=undo?op.before:op.after, other=undo?op.after:op.before;
        if(other){ const i=byId(other.id); if(i>=0) items.splice(i,1); }
        if(target) items.splice(Math.min(op.idx,items.length),0,cloneItem(target)); break; }
    }
  },
  undo(){ const p=this.page, op=p.undo.pop(); if(!op) return; this.applyOp(op,-1); p.redo.push(op); this.setSel([]); this.redraw(); this.changed(); },
  redo(){ const p=this.page, op=p.redo.pop(); if(!op) return; this.applyOp(op,1); p.undo.push(op); this.setSel([]); this.redraw(); this.changed(); },
  clearPage(){ if(!this.page.items.length) return; const items=this.page.items.slice(); this.page.items=[]; this.record({type:'clear',items}); this.setSel([]); this.redraw(); toast('تم مسح الصفحة — اضغط «تراجع» للإرجاع'); },
  setBg(bg,all){
    if(all){ for(const p of this.pages) p.bg=structuredClone(bg); this.renderBg(); this.changed(); }
    else { const before=structuredClone(this.page.bg); this.page.bg=structuredClone(bg); this.record({type:'bg',before,after:bg}); this.renderBg(); }
    this.syncColors();
  },
  changed(){
    const p=this.page;
    $('#dUndo').disabled=!p.undo.length; $('#dRedo').disabled=!p.redo.length;
    $('#dPg').textContent=nf(this.pi+1)+'/'+nf(this.pages.length);
    $('#bInfo').textContent='صفحة '+nf(this.pi+1)+' من '+nf(this.pages.length);
    $('#dPrev').disabled=this.pi===0; $('#dNext').disabled=this.pi>=this.pages.length-1;
    this.schedulePersist();
  },
  schedulePersist(){ if(!S.autosave) return; clearTimeout(this.pt_); this.pt_=setTimeout(()=>this.persist(),1500); },
  persist(){
    if(!S.autosave) return;
    const ok=store.set('board',{pi:this.pi,pages:this.pages.map(p=>({id:p.id,bg:p.bg,items:p.items}))});
    if(!ok&&!this.warned){ this.warned=true; toast('الحفظ التلقائي ممتلئ (الصور كبيرة) — احفظ السبورة بالملفات',false); }
  },
  exportData(){ return {v:2,pi:this.pi,pages:this.pages.map(p=>({id:p.id,bg:p.bg,items:p.items}))}; },
  loadData(d){ this.pages=d.pages.map(p=>({id:uid(),bg:p.bg,items:structuredClone(p.items),undo:[],redo:[]})); this.goPage(0); },
  reset(){ store.del('board'); this.pages=[this.newPage()]; this.goPage(0); },
  goPage(i){ this.pi=clamp(i,0,this.pages.length-1); this.act.clear(); this.setSel([]); this.renderBg(); this.redraw(); this.changed(); this.syncColors(); },
  addPage(dup){ const bg=dup?this.page.bg:{type:S.boardBg}; const np=this.newPage(bg); if(dup) np.items=this.page.items.map(cloneItem); this.pages.splice(this.pi+1,0,np); this.goPage(this.pi+1); toast(dup?'تم تكرار الصفحة':'صفحة جديدة'); },
  delPage(){ if(this.pages.length===1){ this.pages[0]=this.newPage(); this.goPage(0); return; } this.pages.splice(this.pi,1); this.goPage(Math.min(this.pi,this.pages.length-1)); toast('تم حذف الصفحة'); },
