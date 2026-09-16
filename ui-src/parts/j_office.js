
/* =====================================================================
   OFFICE READERS (Word / Excel / PowerPoint) + IMAGE VIEWER
   قراءة مبسطة للملفات داخل المتصفح — النظام الحقيقي يستخدم LibreOffice
   ===================================================================== */
const NS={w:'http://schemas.openxmlformats.org/wordprocessingml/2006/main',a:'http://schemas.openxmlformats.org/drawingml/2006/main',
  r:'http://schemas.openxmlformats.org/officeDocument/2006/relationships',p:'http://schemas.openxmlformats.org/presentationml/2006/main',
  s:'http://schemas.openxmlformats.org/spreadsheetml/2006/main'};
const xmlDoc=s=>new DOMParser().parseFromString(s,'application/xml');
const kids=(el,ns,name)=>el?[...el.children].filter(c=>c.localName===name&&(!ns||c.namespaceURI===ns)):[];
const kid=(el,ns,name)=>kids(el,ns,name)[0];
const all=(el,ns,name)=>el?[...el.getElementsByTagNameNS(ns,name)]:[];
const wval=el=>el&&(el.getAttributeNS(NS.w,'val')||el.getAttribute('w:val'));
async function relsOf(zip,path){
  const dir=path.slice(0,path.lastIndexOf('/')), base=path.slice(path.lastIndexOf('/')+1);
  const f=zip.file(`${dir}/_rels/${base}.rels`); const map={}; if(!f) return map;
  const d=xmlDoc(await f.async('string'));
  for(const r of d.getElementsByTagName('Relationship')){ let t=r.getAttribute('Target'); if(!t.startsWith('/')){ const parts=(dir+'/'+t).split('/'); const out=[]; for(const p of parts){ if(p==='..') out.pop(); else if(p&&p!=='.') out.push(p);} t=out.join('/'); } else t=t.slice(1); map[r.getAttribute('Id')]=t; }
  return map;
}
async function mediaURL(zip,path){ const f=zip.file(path); if(!f) return null; const ext=path.split('.').pop().toLowerCase(); const mime={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',svg:'image/svg+xml',bmp:'image/bmp',webp:'image/webp'}[ext]; if(!mime) return null; return `data:${mime};base64,`+await f.async('base64'); }
const hasAr=t=>/[؀-ۿ]/.test(t);

async function parseDocx(buf){
  const Z=await lib('jszip'); const zip=await Z.loadAsync(buf);
  const path='word/document.xml', doc=xmlDoc(await zip.file(path).async('string')), rels=await relsOf(zip,path);
  const body=all(doc,NS.w,'body')[0]; let html='', list=null;
  const runs=async(p)=>{
    let out='';
    for(const r of all(p,NS.w,'r')){
      const pr=kid(r,NS.w,'rPr'); let st='';
      if(pr){ const c=wval(kid(pr,NS.w,'color')); if(c&&c!=='auto') st+=`color:#${c};`; const sz=wval(kid(pr,NS.w,'sz')); if(sz) st+=`font-size:${Math.round(+sz/2*1.333)}px;`; }
      let t='';
      for(const c of r.children){
        if(c.localName==='t') t+=esc(c.textContent);
        else if(c.localName==='tab') t+='&emsp;';
        else if(c.localName==='br') t+='<br>';
        else if(c.localName==='drawing'){ const b=all(c,NS.a,'blip')[0]; const id=b&&(b.getAttributeNS(NS.r,'embed')); if(id&&rels[id]){ const u=await mediaURL(zip,rels[id]); if(u) t+=`<img src="${u}" alt="">`; } }
      }
      if(!t) continue;
      if(pr&&kid(pr,NS.w,'b')&&wval(kid(pr,NS.w,'b'))!=='0') t=`<b>${t}</b>`;
      if(pr&&kid(pr,NS.w,'i')) t=`<i>${t}</i>`;
      if(pr&&kid(pr,NS.w,'u')&&wval(kid(pr,NS.w,'u'))!=='none') t=`<u>${t}</u>`;
      out+=st?`<span style="${st}">${t}</span>`:t;
    }
    return out;
  };
  const para=async(p)=>{
    const pr=kid(p,NS.w,'pPr'), style=(wval(kid(pr,NS.w,'pStyle'))||'').toLowerCase(), jc=wval(kid(pr,NS.w,'jc'));
    const inner=await runs(p), txt=p.textContent;
    const dir=(pr&&kid(pr,NS.w,'bidi'))||hasAr(txt)?'rtl':'ltr';
    const al=jc==='center'?'center':jc==='both'?'justify':'';
    const isList=style.includes('list')||(pr&&kid(pr,NS.w,'numPr'));
    let tag='p'; if(style==='title') tag='h1'; else if(/heading\s?1|^1$/.test(style)) tag='h2'; else if(/heading\s?[2-9]/.test(style)) tag='h3';
    return {isList,html:`<${isList?'li':tag} dir="${dir}"${al?` style="text-align:${al}"`:''}>${inner||'&nbsp;'}</${isList?'li':tag}>`};
  };
  for(const el of body.children){
    if(el.localName==='p'){ const r=await para(el); if(r.isList){ list=(list||'')+r.html; continue; } if(list){ html+=`<ul>${list}</ul>`; list=null; } html+=r.html; }
    else if(el.localName==='tbl'){
      if(list){ html+=`<ul>${list}</ul>`; list=null; }
      let t='<table>'; let first=true;
      for(const tr of kids(el,NS.w,'tr')){ t+='<tr>'; for(const tc of kids(tr,NS.w,'tc')){ const span=wval(kid(kid(tc,NS.w,'tcPr'),NS.w,'gridSpan')); let c=''; for(const p of kids(tc,NS.w,'p')) c+=(await para(p)).html; t+=`<${first?'th':'td'}${span?` colspan="${span}"`:''}>${c}</${first?'th':'td'}>`; } t+='</tr>'; first=false; }
      html+=t+'</table>';
    }
  }
  if(list) html+=`<ul>${list}</ul>`;
  return html;
}
const colName=n=>{let s='';n++;while(n>0){const m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=Math.floor((n-1)/26);}return s;};
const colIdx=s=>s.split('').reduce((t,c)=>t*26+c.charCodeAt(0)-64,0)-1;
async function parseXlsx(buf){
  const Z=await lib('jszip'); const zip=await Z.loadAsync(buf);
  const wb=xmlDoc(await zip.file('xl/workbook.xml').async('string')), rels=await relsOf(zip,'xl/workbook.xml');
  const ssF=zip.file('xl/sharedStrings.xml'); const ss=ssF?all(xmlDoc(await ssF.async('string')),NS.s,'si').map(si=>all(si,NS.s,'t').map(t=>t.textContent).join('')):[];
  const sheets=[];
  for(const sh of all(wb,NS.s,'sheet')){
    const id=sh.getAttributeNS(NS.r,'id'), path=rels[id]; const f=path&&zip.file(path); if(!f) continue;
    const d=xmlDoc(await f.async('string')); const rtl=all(d,NS.s,'sheetView').some(v=>v.getAttribute('rightToLeft')==='1'||v.getAttribute('rightToLeft')==='true');
    const cells={}; let mr=0, mc=0;
    for(const c of all(d,NS.s,'c')){
      const ref=c.getAttribute('r'); const m=/^([A-Z]+)(\d+)$/.exec(ref); if(!m) continue;
      const ci=colIdx(m[1]), ri=+m[2]-1; if(ri>499||ci>51) continue;
      const t=c.getAttribute('t'), v=kid(c,NS.s,'v'), fo=kid(c,NS.s,'f');
      let val=v?v.textContent:'', num=false;
      if(t==='s') val=ss[+val]??''; else if(t==='inlineStr') val=all(c,NS.s,'t').map(x=>x.textContent).join(''); else if(t==='b') val=val==='1'?'TRUE':'FALSE'; else if(t!=='str'&&t!=='e'&&val!==''){ num=true; const n=+val; val=Number.isInteger(n)?String(n):String(+n.toFixed(4)); }
      cells[ref]={v:val,num,f:fo?fo.textContent:null}; mr=Math.max(mr,ri); mc=Math.max(mc,ci);
    }
    sheets.push({name:sh.getAttribute('name'),rtl,cells,rows:Math.max(mr+1,20),cols:Math.max(mc+1,8)});
  }
  return sheets;
}
async function parsePptx(buf){
  const Z=await lib('jszip'); const zip=await Z.loadAsync(buf);
  const pres=xmlDoc(await zip.file('ppt/presentation.xml').async('string')), rels=await relsOf(zip,'ppt/presentation.xml');
  const slides=[];
  for(const sid of all(pres,NS.p,'sldId')){
    const path=rels[sid.getAttributeNS(NS.r,'id')]; const f=path&&zip.file(path); if(!f) continue;
    const d=xmlDoc(await f.async('string')), srels=await relsOf(zip,path);
    const S_={title:'',sub:'',items:[],img:null,cover:false};
    for(const sp of all(d,NS.p,'sp')){
      const ph=all(sp,NS.p,'ph')[0], type=ph?ph.getAttribute('type')||'body':'body';
      const paras=all(sp,NS.a,'p').map(p=>({t:all(p,NS.a,'t').map(x=>x.textContent).join(''),lvl:+((kid(p,NS.a,'pPr')||{getAttribute:()=>0}).getAttribute('lvl')||0)})).filter(x=>x.t.trim());
      if(!paras.length) continue;
      if(type==='title'||type==='ctrTitle'){ S_.title=paras.map(x=>x.t).join(' '); if(type==='ctrTitle') S_.cover=true; }
      else if(type==='subTitle') S_.sub=paras.map(x=>x.t).join(' — ');
      else S_.items.push(...paras);
    }
    for(const pic of all(d,NS.p,'pic')){ const b=all(pic,NS.a,'blip')[0]; const id=b&&b.getAttributeNS(NS.r,'embed'); if(id&&srels[id]){ S_.img=await mediaURL(zip,srels[id]); if(S_.img) break; } }
    slides.push(S_);
  }
  return slides;
}
function slideHTML(s){
  const dir=hasAr(s.title+s.sub+s.items.map(i=>i.t).join(''))?'rtl':'ltr';
  if(s.cover||(!s.items.length&&s.sub)) return `<div class="sl cover" dir="${dir}"><h2>${esc(s.title)}</h2>${s.sub?`<p>${esc(s.sub)}</p>`:''}</div>`;
  return `<div class="sl" dir="${dir}">${s.title?`<h2>${esc(s.title)}</h2>`:''}${s.items.length?`<ul style="${s.img?'max-width:50%':''}">${s.items.map(i=>`<li style="margin-inline-start:${i.lvl*3}cqw">${esc(i.t)}</li>`).join('')}</ul>`:''}${s.img?`<img src="${s.img}" alt="">`:''}</div>`;
}
const OFFICE_APPS={
  word:{t:'docx',n:'مستندات Word',lo:'LibreOffice Writer',i:'word',c:'#2f6fe4'},
  excel:{t:'xlsx',n:'جداول Excel',lo:'LibreOffice Calc',i:'table',c:'#16a34a'},
  ppt:{t:'pptx',n:'عروض PowerPoint',lo:'LibreOffice Impress',i:'slides',c:'#c2410c'}
};
const Office={
  mode:'word', name:'', zoom:1, slides:[], si:0, sheets:[], shi:0,
  init(){
    $('#ofFile').onchange=async e=>{ const f=e.target.files[0]; e.target.value=''; if(!f) return; const node=FS.add('down',{name:FS.uniqueName(FS.find('down'),f.name),type:extOf(f.name),size:f.size,blob:f}); openFile(node); };
    $('#ofBar').addEventListener('click',e=>this.onBar(e));
    $('#ofStage').addEventListener('click',e=>{
      const td=e.target.closest('td[data-r]'); if(td){ $$('#ofStage td.on').forEach(x=>x.classList.remove('on')); td.classList.add('on'); const c=this.sheets[this.shi].cells[td.dataset.r]; $('#fbRef').textContent=td.dataset.r; $('#fbVal').textContent=c?(c.f?'='+c.f:c.v):''; return; }
      const tb=e.target.closest('[data-sheet]'); if(tb){ this.shi=+tb.dataset.sheet; this.renderSheet(); return; }
      const rf=e.target.closest('[data-fid]'); if(rf){ openFile(FS.find(rf.dataset.fid)); return; }
      if(e.target.closest('[data-of=device]')) $('#ofFile').click();
      if(e.target.closest('[data-of=new]')) toast('في النظام الحقيقي يفتح '+OFFICE_APPS[this.mode].lo+' بمستند جديد');
    });
    $('#ofThumbs').addEventListener('click',e=>{ const t=e.target.closest('[data-si]'); if(t) this.goSlide(+t.dataset.si); });
    $('#showOv').addEventListener('click',()=>{ if(this.si>=this.slides.length-1) this.endShow(); else { this.goSlide(this.si+1); this.syncShow(); } });
  },
  launch(mode){
    this.mode=mode; const A=OFFICE_APPS[mode]; go('office'); setTitle(A.n);
    $('#ofThumbs').hidden=true;
    const files=[]; const walk=(n,drive)=>{ for(const c of n.children||[]){ if(c.type===A.t) files.push([c,drive]); if(c.children) walk(c,drive);} };
    walk(FS.drives.internal,'الذاكرة الداخلية'); if(FS.drives.usb.connected) walk(FS.drives.usb,'الفلاشة');
    $('#ofStage').innerHTML=`<div style="max-width:900px;margin:0 auto">
      <div class="app-head"><span class="ficon" style="--c:${A.c};width:64px;height:64px">${icon(A.i)}</span><div><h1 class="h1">${A.n}</h1><p class="sub" style="margin:0">قراءة سريعة للملفات — والتعديل يكون بـ ${A.lo}</p></div></div>
      <div class="btns" style="margin-bottom:20px"><button class="btn primary" data-of="device">${icon('upload')}فتح ملف من الجهاز</button><button class="btn" data-of="new">${icon('plus')}ملف جديد</button><button class="btn ghost" data-go="files">${icon('folder')}مستكشف الملفات</button></div>
      <div class="card"><h3>${icon('doc')}الملفات الموجودة (${nf(files.length)})</h3>
      ${files.length?`<div class="fgrid">${files.map(([f,dr])=>`<button class="fitem" data-fid="${f.id}"><span class="ficon" style="--c:${A.c}">${icon(A.i)}</span><span class="fname">${esc(f.name)}</span><span class="fmeta">${dr}</span></button>`).join('')}</div>`:'<div class="empty">ماكو ملفات من هذا النوع</div>'}</div></div>`;
    this.bar([]);
  },
  bar(extra){
    const A=OFFICE_APPS[this.mode];
    $('#ofBar').innerHTML=`<button class="dbtn home" data-go="home">${icon('home')}</button><button class="dbtn" data-go="files" title="الملفات">${icon('folder')}</button>
      <button class="dbtn" data-ob="device" title="فتح ملف">${icon('upload')}</button><span class="name">${esc(this.name||'')}</span><span class="grow"></span>${extra.join('')}<span class="grow"></span>
      ${A&&this.name?`<button class="btn sm ghost" data-ob="edit">${icon('edit')}تعديل بـ ${A.lo}</button>`:''}
      <button class="dbtn" data-ob="full" title="ملء الشاشة">${icon('fit')}</button>`;
  },
  loading(){ $('#ofStage').innerHTML='<div class="empty"><div class="spin"></div>جاري فتح الملف…</div>'; },
  async open(type,buf,name){
    this.mode={docx:'word',xlsx:'excel',pptx:'ppt'}[type]; this.name=name; go('office'); setTitle(name); $('#ofThumbs').hidden=true; this.bar([]); this.loading();
    try{
      if(type==='docx'){ const html=await parseDocx(buf); this.zoom=1; $('#ofStage').innerHTML=`<div class="docpage" id="docPage">${html}</div>`; this.barWord(); }
      if(type==='xlsx'){ this.sheets=await parseXlsx(buf); this.shi=0; this.renderSheet(); this.bar([]); }
      if(type==='pptx'){ this.slides=await parsePptx(buf); this.si=0; this.renderSlides(); }
    }catch(err){ console.warn(err); $('#ofStage').innerHTML=`<div class="empty">${icon('info')}<b>${window.JSZip?'تعذر قراءة الملف — ممكن يكون تالف أو بصيغة قديمة':'تعذر تحميل قارئ الملفات — هاي المعاينة تحتاج إنترنت'}</b></div>`; }
  },
  barWord(){ this.bar([`<button class="dbtn" data-ob="zout">${icon('zoomOut')}</button><span class="pg" id="zoomLbl">${nf(Math.round(this.zoom*100))}٪</span><button class="dbtn" data-ob="zin">${icon('zoomIn')}</button>`]); },
  renderSheet(){
    const sh=this.sheets[this.shi]; if(!sh){ $('#ofStage').innerHTML='<div class="empty">الملف فارغ</div>'; return; }
    let h=`<div class="fbar"><b id="fbRef">A1</b><span id="fbVal"></span></div><div class="sheetwrap" dir="${sh.rtl?'rtl':'ltr'}"><table class="sheet"><tr><th></th>`;
    for(let c=0;c<sh.cols;c++) h+=`<th>${colName(c)}</th>`; h+='</tr>';
    for(let r=0;r<sh.rows;r++){ h+=`<tr><td class="rn">${r+1}</td>`; for(let c=0;c<sh.cols;c++){ const ref=colName(c)+(r+1), cell=sh.cells[ref]; h+=`<td data-r="${ref}" class="${cell&&cell.num?'num':''}${r===0?' b':''}">${cell?esc(cell.v):''}</td>`; } h+='</tr>'; }
    h+=`</table></div><div class="tabs">${this.sheets.map((s,i)=>`<button class="${i===this.shi?'on':''}" data-sheet="${i}">${esc(s.name)}</button>`).join('')}</div>`;
    $('#ofStage').innerHTML=h; const first=$('#ofStage td[data-r="A1"]'); first&&first.click();
  },
  renderSlides(){
    const th=$('#ofThumbs'); th.hidden=false;
    th.innerHTML=this.slides.map((s,i)=>`<button class="sthumb${i===this.si?' on':''}" data-si="${i}">${nf(i+1)}<span class="mini"><span class="slide">${slideHTML(s)}</span></span></button>`).join('');
    $('#ofStage').innerHTML=`<div class="slide" id="slideMain">${this.slides.length?slideHTML(this.slides[this.si]):''}</div>`;
    this.bar([`<button class="dbtn" data-ob="sprev">${icon('chevR')}</button><span class="pg">${nf(this.si+1)} / ${nf(this.slides.length)}</span><button class="dbtn" data-ob="snext">${icon('chevL')}</button><button class="btn sm primary" data-ob="show">${icon('play')}بدء العرض</button>`]);
  },
  goSlide(i){ this.si=clamp(i,0,this.slides.length-1); this.renderSlides(); },
  show(){ $('#showOv').hidden=false; this.syncShow(); try{ document.documentElement.requestFullscreen().catch(()=>{}); }catch(_){} },
  syncShow(){ $('#showOv').innerHTML=`<div class="slide">${slideHTML(this.slides[this.si])}</div>`; },
  endShow(){ $('#showOv').hidden=true; try{ document.fullscreenElement&&document.exitFullscreen(); }catch(_){} },
  openImage(src,name){
    this.mode='image'; this.name=name; this.imgSrc=src; go('office'); setTitle(name); $('#ofThumbs').hidden=true;
    $('#ofStage').innerHTML=`<div class="imgview" style="height:100%"><img src="${src}" alt=""></div>`;
    this.bar([`<button class="btn sm" data-ob="toBoardBg">${icon('grid')}خلفية للسبورة</button><button class="btn sm" data-ob="toBoard">${icon('board')}إدراج في السبورة</button>`]);
  },
  async onBar(e){
    const b=e.target.closest('[data-ob]'); if(!b) return; const a=b.dataset.ob;
    if(a==='device') $('#ofFile').click();
    if(a==='full') toggleFullscreen();
    if(a==='edit') toast('في النظام الحقيقي يفتح الملف بـ '+OFFICE_APPS[this.mode].lo);
    if(a==='zin'||a==='zout'){ this.zoom=clamp(this.zoom*(a==='zin'?1.15:1/1.15),.5,2.5); $('#docPage').style.transform=`scale(${this.zoom})`; $('#docPage').style.marginBottom=((this.zoom-1)*1100)+'px'; $('#zoomLbl').textContent=nf(Math.round(this.zoom*100))+'٪'; }
    if(a==='sprev') this.goSlide(this.si-1); if(a==='snext') this.goSlide(this.si+1);
    if(a==='show') this.show();
    if(a==='toBoard'){ go('board'); Board.insertImage(this.imgSrc); }
    if(a==='toBoardBg'){ const {url}=await shrinkImage(this.imgSrc,2400); go('board'); Board.setBg({type:'image',img:url,fit:'cover'}); toast('تم وضع الصورة كخلفية للسبورة'); }
  }
};
onShow.office=()=>{};
