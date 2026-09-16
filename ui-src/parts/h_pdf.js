
/* =====================================================================
   PDF VIEWER (+ الكتابة على الصفحات)
   ===================================================================== */
class MiniInk{
  constructor(host){
    this.host=host; this.cv=host.querySelector('canvas'); this.x=this.cv.getContext('2d');
    this.pages=[[]]; this.hist=[[]]; this.pi=0; this.tool='pen'; this.color='#dc2626'; this.act=new Map(); this.W=1; this.H=1; this.raf=0;
    const c=this.cv;
    c.style.touchAction='none';
    c.addEventListener('pointerdown',e=>{
      if(this.host.classList.contains('off')) return; e.preventDefault(); try{c.setPointerCapture(e.pointerId);}catch(_){}
      if(e.pointerType==='touch'&&S.palm&&(e.width>55||e.height>55)) return;
      this.r=c.getBoundingClientRect(); const p=this.pt(e);
      const k=this.tool, w=(k==='hl'?24:k==='eraser'?36:4)/REF*(REF/this.W)*(this.W/REF)*1;
      this.act.set(e.pointerId,{s:{id:uid(),t:'ink',k,c:this.color,w:(k==='hl'?22:k==='eraser'?34:4)/900,p:[[p[0],p[1],1]]},sm:p});
      this.sched();
    });
    c.addEventListener('pointermove',e=>{ const st=this.act.get(e.pointerId); if(!st) return;
      const evs=(e.getCoalescedEvents&&e.getCoalescedEvents())||[e];
      for(const ev of (evs.length?evs:[e])){ const q=this.pt(ev), k=S.smooth; st.sm[0]+=(q[0]-st.sm[0])*(1-k); st.sm[1]+=(q[1]-st.sm[1])*(1-k);
        const l=st.s.p[st.s.p.length-1]; if(Math.hypot(st.sm[0]-l[0],st.sm[1]-l[1])*this.W>.7) st.s.p.push([st.sm[0],st.sm[1],1]); }
      this.sched(); });
    const up=e=>{ const st=this.act.get(e.pointerId); if(!st) return; this.act.delete(e.pointerId); this.pages[this.pi].push(st.s); this.hist[this.pi].push(st.s.id); this.redraw(); };
    c.addEventListener('pointerup',up); c.addEventListener('pointercancel',up);
  }
  pt(e){ return [(e.clientX-this.r.left)/this.W,(e.clientY-this.r.top)/this.W]; }
  reset(n){ this.pages=Array.from({length:n},()=>[]); this.hist=Array.from({length:n},()=>[]); this.pi=0; }
  resize(w,h){ const d=Math.min(devicePixelRatio||1,3); this.W=w; this.H=h; this.cv.width=Math.round(w*d); this.cv.height=Math.round(h*d); this.cv.style.width=w+'px'; this.cv.style.height=h+'px'; this.x.setTransform(d,0,0,d,0,0); this.redraw(); }
  sched(){ if(!this.raf) this.raf=requestAnimationFrame(()=>{this.raf=0;this.redraw();}); }
  redraw(){ const x=this.x; x.save(); x.setTransform(1,0,0,1,0,0); x.clearRect(0,0,this.cv.width,this.cv.height); x.restore();
    for(const s of (this.pages[this.pi]||[])) drawInk(x,s,this.W); for(const st of this.act.values()) drawInk(x,st.s,this.W); }
  undo(){ const p=this.pages[this.pi]; if(p&&p.length){ p.pop(); this.redraw(); } }
  clear(){ if(this.pages[this.pi]) this.pages[this.pi]=[]; this.redraw(); }
}
const Pdf={
  doc:null,n:0,i:0,zoom:1,fit:'page',cache:new Map(),busy:new Map(),token:0,
  init(){
    this.ink=new MiniInk($('#pdfInk')); this.ci=2;
    const st=$('#pdfStage');
    $('#pdfFile').onchange=async e=>{const f=e.target.files[0]; if(f) this.open(await f.arrayBuffer(),f.name); e.target.value='';};
    document.addEventListener('click',e=>{ if(e.target.closest('[data-act=pdfDevice]')) $('#pdfFile').click(); });
    st.addEventListener('dragover',e=>{e.preventDefault();$('#pdfEmpty').classList.add('drop');});
    st.addEventListener('dragleave',()=>$('#pdfEmpty').classList.remove('drop'));
    st.addEventListener('drop',async e=>{e.preventDefault();$('#pdfEmpty').classList.remove('drop');const f=[...e.dataTransfer.files].find(f=>/pdf$/i.test(f.name)); if(f) this.open(await f.arrayBuffer(),f.name);});
    $('#pPrev').onclick=()=>this.goto(this.i-1);
    $('#pNext').onclick=()=>this.goto(this.i+1);
    $('#pNum').onchange=e=>{const v=parseInt(String(e.target.value).replace(/[٠-٩]/g,d=>AR_D.indexOf(d)),10); if(v) this.goto(v-1); else this.ui();};
    $('#pZin').onclick=()=>this.setZoom(this.zoom*1.25);
    $('#pZout').onclick=()=>this.setZoom(this.zoom/1.25);
    $('#pFit').onclick=()=>{this.fit=this.fit==='page'?'width':'page';this.zoom=1;toast(this.fit==='page'?'عرض الصفحة كاملة':'ملء عرض الشاشة');this.render();};
    $('#pThumbsBtn').onclick=()=>{const t=$('#thumbs'); t.hidden=!t.hidden; $('#pThumbsBtn').classList.toggle('on',!t.hidden);};
    $('#pFull').onclick=()=>{ toggleFullscreen(); };
    $('#pPen').onclick=()=>this.setAnnot($('#pdfInk').classList.contains('off'));
    $('#pHl').onclick=()=>{this.ink.tool=this.ink.tool==='hl'?'pen':'hl';this.inkUi();};
    $('#pEraser').onclick=()=>{this.ink.tool=this.ink.tool==='eraser'?'pen':'eraser';this.inkUi();};
    $('#pUndo').onclick=()=>this.ink.undo();
    $('#pClear').onclick=()=>this.ink.clear();
    $('#pColors').addEventListener('click',e=>{const c=e.target.closest('[data-ci]'); if(!c) return; this.ci=+c.dataset.ci; this.ink.color=QUICK_LIGHT[this.ci]; if(this.ink.tool==='eraser') this.ink.tool='pen'; this.inkUi();});
    let sx=null,sy=0;
    st.addEventListener('pointerdown',e=>{ if(!$('#pdfInk').classList.contains('off')||!this.doc||e.target.closest('#pdfEmpty')) return; sx=e.clientX; sy=e.clientY; });
    st.addEventListener('pointerup',e=>{ if(sx==null) return; const dx=e.clientX-sx, dy=e.clientY-sy; sx=null; if(st.scrollWidth>st.clientWidth+4) return;
      if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.3) this.goto(this.i+(dx<0?1:-1)); });
    let wt=0;
    st.addEventListener('wheel',e=>{ if(!this.doc) return; if(e.ctrlKey){e.preventDefault();this.setZoom(this.zoom*(e.deltaY<0?1.1:1/1.1));return;}
      if(st.scrollHeight>st.clientHeight+4) return; const now=Date.now(); if(now-wt<350) return; wt=now; this.goto(this.i+(e.deltaY>0?1:-1)); },{passive:false});
    new ResizeObserver(()=>{ if(this.doc&&current==='pdf') this.render(); }).observe(st);
    let hideT=0; $('#pdf').addEventListener('pointermove',e=>{ if(!$('#pdf').classList.contains('full')) return; const bar=$('#pdfBar'); if(innerHeight-e.clientY<120){bar.classList.add('show');clearTimeout(hideT);} else {clearTimeout(hideT);hideT=setTimeout(()=>bar.classList.remove('show'),1200);} });
    this.inkUi(); this.ui();
  },
  async open(buf,name){
    go('pdf'); $('#pdfLoading').hidden=false;
    try{ const L=await pdfjs(); if(this.doc){try{this.doc.destroy();}catch(_){}} this.doc=await L.getDocument({data:new Uint8Array(buf.slice?buf.slice(0):buf)}).promise; }
    catch(err){ $('#pdfLoading').hidden=true; toast(pdfjsP?'تعذر فتح الملف':'تعذر تحميل محرك PDF — هاي المعاينة تحتاج إنترنت (النظام الحقيقي ما يحتاج)',false); return; }
    this.n=this.doc.numPages; this.i=0; this.zoom=1; this.cache.clear(); this.busy.clear(); this.name=name;
    $('#pdfName').textContent=name.replace(/\.pdf$/i,''); setTitle(name);
    this.ink.reset(this.n);
    $('#pdfEmpty').hidden=true; $('#pageWrap').hidden=false;
    this.buildThumbs(); if(innerWidth>900){$('#thumbs').hidden=false;$('#pThumbsBtn').classList.add('on');}
    await this.render(); $('#pdfLoading').hidden=true;
  },
  scaleFor(vp){ const st=$('#pdfStage'), sw=st.clientWidth-32, sh=st.clientHeight-32;
    const f=this.fit==='page'?Math.min(sw/vp.width,sh/vp.height):sw/vp.width; return Math.max(.1,f*this.zoom); },
  async bitmap(idx,scale){
    const d=Math.min(devicePixelRatio||1,3), key=idx+'|'+scale.toFixed(3)+'|'+d;
    if(this.cache.has(key)) return this.cache.get(key); if(this.busy.has(key)) return this.busy.get(key);
    const job=(async()=>{ const page=await this.doc.getPage(idx+1); let vp=page.getViewport({scale:scale*d});
      const k=Math.min(1,Math.sqrt(16e6/(vp.width*vp.height))); if(k<1) vp=page.getViewport({scale:scale*d*k});
      const c=document.createElement('canvas'); c.width=Math.floor(vp.width); c.height=Math.floor(vp.height);
      const cx=c.getContext('2d',{alpha:false}); await page.render({canvasContext:cx,canvas:c,viewport:vp}).promise;
      this.cache.set(key,c); this.busy.delete(key); if(this.cache.size>10) this.cache.delete(this.cache.keys().next().value); return c; })();
    this.busy.set(key,job); return job;
  },
  async render(){
    if(!this.doc) return; const tok=++this.token, idx=this.i;
    const page=await this.doc.getPage(idx+1), vp1=page.getViewport({scale:1}), scale=this.scaleFor(vp1);
    const w=Math.floor(vp1.width*scale), h=Math.floor(vp1.height*scale);
    const bmp=await this.bitmap(idx,scale); if(tok!==this.token) return;
    const cv=$('#pdfCanvas'); cv.width=bmp.width; cv.height=bmp.height; cv.style.width=w+'px'; cv.style.height=h+'px'; cv.getContext('2d').drawImage(bmp,0,0);
    const wrap=$('#pageWrap'); wrap.style.width=w+'px'; wrap.style.height=h+'px';
    this.ink.pi=idx; this.ink.resize(w,h); this.ui();
    setTimeout(()=>{ if(tok!==this.token) return; for(const j of [idx+1,idx-1]) if(j>=0&&j<this.n) this.doc.getPage(j+1).then(p=>this.bitmap(j,this.scaleFor(p.getViewport({scale:1})))); },60);
  },
  goto(j){ if(!this.doc) return; j=clamp(j,0,this.n-1); if(j===this.i) return; this.i=j; $('#pdfStage').scrollTop=0; this.render(); },
  setZoom(z){ if(!this.doc) return; this.zoom=clamp(z,.4,5); this.render(); },
  setAnnot(on){
    if(on&&!this.doc){toast('افتح ملف أولاً',false);return;}
    $('#pdfInk').classList.toggle('off',!on); $('#pPen').classList.toggle('on',on); $('#pInkTools').hidden=!on;
    $('#pdfStage').style.touchAction=on?'none':'';
    if(on){this.ink.tool='pen';toast('اكتب مباشرة على الصفحة');} this.inkUi();
  },
  inkUi(){
    $('#pColors').innerHTML=QUICK_LIGHT.slice(0,5).map((c,i)=>`<button class="swc${i===this.ci&&this.ink.tool!=='eraser'?' on':''}" data-ci="${i}" style="--c:${c}" aria-label="لون"></button>`).join('');
    $('#pHl').classList.toggle('on',this.ink.tool==='hl'); $('#pEraser').classList.toggle('on',this.ink.tool==='eraser');
  },
  ui(){
    $('#pNum').value=nf(this.doc?this.i+1:0); $('#pTot').textContent='/ '+nf(this.n);
    $('#pPrev').disabled=!this.doc||this.i===0; $('#pNext').disabled=!this.doc||this.i>=this.n-1;
    for(const id of ['pZin','pZout','pFit']) $('#'+id).disabled=!this.doc;
    $$('#thumbs .thumb').forEach((t,k)=>t.classList.toggle('on',k===this.i));
    const on=$('#thumbs .thumb.on'); on&&on.scrollIntoView({block:'nearest'});
  },
  buildThumbs(){
    const box=$('#thumbs'); box.innerHTML=''; this.obs&&this.obs.disconnect();
    const q=[]; let run=false;
    const pump=async()=>{ if(run) return; run=true; while(q.length){ const [k,cv]=q.shift(); try{ const p=await this.doc.getPage(k+1); const v0=p.getViewport({scale:1}); const vp=p.getViewport({scale:280/v0.width});
      cv.width=vp.width; cv.height=vp.height; await p.render({canvasContext:cv.getContext('2d'),canvas:cv,viewport:vp}).promise; }catch(_){} } run=false; };
    this.obs=new IntersectionObserver(es=>{ for(const e of es) if(e.isIntersecting&&!e.target.dataset.done){ e.target.dataset.done=1; q.push([+e.target.dataset.k,e.target.querySelector('canvas')]); pump(); } },{root:box,rootMargin:'300px'});
    for(let k=0;k<this.n;k++){ const b=document.createElement('button'); b.className='thumb'; b.dataset.k=k; b.innerHTML=`<canvas width="140" height="100"></canvas><span>${nf(k+1)}</span>`; b.onclick=()=>this.goto(k); box.appendChild(b); this.obs.observe(b); }
  }
};
onShow.pdf=()=>{ if(Pdf.doc){ setTitle(Pdf.name); Pdf.render(); } };
