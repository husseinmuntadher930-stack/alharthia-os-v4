  /* ---------- selection ---------- */
  setSel(ids){ this.sel=ids; this.updateSelUI(); },
  selItems(){ const s=new Set(this.sel); return this.page.items.filter(i=>s.has(i.id)); },
  selBBox(){ let b=[Infinity,Infinity,-Infinity,-Infinity]; for(const it of this.selItems()){ const q=itemBBox(it); b=[Math.min(b[0],q[0]),Math.min(b[1],q[1]),Math.max(b[2],q[2]),Math.max(b[3],q[3])]; } return b; },
  updateSelUI(){
    const box=$('#selBox'), menu=$('#selMenu');
    if(!this.sel.length||this.tool!=='select'){ box.hidden=menu.hidden=true; return; }
    const W=this.W, b=this.selBBox(), pad=8;
    const L=b[0]*W-pad, T=b[1]*W-pad, w=(b[2]-b[0])*W+pad*2, h=(b[3]-b[1])*W+pad*2;
    Object.assign(box.style,{left:L+'px',top:T+'px',width:Math.max(24,w)+'px',height:Math.max(24,h)+'px'}); box.hidden=false;
    menu.hidden=false; const mw=menu.offsetWidth, mh=menu.offsetHeight;
    let my=T-mh-58; if(my<8) my=T+h+14; if(my+mh>this.H-8) my=Math.max(8,T+10);
    menu.style.left=clamp(L+w/2-mw/2,8,this.W-mw-8)+'px'; menu.style.top=my+'px';
  },
  bindSelection(){
    const box=$('#selBox');
    box.addEventListener('pointerdown',e=>{
      const h=e.target.closest('[data-h]'); const kind=h?(h.dataset.h==='rot'?'rot':'scale'):(e.target.closest('.body')?'move':null);
      if(!kind) return; e.preventDefault(); e.stopPropagation();
      this.rect=this.cLive.getBoundingClientRect(); this.beginXform(kind,e,h&&h.dataset.h,box);
    });
    const onMove=e=>{ const st=this.act.get(e.pointerId); if(st&&st.kind==='xform'){ this.xformMove(st,e); } };
    const onUp=e=>{ const st=this.act.get(e.pointerId); if(st&&st.kind==='xform'){ this.act.delete(e.pointerId); this.endXform(st); } };
    box.addEventListener('pointermove',onMove); box.addEventListener('pointerup',onUp); box.addEventListener('pointercancel',onUp);
    $('#selMenu').addEventListener('click',async e=>{
      const b=e.target.closest('[data-sel]'); if(!b) return; const a=b.dataset.sel, items=this.selItems();
      if(a==='del'){ const entries=[]; this.page.items.forEach((it,idx)=>{ if(this.sel.includes(it.id)) entries.push({it,idx}); }); this.page.items=this.page.items.filter(i=>!this.sel.includes(i.id)); this.record({type:'remove',entries}); this.setSel([]); this.redraw(); }
      if(a==='dup'){ const off=24/this.W; const cl=items.map(it=>{const c=cloneItem(it);c.id=uid();xformItem(c,(x,y)=>[x+off,y+off]);return c;}); this.commitAdd(cl); this.setSel(cl.map(c=>c.id)); }
      if(a==='front'){ const before=this.page.items.slice(); const s=new Set(this.sel); this.page.items=before.filter(i=>!s.has(i.id)).concat(before.filter(i=>s.has(i.id))); this.record({type:'order',before,after:this.page.items.slice()}); this.redraw(); }
      if(a==='color'){ const c=await pickColorModal('لون العناصر المحددة',this.color); if(!c) return; pushRecent(c); this.setColor(c,true);
        const before=items.map(cloneItem); items.forEach(it=>{ if(it.t!=='img') it.c=c; }); this.record({type:'xform',before,after:items.map(cloneItem)}); this.redraw(); }
    });
  },
  beginXform(kind,e,handle){
    const W=this.W, b=this.selBBox(), p=this.pt(e);
    const ids=new Set(this.sel);
    const st={kind:'xform',mode:kind,ids,start:p,snap:this.selItems().map(cloneItem),center:[(b[0]+b[2])/2,(b[1]+b[3])/2],moved:false};
    if(kind==='scale'){ const opp={nw:[b[2],b[3]],ne:[b[0],b[3]],sw:[b[2],b[1]],se:[b[0],b[1]]}[handle]; st.origin=opp; }
    const tgt=e.target; try{ tgt.setPointerCapture(e.pointerId); }catch(_){}
    this.act.set(e.pointerId,st);
    this.redraw(ids); this.sched();
  },
  xformMove(st,e){
    const p=this.pt(e); st.moved=true;
    const items=this.page.items, map=new Map(st.snap.map(s=>[s.id,s]));
    let f,s=1,dr=0;
    if(st.mode==='move'){ const dx=p[0]-st.start[0], dy=p[1]-st.start[1]; f=(x,y)=>[x+dx,y+dy]; }
    else if(st.mode==='scale'){ const o=st.origin; s=Math.max(.05,dist(p,o)/Math.max(1e-6,dist(st.start,o))); f=(x,y)=>[o[0]+(x-o[0])*s,o[1]+(y-o[1])*s]; }
    else { const c=st.center; dr=Math.atan2(p[1]-c[1],p[0]-c[0])-Math.atan2(st.start[1]-c[1],st.start[0]-c[0]);
      const deg=dr*180/Math.PI, sn=Math.round(deg/15)*15; if(Math.abs(deg-sn)<3) dr=sn*Math.PI/180;
      f=(x,y)=>rotP([x,y],c,dr); }
    for(let i=0;i<items.length;i++){ const o=map.get(items[i].id); if(!o) continue; const c=cloneItem(o); xformItem(c,f,s,dr); items[i]=c; }
    this.updateSelUI(); this.sched();
  },
  endXform(st){
    if(st.moved) this.record({type:'xform',before:st.snap,after:this.selItems().map(cloneItem)});
    this.redraw(); this.updateSelUI(); this.sched();
  },
  /* ---------- text ---------- */
  openText(p,existing){
    this.closeText(true);
    const W=this.W, k=W/REF, ed=document.createElement('div');
    ed.className='txt-edit'; ed.contentEditable='true'; ed.dir='auto'; ed.spellcheck=false;
    let idx=-1, before=null;
    if(!existing){ const hit=this.hitTest(p); if(hit&&hit.t==='text') existing=hit; }
    if(existing){ idx=this.page.items.findIndex(i=>i.id===existing.id); before=cloneItem(existing); this.page.items.splice(idx,1); this.redraw(); }
    const fs=existing?existing.fs*W:this.sizes.text*k, color=existing?existing.c:this.color;
    Object.assign(ed.style,{fontSize:fs+'px',color,fontFamily:UIFONT});
    if(existing){ ed.textContent=existing.text; ed.dir=existing.dir; }
    this.area.appendChild(ed);
    const rtl=existing?existing.dir==='rtl':true;
    if(existing){ const bx=existing.bx*W, by=existing.by*W; ed.style.top=(by-4)+'px'; if(rtl) ed.style.right=(this.W-(bx+existing.bw*W)-8)+'px'; else ed.style.left=(bx-8)+'px'; }
    else { ed.style.top=(p[1]*W-fs*.7)+'px'; ed.style.right=(this.W-p[0]*W-8)+'px'; }
    this.txt={ed,idx,before,fs,color};
    setTimeout(()=>{ ed.focus(); const r=document.createRange(); r.selectNodeContents(ed); r.collapse(false); const s=getSelection(); s.removeAllRanges(); s.addRange(r); },0);
    ed.addEventListener('blur',()=>this.closeText(false));
    ed.addEventListener('keydown',e=>{ if(e.key==='Escape'){ e.preventDefault(); ed.blur(); } e.stopPropagation(); });
  },
  closeText(){
    const t=this.txt; if(!t) return; this.txt=null;
    const {ed,idx,before,fs,color}=t, W=this.W;
    const text=ed.innerText.replace(/\n$/,'').replace(/ /g,' ');
    const cr=ed.getBoundingClientRect(), ar=this.area.getBoundingClientRect();
    ed.remove();
    let after=null;
    if(text.trim()){
      const dir=/^[^A-Za-z؀-ۿ]*[؀-ۿ]/.test(text)?'rtl':(/[A-Za-z]/.test(text)?'ltr':'rtl');
      const x=this.xLive; x.save(); x.font=`500 ${fs}px ${UIFONT}`; const tw=Math.max(...text.split('\n').map(l=>x.measureText(l).width),4); x.restore();
      const lines=text.split('\n').length, bh=lines*fs*1.35;
      const innerL=cr.left-ar.left+8, innerR=cr.right-ar.left-8, top=cr.top-ar.top+4;
      const bx=dir==='rtl'?innerR-tw:innerL;
      after={id:before?before.id:uid(),t:'text',text,dir,fs:fs/W,c:color,bx:bx/W,by:top/W,bw:tw/W,bh:bh/W,rot:before?before.rot||0:0};
    }
    if(before||after){
      if(after) this.page.items.splice(idx>=0?idx:this.page.items.length,0,after);
      if(before||after) this.record({type:'edit',before,after,idx:idx>=0?idx:this.page.items.length-1});
    }
    this.redraw();
  },
  /* ---------- image ---------- */
  async insertImage(file){
    try{
      const isStr=typeof file==='string';
      const src=isStr?file:await readAsDataURL(file);
      const {url,w,h}=await shrinkImage(src,1600,(isStr?/^data:image\/(png|gif|webp|svg)/.test(src):/png|gif|webp|svg/.test(file.type))?'image/png':'image/jpeg');
      const W=this.W, pw=Math.min(W*.45,w), ph=pw*h/w;
      const it={id:uid(),t:'img',src:url,bx:(W-pw)/2/W,by:Math.max(20,(this.H-ph)/2)/W,bw:pw/W,bh:ph/W,rot:0};
      cachedImg(url,()=>this.redraw());
      this.commitAdd([it]); this.setTool('select'); this.setSel([it.id]);
      toast('تم إدراج الصورة — اسحبها أو كبّرها من الزوايا');
    }catch(e){ toast('تعذر قراءة الصورة',false); }
  },
  /* ---------- geometry instruments ---------- */
  addInst(kind){
    const W=this.W, H=this.H, d=INST_DEF[kind];
    if(this.inst.some(i=>i.kind===kind)){ toast('الأداة موجودة على السبورة'); return; }
    const off=this.inst.length*30;
    this.inst.push({id:uid(),kind,cx:(W/2+off)/W,cy:(H*.45+off)/W,ang:0,arm:50});
    this.renderInst();
  },
  instGeom(it){ const d=INST_DEF[it.kind], k=this.W/REF; return {w:d.w,h:d.h,k,C:[it.cx*this.W,it.cy*this.W],a:it.ang*Math.PI/180}; },
  toWorld(it,lx,ly){ const g=this.instGeom(it); const v=rotP([(lx-g.w/2)*g.k,(ly-g.h/2)*g.k],[0,0],g.a); return [(g.C[0]+v[0])/this.W,(g.C[1]+v[1])/this.W]; },
  toLocal(it,p){ const g=this.instGeom(it); const v=rotP([p[0]*this.W-g.C[0],p[1]*this.W-g.C[1]],[0,0],-g.a); return [v[0]/g.k+g.w/2,v[1]/g.k+g.h/2]; },
  instEdges(it){
    const {w,h}=INST_DEF[it.kind];
    if(it.kind==='ruler') return [[[0,0],[w,0]],[[w,h],[0,h]]];
    if(it.kind==='prot'){ const by=h-34; return [[[w,by],[0,by]]]; }
    return [[[0,0],[0,h]],[[0,h],[w,h]],[[w,h],[0,0]]];
  },
  findSnap(p){
    let best=null;
    for(const it of this.inst){
      const q=this.toLocal(it,p), E=this.instEdges(it), {w,h}=INST_DEF[it.kind];
      const cen=it.kind==='ruler'?[w/2,h/2]:it.kind==='prot'?[w/2,0]:[w/3,h*2/3];
      for(const [a,b] of E){
        const dx=b[0]-a[0], dy=b[1]-a[1], L=Math.hypot(dx,dy), t=((q[0]-a[0])*dx+(q[1]-a[1])*dy)/(L*L);
        if(t<-.02||t>1.02) continue;
        let nx=-dy/L, ny=dx/L; if((cen[0]-a[0])*nx+(cen[1]-a[1])*ny>0){nx=-nx;ny=-ny;}
        const sd=(q[0]-a[0])*nx+(q[1]-a[1])*ny;
        if(sd>=-4&&sd<=44&&(!best||sd<best.sd)) best={it,a,b,nx,ny,sd};
      }
    }
    return best;
  },
  projectSnap(sn,p){
    const q=this.toLocal(sn.it,p), {a,b,nx,ny}=sn, dx=b[0]-a[0], dy=b[1]-a[1], L2=dx*dx+dy*dy;
    const t=clamp(((q[0]-a[0])*dx+(q[1]-a[1])*dy)/L2,0,1);
    const off=((this.tool==='shape'?this.sizes.shape:this.pen==='hl'?this.sizes.hl:this.sizes.ink)/2+1);
    return this.toWorld(sn.it,a[0]+dx*t+nx*off,a[1]+dy*t+ny*off);
  },
  instSVG(it){
    const d=INST_DEF[it.kind], {w,h}=d; let s=`<svg viewBox="0 0 ${w} ${h}">`;
    const fillC='rgba(255,255,255,.78)', edge='#64748b', tick='#334155';
    if(it.kind==='ruler'){
      s+=`<rect x="0" y="0" width="${w}" height="${h}" rx="8" fill="${fillC}" stroke="${edge}" stroke-width="1.5"/><rect x="0" y="${h-18}" width="${w}" height="18" rx="0" fill="rgba(240,112,62,.18)"/>`;
      for(let mm=0;mm<=300;mm++){ const x=24+mm*PXCM/10, L=mm%10===0?26:mm%5===0?17:10; s+=`<line x1="${x}" y1="0" x2="${x}" y2="${L}" stroke="${tick}" stroke-width="${mm%10?1:1.6}"/>`; if(mm%10===0) s+=`<text x="${x}" y="46" font-size="17" text-anchor="middle" fill="${tick}" font-family="sans-serif" font-weight="600">${mm/10}</text>`; }
      s+=`<text x="${w/2}" y="${h-4}" font-size="12" text-anchor="middle" fill="#9a3412" font-family="sans-serif">Alharthia OS • cm</text>`;
    } else if(it.kind==='prot'){
      const R=9*PXCM, cx=w/2, by=h-34;
      s+=`<path d="M${cx-R-30} ${by+34} L${cx-R-30} ${by} A${R+30} ${R+30} 0 0 1 ${cx+R+30} ${by} L${cx+R+30} ${by+34} Z" fill="${fillC}" stroke="${edge}" stroke-width="1.5"/>`;
      for(let dg=0;dg<=180;dg++){ const a=dg*Math.PI/180, L=dg%10===0?24:dg%5===0?15:8, r1=R+30, r2=r1-L;
        s+=`<line x1="${cx+Math.cos(a)*r1}" y1="${by-Math.sin(a)*r1}" x2="${cx+Math.cos(a)*r2}" y2="${by-Math.sin(a)*r2}" stroke="${tick}" stroke-width="${dg%10?1:1.5}"/>`;
        if(dg%10===0){ s+=`<text x="${cx+Math.cos(a)*(R-14)}" y="${by-Math.sin(a)*(R-14)+5}" font-size="14" text-anchor="middle" fill="${tick}" font-family="sans-serif" font-weight="600">${dg}</text>`;
          s+=`<text x="${cx+Math.cos(a)*(R-40)}" y="${by-Math.sin(a)*(R-40)+4}" font-size="10.5" text-anchor="middle" fill="#94a3b8" font-family="sans-serif">${180-dg}</text>`; } }
      s+=`<line x1="${cx-R-20}" y1="${by}" x2="${cx+R+20}" y2="${by}" stroke="${tick}" stroke-width="1.2"/><circle cx="${cx}" cy="${by}" r="5" fill="none" stroke="${tick}" stroke-width="1.5"/><line x1="${cx}" y1="${by-12}" x2="${cx}" y2="${by+12}" stroke="${tick}"/>`;
      const aa=it.arm*Math.PI/180; s+=`<line x1="${cx}" y1="${by}" x2="${cx+Math.cos(aa)*(R+30)}" y2="${by-Math.sin(aa)*(R+30)}" stroke="#2563eb" stroke-width="3"/><line x1="${cx}" y1="${by}" x2="${cx+R+30}" y2="${by}" stroke="#2563eb" stroke-width="3" opacity=".5"/>`;
      s+=`<path d="M${cx+50} ${by} A50 50 0 0 0 ${cx+Math.cos(aa)*50} ${by-Math.sin(aa)*50}" fill="none" stroke="#2563eb" stroke-width="2"/>`;
    } else {
      s+=`<path d="M0 0 L0 ${h} L${w} ${h} Z" fill="${fillC}" stroke="${edge}" stroke-width="1.5" stroke-linejoin="round"/>`;
      const inset=it.kind==='sq45'?.42:.4;
      s+=`<path d="M${w*.12} ${h*(1-inset)} L${w*.12} ${h*.88} L${w*(inset+.12)*(it.kind==='sq45'?1:1)} ${h*.88} Z" fill="rgba(240,112,62,.12)" stroke="${edge}" stroke-width="1"/>`;
      const cmW=Math.floor(w/PXCM), cmH=Math.floor(h/PXCM);
      for(let mm=0;mm<=cmW*10;mm++){ const x=mm*PXCM/10, L=mm%10===0?20:mm%5===0?13:7; if(x>w-4) break; s+=`<line x1="${x}" y1="${h}" x2="${x}" y2="${h-L}" stroke="${tick}" stroke-width="${mm%10?1:1.4}"/>`; if(mm%10===0&&mm) s+=`<text x="${x}" y="${h-26}" font-size="13" text-anchor="middle" fill="${tick}" font-family="sans-serif" font-weight="600">${mm/10}</text>`; }
      for(let mm=0;mm<=cmH*10;mm++){ const y=h-mm*PXCM/10, L=mm%10===0?20:mm%5===0?13:7; if(y<4) break; s+=`<line x1="0" y1="${y}" x2="${L}" y2="${y}" stroke="${tick}" stroke-width="${mm%10?1:1.4}"/>`; if(mm%10===0&&mm) s+=`<text x="28" y="${y+5}" font-size="13" text-anchor="middle" fill="${tick}" font-family="sans-serif" font-weight="600">${mm/10}</text>`; }
      s+=`<text x="${w*.22}" y="${h*.72}" font-size="15" fill="#9a3412" font-family="sans-serif" font-weight="700">${it.kind==='sq45'?'45°':'30° / 60°'}</text>`;
    }
    return s+'</svg>';
  },
  instInner(it){
    const d=INST_DEF[it.kind], pct=(x,y)=>`left:${x/d.w*100}%;top:${y/d.h*100}%`;
    let knobs='';
    if(it.kind==='ruler') knobs=`<div class="knob" data-k="rot" style="${pct(d.w,d.h/2)};margin:-22px 0 0 8px">${icon('restart')}</div><button class="x" data-k="x" style="${pct(0,d.h/2)};margin:-17px 0 0 -44px">${icon('x')}</button>`;
    else if(it.kind==='prot'){ const R=9*PXCM+30, a=it.arm*Math.PI/180, cx=d.w/2, by=d.h-34;
      knobs=`<div class="armknob" data-k="arm" style="${pct(cx+Math.cos(a)*(R+18),by-Math.sin(a)*(R+18))}"></div>
        <div class="knob" data-k="rot" style="${pct(d.w,d.h)};margin:-22px 0 0 -10px">${icon('restart')}</div>
        <button class="x" data-k="x" style="${pct(0,d.h)};margin:-17px 0 0 -24px">${icon('x')}</button>
        <div class="readout" style="${pct(cx,by-70)};transform:translate(-50%,-50%)">${it.arm}°</div>
        <button class="act" data-k="draw" style="${pct(cx,by-125)};transform:translate(-50%,-50%)">${icon('pen')}رسم الزاوية</button>`; }
    else knobs=`<div class="knob" data-k="rot" style="${pct(d.w*.3,d.h*.62)};margin:-22px 0 0 -22px">${icon('restart')}</div><button class="x" data-k="x" style="${pct(d.w*.08,d.h*.45)};margin:-17px 0 0 -17px">${icon('x')}</button>`;
    return this.instSVG(it)+knobs+(it.kind!=='prot'?`<div class="readout ro" hidden style="${pct(d.w/2,-8)};transform:translate(-50%,-100%)"></div>`:'');
  },
  renderInst(){
    const layer=$('#instLayer'); layer.innerHTML='';
    for(const it of this.inst){
      const el=document.createElement('div'); el.className='inst'; el.dataset.id=it.id;
      el.innerHTML=this.instInner(it); layer.appendChild(el); this.bindInst(el,it);
    }
    this.layoutInst();
  },
  layoutInst(){
    const k=this.W/REF;
    for(const el of $$('#instLayer .inst')){ const it=this.inst.find(i=>i.id===el.dataset.id); if(!it) continue; const d=INST_DEF[it.kind];
      el.style.width=d.w*k+'px'; el.style.height=d.h*k+'px';
      el.style.transform=`translate(${it.cx*this.W-d.w*k/2}px,${it.cy*this.W-d.h*k/2}px) rotate(${it.ang}deg)`; }
  },
  bindInst(el,it){
    el.addEventListener('pointerdown',e=>{
      e.preventDefault(); e.stopPropagation(); this.closePop();
      const k=e.target.closest('[data-k]')?.dataset.k;
      if(k==='x'){ this.inst=this.inst.filter(i=>i!==it); el.remove(); return; }
      if(k==='draw'){ this.drawAngle(it); return; }
      el.setPointerCapture(e.pointerId);
      const r=this.area.getBoundingClientRect(), W=this.W;
      const P=ev=>[(ev.clientX-r.left)/W,(ev.clientY-r.top)/W];
      const p0=P(e), c0=[it.cx,it.cy], a0=it.ang, ro=el.querySelector('.ro');
      const g=this.instGeom(it), C=[g.C[0]/W,g.C[1]/W], st0=Math.atan2(p0[1]-C[1],p0[0]-C[0]);
      const mv=ev=>{
        const p=P(ev);
        if(k==='rot'){ let an=a0+(Math.atan2(p[1]-C[1],p[0]-C[0])-st0)*180/Math.PI; an=((an%360)+360)%360; const sn=Math.round(an/15)*15; if(Math.abs(an-sn)<2.5) an=sn%360; it.ang=an;
          if(ro&&it.kind!=='prot'){ ro.hidden=false; ro.textContent=Math.round((360-an)%360)+'°'; } this.layoutInst(); }
        else if(k==='arm'){ const q=this.toLocal(it,p), d=INST_DEF.prot; let an=Math.atan2(-(q[1]-(d.h-34)),q[0]-d.w/2)*180/Math.PI; if(an<0) an=an<-90?180:0; it.arm=Math.round(clamp(an,0,180)); el.innerHTML=this.instInner(it); }
        else { it.cx=c0[0]+p[0]-p0[0]; it.cy=c0[1]+p[1]-p0[1]; this.layoutInst(); }
      };
      const up=()=>{ el.removeEventListener('pointermove',mv); el.removeEventListener('pointerup',up); el.removeEventListener('pointercancel',up); if(ro&&it.kind!=='prot') setTimeout(()=>ro.hidden=true,800); };
      el.addEventListener('pointermove',mv); el.addEventListener('pointerup',up); el.addEventListener('pointercancel',up);
    });
  },
  drawAngle(it){
    const d=INST_DEF.prot, R=9*PXCM, cx=d.w/2, by=d.h-34, a=it.arm*Math.PI/180;
    const O=this.toWorld(it,cx,by), A=this.toWorld(it,cx+R,by), B=this.toWorld(it,cx+Math.cos(a)*R,by-Math.sin(a)*R);
    const w=this.sizes.shape/REF, c=this.color, rot=it.ang*Math.PI/180, r=(60*this.W/REF)/this.W;
    const m=this.toWorld(it,cx+Math.cos(a/2)*95,by-Math.sin(a/2)*95);
    const k=this.W/REF, fs=30/REF;
    const items=[{id:uid(),t:'shape',k:'line',a:O,b:A,c,w},{id:uid(),t:'shape',k:'line',a:O,b:B,c,w},
      {id:uid(),t:'shape',k:'arc',cx:O[0],cy:O[1],r:60/REF,a0:rot-a,a1:rot,c,w:w*.8},
      {id:uid(),t:'text',text:nf(it.arm)+'°',dir:'ltr',fs,c,bx:m[0]-fs,by:m[1]-fs*.68,bw:fs*2,bh:fs*1.35,rot:0}];
    this.commitAdd(items); toast('تم رسم زاوية '+nf(it.arm)+'°');
  },
  addAxes(){
    const W=this.W, H=this.H, s=Math.min(W*.5,H*.8);
    this.commitAdd([{id:uid(),t:'shape',k:'axes',bx:(W-s)/2/W,by:(H-s)/2/W,bw:s/W,bh:s/W,rot:0,c:this.color,w:this.sizes.shape/REF,fill:false}]);
    this.setTool('select'); this.setSel([this.page.items[this.page.items.length-1].id]);
  },
