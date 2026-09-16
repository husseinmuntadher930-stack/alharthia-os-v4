
/* =====================================================================
   FILE PICKER — replaces the system "open file" window on the real device,
   so choosing a picture (board, wallpaper, logo…) looks like the file explorer.
   ===================================================================== */
const FilePicker={
  st:null,
  QUICK:[['pics','الصور','image'],['docs','المستندات','doc'],['down','التنزيلات','download'],['vids','الفيديو','video'],['boards','السبورات المحفوظة','board'],['bt','المستلمة عبر البلوتوث','bluetooth']],
  // accept: ".pdf,image/*" ; returns [{path,name,size}] or null
  pick({accept='',multiple=false,title}={}){
    return new Promise(res=>{
      const N=Native, rules=accept.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
      const kind=rules.every(r=>r.startsWith('image/'))&&rules.length?'pics':rules.some(r=>/^(video|audio)\//.test(r))?'vids':rules.some(r=>/pdf|docx|xlsx|pptx/.test(r))?'docs':'pics';
      this.st={path:N.folders[kind]||N.roots[0].path,items:[],sel:new Set(),multiple,rules,q:'',res,title:title||(multiple?'اختيار ملفات':'اختيار ملف')};
      let el=$('#fpick'); if(!el){ el=document.createElement('div'); el.id='fpick'; document.body.appendChild(el); this.bind(el); }
      el.hidden=false; this.render();
    });
  },
  ok(name){
    const R=this.st.rules; if(!R.length) return true;
    const n=name.toLowerCase(), ext='.'+(n.split('.').pop()), k=mediaKind(n), img=/\.(png|jpe?g|gif|webp|bmp|svg)$/.test(n);
    return R.some(r=>r===ext||r==='*/*'||(r==='image/*'&&img)||(r==='video/*'&&k==='video')||(r==='audio/*'&&k==='audio')||(r==='application/pdf'&&ext==='.pdf')||(r.includes('/')&&!r.endsWith('*')&&ext.slice(1)===r.split('/').pop()));
  },
  async load(){
    const s=this.st, want=s.path+'|'+s.q;
    try{ const r=s.q?await API.get('/api/fs/search?'+API.q({path:s.path,q:s.q})):await API.get('/api/fs/list?path='+encodeURIComponent(s.path)); if(this.st===s&&want===s.path+'|'+s.q) s.items=r.items; }
    catch(e){ toast(errMsg(e),false); s.items=[]; }
  },
  async render(){
    const s=this.st, want=s.path+'|'+s.q; this.renderShell(); await this.load(); if(this.st!==s||want!==s.path+'|'+s.q) return; this.renderGrid();
  },
  renderShell(){
    const s=this.st, N=Native, I=N.roots[0], usb=N.roots.filter(r=>r.dev), cur=p=>s.path===p;
    const r=N.rootOf(s.path), rel=s.path.slice(r.path.length).split('/').filter(Boolean);
    const crumbs=[[r.path,r.dev?'فلاشة '+r.name:'الذاكرة الداخلية']]; let acc=r.path; for(const x of rel){ acc+='/'+x; crumbs.push([acc,x]); }
    $('#fpick').innerHTML=`<div class="fp-win">
      <div class="fp-head">${icon('folder')}<b>${esc(s.title)}</b><span class="grow"></span><button class="icon-btn" data-fp="cancel" title="إغلاق">${icon('x')}</button></div>
      <div class="app-body">
        <aside class="side">
          <h4>الذاكرة الداخلية</h4>
          <button class="nav-btn${cur(I.path)?' on':''}" data-fpath="${esc(I.path)}">${icon('hdd')}<span class="txt">الذاكرة الداخلية</span></button>
          ${this.QUICK.filter(([id])=>N.folders[id]).map(([id,n,ic])=>`<button class="nav-btn${cur(N.folders[id])?' on':''}" data-fpath="${esc(N.folders[id])}">${icon(ic)}<span class="txt">${n}</span></button>`).join('')}
          <h4>الأجهزة الخارجية</h4>
          ${usb.length?usb.map(u=>`<button class="nav-btn${r.path===u.path?' on':''}" data-fpath="${esc(u.path)}">${icon('usb')}<span class="txt">${esc(u.name)}</span></button>`).join(''):'<div class="drive-card">ماكو فلاشة موصولة</div>'}
        </aside>
        <div class="main">
          <div class="fx-bar">
            <button class="icon-btn" data-fp="up" ${rel.length?'':'disabled'} title="رجوع">${icon('chevR')}</button>
            <div class="crumbs">${crumbs.map(([p,nm],i)=>`${i?'<span class="sepc">›</span>':''}<button data-fpath="${esc(p)}">${esc(nm)}</button>`).join('')}</div>
            <label class="search" style="min-width:200px;height:44px">${icon('search')}<input id="fpQ" type="search" placeholder="بحث بهذا المجلد" value="${esc(s.q)}"></label>
            <button class="icon-btn" data-fp="refresh" title="تحديث">${icon('restart')}</button>
          </div>
          <div class="fgrid" id="fpGrid"><div class="empty" style="grid-column:1/-1"><div class="spin"></div></div></div>
        </div>
      </div>
      <div class="fp-foot"><span id="fpInfo" class="sub"></span><span class="grow"></span>
        <button class="btn" data-fp="cancel">إلغاء</button><button class="btn primary" data-fp="ok" disabled>${icon('check')}اختيار</button></div>
    </div>`;
    const qi=$('#fpQ'); let qt=0; qi.oninput=()=>{ clearTimeout(qt); qt=setTimeout(async()=>{ s.q=qi.value.trim(); await this.load(); this.renderGrid(); },350); };
  },
  renderGrid(){
    const s=this.st, g=$('#fpGrid'); if(!g) return;
    const list=s.items.filter(f=>f.dir||this.ok(f.name)).sort((a,b)=>(a.dir?0:1)-(b.dir?0:1)||b.mtime-a.mtime);
    const hidden=s.items.filter(f=>!f.dir&&!this.ok(f.name)).length;
    g.innerHTML=list.length?list.map(f=>{ const t=f.dir?'dir':extOf(f.name), [c,ic]=FT[t]||FT.other, img=/\.(png|jpe?g|gif|webp|bmp)$/i.test(f.name);
      return `<button class="fitem${s.sel.has(f.path)?' sel':''}" data-fitem="${esc(f.path)}" data-dir="${f.dir?1:0}"><span class="ck">${icon('check')}</span>
        <span class="ficon${img?' thumbimg':''}" style="--c:${c};${img?`background-image:url('${API.url(f.path)}')`:''}">${img?'':icon(ic)}</span>
        <span class="fname">${esc(f.name)}</span><span class="fmeta">${f.dir?nf(f.count||0)+' عنصر':fmtSize(f.size)}</span></button>`; }).join('')
      :`<div class="empty" style="grid-column:1/-1">${icon(s.q?'search':'folder')}<b>${s.q?'ماكو نتائج':'ماكو ملفات مناسبة هنا'}</b>${hidden?`<span>(${nf(hidden)} ملف من نوع ثاني مخفي)</span>`:''}</div>`;
    g.classList.toggle('selmode',s.sel.size>0);
    this.renderFoot();
  },
  renderFoot(){
    const s=this.st, b=$('#fpick [data-fp=ok]'); if(!b) return;
    b.disabled=!s.sel.size;
    const one=s.sel.size===1&&s.items.find(f=>f.path===[...s.sel][0]);
    $('#fpInfo').textContent=s.sel.size?(one?one.name+' — '+fmtSize(one.size):'تم تحديد '+nf(s.sel.size)+' ملفات'):(s.multiple?'اختار ملف أو أكثر':'اختار ملف');
  },
  close(val){ const el=$('#fpick'); if(el){ el.hidden=true; el.innerHTML=''; } const r=this.st&&this.st.res; this.st=null; r&&r(val); },
  bind(el){
    el.addEventListener('click',e=>{
      const s=this.st; if(!s) return;
      if(e.target===el) return this.close(null);
      const p=e.target.closest('[data-fpath]'); if(p){ s.path=p.dataset.fpath; s.q=''; s.sel.clear(); return this.render(); }
      const it=e.target.closest('[data-fitem]');
      if(it){ const path=it.dataset.fitem;
        if(it.dataset.dir==='1'){ s.path=path; s.q=''; s.sel.clear(); return this.render(); }
        if(s.multiple){ s.sel.has(path)?s.sel.delete(path):s.sel.add(path); it.classList.toggle('sel'); $('#fpGrid').classList.toggle('selmode',s.sel.size>0); this.renderFoot(); }
        else { if(s.sel.has(path)) return this.done(); s.sel.clear(); s.sel.add(path); $$('#fpGrid .fitem.sel').forEach(x=>x.classList.remove('sel')); it.classList.add('sel'); this.renderFoot(); }
        return;
      }
      const b=e.target.closest('[data-fp]'); if(!b) return;
      const a=b.dataset.fp;
      if(a==='cancel') this.close(null);
      if(a==='ok') this.done();
      if(a==='refresh') this.render();
      if(a==='up'){ s.path=s.path.slice(0,s.path.lastIndexOf('/'))||'/'; s.sel.clear(); this.render(); }
    });
    el.addEventListener('dblclick',e=>{ const it=e.target.closest('[data-fitem][data-dir="0"]'); if(it&&this.st){ this.st.sel.clear(); this.st.sel.add(it.dataset.fitem); this.done(); } });
    addEventListener('keydown',e=>{ if(this.st&&e.key==='Escape') this.close(null); });
  },
  done(){ const s=this.st; if(!s||!s.sel.size) return; this.close(s.items.filter(f=>s.sel.has(f.path)).map(f=>({path:f.path,name:f.name,size:f.size}))); },
  // turn picked files into File objects and hand them to the <input type=file>
  async fill(input){
    const picked=await this.pick({accept:input.accept,multiple:input.multiple});
    if(!picked||!picked.length) return;
    if(input.dataset.paths){ input.dispatchEvent(new CustomEvent('alh-paths',{detail:picked})); return; }
    const big=picked.reduce((t,f)=>t+f.size,0);
    if(big>300*1024*1024){ toast('الملف كبير جداً للفتح هنا',false); return; }
    try{
      const dt=new DataTransfer();
      for(const f of picked){
        const r=await fetch(API.url(f.path)); if(!r.ok) throw new Error('تعذر قراءة '+f.name);
        const blob=await r.blob();
        dt.items.add(new File([blob],f.name,{type:blob.type||'',lastModified:Date.now()}));
      }
      input.files=dt.files;
      input.dispatchEvent(new Event('input',{bubbles:true}));
      input.dispatchEvent(new Event('change',{bubbles:true}));
    }catch(e){ toast(errMsg(e),false); }
  },
  install(){
    const isFile=el=>el instanceof HTMLInputElement&&el.type==='file';
    const baseClick=HTMLInputElement.prototype.click;
    HTMLInputElement.prototype.click=function(){ if(isFile(this)&&Native.on&&!this.dataset.system){ FilePicker.fill(this); return; } return baseClick.call(this); };
    if(HTMLInputElement.prototype.showPicker){ const sp=HTMLInputElement.prototype.showPicker;
      HTMLInputElement.prototype.showPicker=function(){ if(isFile(this)&&Native.on&&!this.dataset.system){ FilePicker.fill(this); return; } return sp.call(this); }; }
    // taps on a visible file input or on a <label> linked to one
    document.addEventListener('click',e=>{
      if(!Native.on) return;
      let inp=isFile(e.target)?e.target:null;
      const lab=!inp&&e.target.closest('label'); if(lab){ const c=lab.control||lab.querySelector('input[type=file]'); if(isFile(c)) inp=c; }
      if(inp&&!inp.dataset.system){ e.preventDefault(); e.stopPropagation(); FilePicker.fill(inp); }
    },true);
  }
};
