
/* =====================================================================
   FILE SYSTEM (virtual) + FILE EXPLORER + STORAGE
   ===================================================================== */
const FT={
  dir:['#e6a019','folder','مجلد'], pdf:['#e0413a','pdf','PDF'], docx:['#2f6fe4','word','مستند Word'], xlsx:['#16a34a','table','جدول Excel'],
  pptx:['#c2410c','slides','عرض PowerPoint'], board:['#f0703e','board','ملف سبورة'], png:['#0e9f8e','image','صورة'], jpg:['#0e9f8e','image','صورة'],
  mp4:['#7c3aed','video','فيديو'], mp3:['#db2777','music','صوت'], zip:['#64748b','zip','أرشيف'], txt:['#475569','doc','نص'], csv:['#16a34a','table','جدول CSV'], other:['#64748b','doc','ملف']
};
const extOf=n=>{const m=/\.([a-z0-9]+)$/i.exec(n);let e=m?m[1].toLowerCase():'other';if(e==='jpeg')e='jpg';if(e==='doc')e='docx';if(e==='ppt')e='pptx';if(e==='xls')e='xlsx';if(['webm','mkv','mov','m4v','ogv','avi','3gp'].includes(e))e='mp4';if(['wav','ogg','oga','m4a','aac','flac','opus','wma'].includes(e))e='mp3';return FT[e]?e:'other';};
const GB=1e9, MB=1e6, KB=1e3;
const FS={
  drives:null,
  QUICK:[['docs','المستندات','doc'],['boards','السبورات المحفوظة','board'],['down','التنزيلات','download'],['pics','الصور','image'],['vids','الفيديو','video'],['bt','المستلمة عبر البلوتوث','bluetooth']],
  init(){
    const f=(name,size,extra={})=>({id:uid(),name,type:extOf(name),size,mtime:Date.now()-Math.random()*20*864e5,...extra});
    const d=(name,children,id)=>({id:id||uid(),name,type:'dir',children,mtime:Date.now()-Math.random()*40*864e5});
    const def={
      internal:{id:'internal',name:'الذاكرة الداخلية',cap:256*GB,children:[
        d('المستندات',[
          d('الرياضيات',[f('الفصل الثالث - المعادلات.pdf',54*KB,{sample:'pdf'}),f('درجات الرياضيات.xlsx',9*KB,{sample:'xlsx'})]),
          d('العلوم',[f('قوانين نيوتن.pptx',2.4*MB,{sample:'pptx'}),f('تجارب المختبر.pdf',1.2*MB,{sample:'pdf'})]),
          f('خطة الدرس اليومية.docx',37*KB,{sample:'docx'}),f('درجات الطلاب.xlsx',12*KB,{sample:'xlsx'}),
          f('عرض الفيزياء.pptx',3.1*MB,{sample:'pptx'}),f('جدول الحصص.pdf',120*KB,{sample:'pdf'})],'docs'),
        d('السبورات المحفوظة',[f('سبورة - مثال محلول.board',18*KB,{sample:'board'})],'boards'),
        d('التنزيلات',[f('دليل المدرس.pdf',3.1*MB,{sample:'pdf'}),f('صور النشاط.zip',14*MB)],'down'),
        d('الصور',[f('رحلة المدرسة.jpg',2.2*MB,{sample:'art1'}),f('مختبر العلوم.png',1.8*MB,{sample:'art2'})],'pics'),
        d('الفيديو',[f('تجربة كيميائية.mp4',68*MB),f('حفل التخرج.mp4',1.9*GB)],'vids'),
        d('المستلمة عبر البلوتوث',[],'bt')]},
      usb:{id:'usb',name:'KINGSTON',cap:16*GB,fsType:'exFAT',connected:true,children:[
        f('امتحان الشهر الأول.pdf',430*KB,{sample:'pdf'}),d('واجبات الطلاب',[f('واجب الرياضيات.docx',37*KB,{sample:'docx'}),f('نتائج الواجب.xlsx',8*KB,{sample:'xlsx'})]),
        f('قوانين نيوتن.pptx',5*MB,{sample:'pptx'}),f('فيديو النشاط.mp4',2.6*GB)]}
    };
    const saved=store.get('fs',null);
    this.drives=saved&&saved.internal?saved:def;
  },
  persist(){
    const strip=n=>{ const o={...n}; delete o.blob; if(o.children) o.children=o.children.map(strip); return o; };
    const ok=store.set('fs',{internal:strip(this.drives.internal),usb:strip(this.drives.usb)});
    if(!ok){ const lite=n=>{const o={...n};delete o.blob;if(o.data&&JSON.stringify(o.data).length>200000){delete o.data;o.lost=true;}if(o.children)o.children=o.children.map(lite);return o;}; store.set('fs',{internal:lite(this.drives.internal),usb:lite(this.drives.usb)}); }
  },
  find(id,node){ node=node||null; const roots=node?[node]:[this.drives.internal,this.drives.usb];
    for(const r of roots){ if(r.id===id) return r; for(const c of (r.children||[])){ if(c.id===id) return c; if(c.children){ const x=this.find(id,c); if(x) return x; } } } return null; },
  parentOf(id,node){ for(const r of node?[node]:[this.drives.internal,this.drives.usb]){ for(const c of (r.children||[])){ if(c.id===id) return r; if(c.children){ const x=this.parentOf(id,c); if(x) return x; } } } return null; },
  add(folderId,file){ const dir=this.find(folderId)||this.drives.internal; const node={id:uid(),mtime:Date.now(),...file}; dir.children.unshift(node); this.persist(); if(current==='files') Files.render(); return node; },
  size(n){ return n.type==='dir'?(n.children||[]).reduce((t,c)=>t+this.size(c),0):(n.size||0); },
  count(n){ return (n.children||[]).length; },
  uniqueName(dir,name){ const names=new Set(dir.children.map(c=>c.name)); if(!names.has(name)) return name; const m=/^(.*?)(\.[^.]+)?$/.exec(name); let i=2; while(names.has(`${m[1]} (${i})${m[2]||''}`)) i++; return `${m[1]} (${i})${m[2]||''}`; },
  clone(n){ const c={...n,id:uid(),mtime:Date.now()}; if(n.children) c.children=n.children.map(x=>this.clone(x)); return c; },
  async bufferOf(n){
    if(n.blob) return await n.blob.arrayBuffer();
    if(n.sample&&SAMPLES[n.sample]) return b64ToBuf(SAMPLES[n.sample]);
    if(typeof n.data==='string'&&n.data.startsWith('data:')) return b64ToBuf(n.data.split(',')[1]);
    return null;
  }
};
function artImage(kind){
  const c=document.createElement('canvas'); c.width=960; c.height=640; const x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,0,640);
  if(kind==='art1'){ g.addColorStop(0,'#7dd3fc'); g.addColorStop(.6,'#e0f2fe'); g.addColorStop(.61,'#86efac'); g.addColorStop(1,'#16a34a'); x.fillStyle=g; x.fillRect(0,0,960,640);
    x.fillStyle='#fde047'; x.beginPath(); x.arc(780,120,60,0,7); x.fill();
    x.fillStyle='#166534'; for(let i=0;i<7;i++){ x.beginPath(); x.moveTo(60+i*140,420); x.lineTo(110+i*140,250); x.lineTo(160+i*140,420); x.fill(); }
    x.fillStyle='#132557'; x.fillRect(360,300,240,140); x.fillStyle='#f0703e'; x.beginPath(); x.moveTo(340,300); x.lineTo(480,220); x.lineTo(620,300); x.fill(); }
  else { g.addColorStop(0,'#1e293b'); g.addColorStop(1,'#0f172a'); x.fillStyle=g; x.fillRect(0,0,960,640);
    const cols=['#22d3ee','#a3e635','#f472b6','#fbbf24'];
    for(let i=0;i<4;i++){ const cx=200+i*180; x.fillStyle='rgba(255,255,255,.12)'; x.fillRect(cx-40,180,80,300); x.fillStyle=cols[i]; x.fillRect(cx-36,300+i*30,72,176-i*30); x.fillStyle='rgba(255,255,255,.5)'; x.fillRect(cx-50,170,100,14); }
    x.fillStyle='#fff'; x.font='bold 44px sans-serif'; x.textAlign='center'; x.fillText('LAB',480,110); }
  return c.toDataURL('image/jpeg',.85);
}
function sampleBoard(){
  const it=[]; const c='#132557';
  it.push({id:uid(),t:'text',text:'حل المعادلة:  2x + 5 = 17',dir:'rtl',fs:46/REF,c,bx:.3,by:.04,bw:.4,bh:62/REF,rot:0});
  it.push({id:uid(),t:'shape',k:'line',a:[.2,.12],b:[.8,.12],c:'#f0703e',w:4/REF});
  it.push({id:uid(),t:'text',text:'2x = 17 − 5\n2x = 12\nx = 6',dir:'ltr',fs:44/REF,c:'#2563eb',bx:.42,by:.16,bw:.16,bh:3*44*1.35/REF,rot:0});
  it.push({id:uid(),t:'shape',k:'rect',bx:.4,by:.15,bw:.2,bh:.1,c:'#16a34a',w:4/REF,fill:false,rot:0});
  it.push({id:uid(),t:'shape',k:'axes',bx:.08,by:.1,bw:.25,bh:.25,c:'#334155',w:3/REF,fill:false,rot:0});
  return {v:2,pi:0,pages:[{bg:{type:'grid'},items:it}]};
}

const Files={
  drive:'internal', path:[], view:'grid', selMode:false, sel:new Set(), q:'',
  init(){
    $('#fxSide').addEventListener('click',async e=>{
      if(e.target.closest('[data-eject]')){ e.stopPropagation(); this.eject(); return; }
      if(e.target.closest('[data-plug]')){ FS.drives.usb.connected=true; FS.persist(); this.open('usb'); updateStatus(); toast('تم توصيل فلاشة USB'); return; }
      const b=e.target.closest('[data-drive]'); if(b){ this.open(b.dataset.drive,b.dataset.folder); }
    });
    $('#fxMain').addEventListener('click',e=>this.onMain(e));
    $('#fxMain').addEventListener('input',e=>{ if(e.target.id==='fxQ'){ this.q=e.target.value.trim(); this.renderGrid(); } });
    $('#fxDevice').onchange=async e=>{ const files=[...e.target.files]; e.target.value=''; for(const f of files) await this.importDevice(f); };
    this.render();
  },
  get root(){ return FS.drives[this.drive]; },
  get dir(){ let n=this.root; for(const id of this.path){ const c=(n.children||[]).find(x=>x.id===id); if(!c) break; n=c; } return n; },
  open(drive,folder){
    if(drive==='usb'&&!FS.drives.usb.connected){ toast('ماكو فلاشة موصولة',false); drive='internal'; }
    this.drive=drive; this.path=folder?[folder]:[]; this.sel.clear(); this.selMode=false; this.q=''; this.render();
  },
  render(){ this.renderSide(); this.renderMain(); },
  renderSide(){
    const I=FS.drives.internal, U=FS.drives.usb, iu=Storage.internalUsed(), uu=FS.size(U);
    const cur=(d,f)=>this.drive===d&&((f&&this.path[0]===f&&this.path.length===1)||(!f&&!this.path.length));
    $('#fxSide').innerHTML=`<h4>الذاكرة الداخلية</h4>
      <button class="nav-btn${cur('internal')?' on':''}" data-drive="internal">${icon('hdd')}<span class="txt">الذاكرة الداخلية</span></button>
      <div class="drive-card"><div class="meter"><i style="width:${iu/I.cap*100}%"></i></div>${fmtSize(I.cap-iu)} متوفرة من ${fmtSize(I.cap)}</div>
      ${FS.QUICK.map(([id,n,ic])=>{const node=FS.find(id);return `<button class="nav-btn${cur('internal',id)?' on':''}" data-drive="internal" data-folder="${id}">${icon(ic)}<span class="txt">${n}</span><span class="end">${node?nf(FS.count(node)):''}</span></button>`;}).join('')}
      <h4>الأجهزة الخارجية</h4>
      ${U.connected?`<button class="nav-btn${this.drive==='usb'?' on':''}" data-drive="usb">${icon('usb')}<span class="txt">فلاشة ${esc(U.name)}</span><span class="end" data-eject title="إخراج">${icon('eject')}</span></button>
        <div class="drive-card"><div class="meter"><i style="width:${uu/U.cap*100}%"></i></div>${fmtSize(U.cap-uu)} متوفرة من ${fmtSize(U.cap)} • ${U.fsType}</div>`
        :`<div class="drive-card">ماكو فلاشة موصولة</div><button class="nav-btn" data-plug>${icon('usb')}<span class="txt">محاكاة توصيل فلاشة</span></button>`}`;
  },
  renderMain(){
    const crumbs=[[null,this.drive==='usb'?'فلاشة '+FS.drives.usb.name:'الذاكرة الداخلية']];
    let n=this.root; for(const id of this.path){ n=n.children.find(x=>x.id===id); if(!n) break; crumbs.push([id,n.name]); }
    $('#fxMain').innerHTML=`<div class="fx-bar">
        <button class="icon-btn" data-fx="up" ${this.path.length?'':'disabled'} title="رجوع">${icon('chevR')}</button>
        <div class="crumbs">${crumbs.map(([id,nm],i)=>`${i?'<span class="sepc">›</span>':''}<button data-crumb="${i}">${esc(nm)}</button>`).join('')}</div>
        <label class="search" style="min-width:200px;height:44px">${icon('search')}<input id="fxQ" type="search" placeholder="بحث" value="${esc(this.q)}"></label>
        <button class="icon-btn" data-fx="view" title="طريقة العرض">${icon(this.view==='grid'?'list':'apps')}</button>
        <button class="icon-btn${this.selMode?' on':''}" data-fx="select" title="تحديد">${icon('check')}</button>
        <button class="icon-btn" data-fx="newdir" title="مجلد جديد">${icon('folderPlus')}</button>
        <button class="btn primary" data-fx="device">${icon('upload')}<span class="txt">فتح ملف من الجهاز</span></button>
      </div><div id="fxGridWrap" class="${this.view==='list'?'flist':''} ${this.selMode?'selmode':''}"><div class="fgrid" id="fxGrid"></div></div><div id="fxSelBar"></div>`;
    this.renderGrid();
  },
  items(){
    let list=this.dir.children||[];
    if(this.q){ const q=this.q.toLowerCase(); const all=[]; const walk=n=>{ for(const c of n.children||[]){ if(c.name.toLowerCase().includes(q)) all.push(c); if(c.children) walk(c);} }; walk(this.dir); list=all; }
    return [...list].sort((a,b)=>(a.type==='dir'?0:1)-(b.type==='dir'?0:1)||b.mtime-a.mtime);
  },
  renderGrid(){
    const g=$('#fxGrid'); if(!g) return; const list=this.items();
    g.innerHTML=list.length?list.map(it=>{
      const [c,ic,lbl]=FT[it.type]||FT.other;
      const thumb=(it.type==='png'||it.type==='jpg')?(it.data||(it.sample&&(imgSamples[it.sample]||(imgSamples[it.sample]=artImage(it.sample))))):null;
      const meta=it.type==='dir'?`${nf(FS.count(it))} عنصر`:`${fmtSize(it.size||0)}`;
      return `<button class="fitem${this.sel.has(it.id)?' sel':''}" data-id="${it.id}"><span class="ck">${icon('check')}</span>
        <span class="ficon${thumb?' thumbimg':''}" style="--c:${c};${thumb?`background-image:url(${thumb})`:''}">${thumb?'':icon(ic)}</span>
        <span class="fname">${esc(it.name)}</span><span class="fmeta">${meta}</span></button>`;
    }).join(''):`<div class="empty" style="grid-column:1/-1">${icon(this.q?'search':'folder')}<b>${this.q?'ماكو نتائج':'المجلد فارغ'}</b></div>`;
    this.renderSel();
  },
  renderSel(){
    const bar=$('#fxSelBar'); if(!bar) return;
    if(!this.selMode||!this.sel.size){ bar.innerHTML=''; return; }
    const other=this.drive==='usb'?'الذاكرة الداخلية':'الفلاشة', canOther=this.drive==='usb'||FS.drives.usb.connected;
    bar.innerHTML=`<div class="selbar"><b>تم تحديد ${nf(this.sel.size)}</b>
      ${this.sel.size===1?`<button class="btn sm" data-fx="open">${icon('doc')}فتح</button><button class="btn sm" data-fx="rename">${icon('edit')}إعادة تسمية</button>`:''}
      <button class="btn sm" data-fx="copy" ${canOther?'':'disabled'}>${icon('copy')}نسخ إلى ${other}</button>
      <button class="btn sm" data-fx="move" ${canOther?'':'disabled'}>${icon('upload')}نقل إلى ${other}</button>
      <button class="btn sm danger" data-fx="del">${icon('trash')}حذف</button></div>`;
  },
  async onMain(e){
    const cr=e.target.closest('[data-crumb]'); if(cr){ this.path=this.path.slice(0,+cr.dataset.crumb); this.sel.clear(); this.render(); return; }
    const b=e.target.closest('[data-fx]');
    if(b){ const a=b.dataset.fx;
      if(a==='up'){ this.path.pop(); this.sel.clear(); this.render(); }
      if(a==='view'){ this.view=this.view==='grid'?'list':'grid'; this.renderMain(); }
      if(a==='select'){ this.selMode=!this.selMode; this.sel.clear(); this.renderMain(); }
      if(a==='device') $('#fxDevice').click();
      if(a==='newdir'){ const n=await promptBox('اسم المجلد الجديد','مجلد جديد'); if(n){ this.dir.children.unshift({id:uid(),name:FS.uniqueName(this.dir,n),type:'dir',children:[],mtime:Date.now()}); FS.persist(); this.render(); } }
      if(a==='open'){ const id=[...this.sel][0]; this.selMode=false; this.sel.clear(); this.openNode(FS.find(id)); }
      if(a==='rename'){ const node=FS.find([...this.sel][0]); const n=await promptBox('إعادة تسمية',node.name); if(n&&n!==node.name){ node.name=n; FS.persist(); this.renderGrid(); toast('تمت إعادة التسمية'); } }
      if(a==='del'){ if(await confirmBox('حذف الملفات',`راح ينحذف ${nf(this.sel.size)} عنصر نهائياً.`,'حذف',true,'trash')){ for(const id of this.sel){ const p=FS.parentOf(id); if(p) p.children=p.children.filter(c=>c.id!==id); } this.sel.clear(); FS.persist(); this.render(); toast('تم الحذف'); } }
      if(a==='copy'||a==='move'){
        const target=this.drive==='usb'?FS.find('docs'):FS.drives.usb; const need=[...this.sel].reduce((t,id)=>t+FS.size(FS.find(id)),0);
        if(this.drive!=='usb'&&need>FS.drives.usb.cap-FS.size(FS.drives.usb)){ toast('ماكو مساحة كافية بالفلاشة',false); return; }
        await this.progress(a==='copy'?'جاري النسخ…':'جاري النقل…',need);
        for(const id of this.sel){ const n=FS.find(id); const c=FS.clone(n); c.name=FS.uniqueName(target,n.name); target.children.unshift(c); if(a==='move'){ const p=FS.parentOf(id); p.children=p.children.filter(x=>x.id!==id); } }
        this.sel.clear(); FS.persist(); this.render(); toast(a==='copy'?'تم النسخ':'تم النقل');
      }
      return;
    }
    const it=e.target.closest('.fitem'); if(!it) return;
    const node=FS.find(it.dataset.id); if(!node) return;
    if(this.selMode){ this.sel.has(node.id)?this.sel.delete(node.id):this.sel.add(node.id); it.classList.toggle('sel'); this.renderSel(); return; }
    this.openNode(node);
  },
  progress(title,bytes){
    const ms=clamp(bytes/MB*6,500,2600);
    return new Promise(res=>{ modal({title,iconName:'copy',body:`<div class="meter" style="height:12px"><i id="cpm" style="width:0;background:var(--acc);transition:width .1s"></i></div><p class="hint" id="cpt" style="margin-top:8px">${fmtSize(bytes)}</p>`,actions:[],
      onOpen:(ov,done)=>{ const t0=performance.now(); const step=()=>{ const p=Math.min(1,(performance.now()-t0)/ms); const m=$('#cpm',ov); if(m) m.style.width=p*100+'%'; if(p<1) requestAnimationFrame(step); else { done(true); res(); } }; step(); }}); });
  },
  async openNode(node){
    if(!node) return;
    if(node.type==='dir'){ if(this.q){ this.q=''; } const chain=[]; let p=node; while(p&&p!==this.root){ chain.unshift(p.id); p=FS.parentOf(p.id,this.root); } this.path=chain; this.sel.clear(); this.render(); return; }
    if(current!=='files') go('files');
    await openFile(node);
  },
  async importDevice(f){
    const type=extOf(f.name);
    const toDown=this.dir===this.root&&this.drive==='internal';
    const node=FS.add(toDown?'down':this.dir.id,{name:FS.uniqueName(toDown?FS.find('down'):this.dir,f.name),type,size:f.size,blob:f});
    if(toDown) toast('تم نسخ الملف إلى «التنزيلات»');
    await openFile(node);
  },
  async eject(){
    if(!await confirmBox('إخراج الفلاشة','تأكد إن ماكو ملف مفتوح من الفلاشة.','إخراج',false,'eject')) return;
    FS.drives.usb.connected=false; FS.persist(); if(this.drive==='usb') this.open('internal'); else this.render(); updateStatus(); toast('يمكنك سحب الفلاشة بأمان');
  }
};
const imgSamples={};
async function openFile(node){
  const t=node.type;
  if(node.lost){ toast('محتوى الملف غير متوفر بهاي المعاينة',false); return; }
  if(t==='pdf'){ const buf=await FS.bufferOf(node); if(buf) Pdf.open(buf,node.name); else toast('تعذر فتح الملف',false); return; }
  if(t==='docx'||t==='xlsx'||t==='pptx'){ const buf=await FS.bufferOf(node); if(buf) Office.open(t,buf,node.name); else toast('تعذر فتح الملف',false); return; }
  if(t==='png'||t==='jpg'){ let src=node.data||(node.sample&&(imgSamples[node.sample]||(imgSamples[node.sample]=artImage(node.sample)))); if(!src&&node.blob) src=URL.createObjectURL(node.blob); Office.openImage(src,node.name); return; }
  if(t==='board'){ const data=node.sample==='board'?sampleBoard():node.data;
    if(!data){ toast('تعذر فتح الملف',false); return; }
    const hasWork=Board.pages.some(p=>p.items.length);
    if(hasWork&&!await confirmBox('فتح سبورة محفوظة','الصفحات الحالية بالسبورة راح تتبدل بالملف المفتوح. تريد تحفظها أول؟ (من زر «حفظ» بالسبورة)','فتح الملف',false,'board')) return;
    Board.loadData(data); go('board'); toast('تم فتح «'+node.name.replace(/\.board$/,'')+'»'); return; }
  if(t==='mp4'||t==='mp3'){ if(node.blob){ const it={name:node.name,src:URL.createObjectURL(node.blob)}; Media.open(it,[it]); } else { go('media'); toast('هذا ملف تجريبي — افتح ملف فيديو أو صوت حقيقي من الجهاز',false); } return; }
  toast(({zip:'يفتح بمدير الأرشيف',txt:'يفتح بمحرر النصوص',csv:'يفتح بـ LibreOffice Calc أو Excel'})[t]||'ماكو برنامج يفتح هذا النوع — نزّل واحد من المتجر');
}
onShow.files=arg=>{ if(arg==='usb') Files.open('usb'); else Files.render(); };

/* ---------------- storage page ---------------- */
const Storage={
  base:{system:9.8*GB,apps:3.4*GB,temp:.85*GB,other:2.1*GB},
  appsSize(){ return this.base.apps+S.installed.reduce((t,id)=>t+((STORE_APPS.find(a=>a.id===id)||{}).size||0),0); },
  cats(){
    const I=FS.drives.internal, sz=id=>{const n=FS.find(id);return n?FS.size(n):0;};
    const docs=sz('docs'), boards=sz('boards'), pics=sz('pics'), vids=sz('vids'), down=sz('down'), bt=sz('bt');
    const loose=(I.children||[]).filter(c=>!FS.QUICK.some(q=>q[0]===c.id)).reduce((t,c)=>t+FS.size(c),0);
    return [['النظام',this.base.system,'#132557'],['التطبيقات',this.appsSize(),'#7c3aed'],['المستندات',docs+down+loose,'#2563eb'],['السبورات',boards,'#f0703e'],
      ['الصور',pics,'#0e9f8e'],['الفيديو',vids,'#db2777'],['المستلمة بالبلوتوث',bt,'#0ea5e9'],['ملفات مؤقتة',this.base.temp,'#f59e0b'],['أخرى',this.base.other,'#94a3b8']];
  },
  internalUsed(){ return this.cats().reduce((t,c)=>t+c[1],0); },
  donut(parts,total){ let a=0; const segs=parts.map(([n,v,c])=>{ const s=a; a+=v/total*360; return `${c} ${s}deg ${a}deg`; }); segs.push(`var(--surface-3) ${a}deg 360deg`); return `conic-gradient(${segs.join(',')})`; },
  render(){
    const I=FS.drives.internal, U=FS.drives.usb, cats=this.cats(), used=cats.reduce((t,c)=>t+c[1],0), free=I.cap-used;
    const uu=FS.size(U);
    const usbCats=[['مستندات',U.children.filter(c=>['pdf','docx','xlsx','pptx','dir'].includes(c.type)).reduce((t,c)=>t+FS.size(c),0),'#2563eb'],['فيديو وصوت',U.children.filter(c=>['mp4','mp3'].includes(c.type)).reduce((t,c)=>t+FS.size(c),0),'#db2777'],['أخرى',U.children.filter(c=>!['pdf','docx','xlsx','pptx','dir','mp4','mp3'].includes(c.type)).reduce((t,c)=>t+FS.size(c),0),'#94a3b8']];
    $('#storBody').innerHTML=`
      <div class="card"><h3>${icon('hdd')}الذاكرة الداخلية (NVMe SSD)<span class="end btns"><button class="btn sm" data-st="test">${icon('timer')}اختبار السرعة</button><button class="btn sm" data-st="check">${icon('shield')}فحص القرص</button></span></h3>
        <div class="stor-top"><div class="donut" style="background:${this.donut(cats,I.cap)}"><span><span>${fmtSize(free)}<small>متوفرة</small></span></span></div>
          <div style="flex:1;min-width:260px"><div style="display:flex;gap:30px;flex-wrap:wrap;margin-bottom:12px">
            <div><div class="hint">المستخدمة</div><span class="big-num">${fmtSize(used)}</span></div>
            <div><div class="hint">المتوفرة</div><span class="big-num" style="color:var(--ok)">${fmtSize(free)}</span></div>
            <div><div class="hint">السعة الكلية</div><span class="big-num">${fmtSize(I.cap)}</span></div></div>
            <div class="meter" style="height:14px">${cats.map(([n,v,c])=>`<i style="width:${v/I.cap*100}%;background:${c}" title="${n}"></i>`).join('')}</div></div></div>
        <div class="legend" style="margin-top:16px">${cats.map(([n,v,c])=>`<div><i style="--c:${c}"></i>${n}<b>${fmtSize(v)}</b></div>`).join('')}</div>
        <div class="kv">
          <div><small>النوع</small><b>NVMe SSD — M.2 2280</b></div><div><small>السعة</small><b>256 GB (قابلة للاستخدام ~238 GiB)</b></div>
          <div><small>الواجهة</small><b>PCIe Gen 3 ×1</b></div><div><small>أقصى سرعة فعلية على Pi 5</small><b>~900 MB/s</b></div>
          <div><small>نظام الملفات</small><b>ext4</b></div><div><small>نقطة التركيب</small><b dir="ltr">/</b></div>
          <div><small>الحرارة</small><b>${nf(38)}°م</b></div><div><small>صحة القرص</small><b style="color:var(--ok)">ممتازة (${nf(100)}٪)</b></div>
          <div><small>عدد الملفات بالمستخدم</small><b>${nf(countFiles(I))}</b></div><div><small>التشفير</small><b>غير مفعّل</b></div>
        </div>
        <div class="btns" style="margin-top:16px"><button class="btn" data-st="clean">${icon('clean')}تنظيف الملفات المؤقتة (${fmtSize(this.base.temp)})</button>
          <button class="btn" data-go="files">${icon('folder')}فتح مستكشف الملفات</button>
          <button class="btn danger" data-st="factory">${icon('restart')}إعادة ضبط المصنع</button></div>
        <p class="hint" style="margin-top:10px">ما ينفع تسوي فورمات لقرص النظام وهو شغّال — استخدم «إعادة ضبط المصنع» حتى ترجع النظام مثل الجديد.</p>
      </div>
      <div class="card"><h3>${icon('usb')}فلاشة USB${U.connected?`<span class="end btns"><button class="btn sm" data-st="eject">${icon('eject')}إخراج</button><button class="btn sm danger fill" data-st="format">${icon('format')}فورمات</button></span>`:''}</h3>
        ${U.connected?`<div class="stor-top"><div class="donut" style="background:${this.donut(usbCats,U.cap)}"><span><span>${fmtSize(U.cap-uu)}<small>متوفرة</small></span></span></div>
          <div style="flex:1;min-width:260px"><div style="display:flex;gap:30px;flex-wrap:wrap;margin-bottom:12px">
            <div><div class="hint">المستخدمة</div><span class="big-num">${fmtSize(uu)}</span></div>
            <div><div class="hint">المتوفرة</div><span class="big-num" style="color:var(--ok)">${fmtSize(U.cap-uu)}</span></div>
            <div><div class="hint">السعة</div><span class="big-num">${fmtSize(U.cap)}</span></div></div>
            <div class="meter" style="height:14px">${usbCats.map(([n,v,c])=>`<i style="width:${v/U.cap*100}%;background:${c}"></i>`).join('')}</div>
            <div class="legend" style="margin-top:12px">${usbCats.map(([n,v,c])=>`<div><i style="--c:${c}"></i>${n}<b>${fmtSize(v)}</b></div>`).join('')}</div></div></div>
          <div class="kv"><div><small>اسم الفلاشة</small><b>${esc(U.name)}</b></div><div><small>نظام الملفات</small><b>${U.fsType}</b></div>
            <div><small>المنفذ</small><b>USB 3.0 (5 Gbps)</b></div><div><small>نقطة التركيب</small><b dir="ltr">/media/usb</b></div>
            <div><small>عدد الملفات</small><b>${nf(countFiles(U))}</b></div><div><small>الحالة</small><b style="color:var(--ok)">موصولة وجاهزة</b></div></div>`
          :`<div class="empty">${icon('usb')}<b>ماكو فلاشة موصولة</b><button class="btn" data-st="plug">محاكاة توصيل فلاشة</button></div>`}
      </div>`;
  },
  async onClick(e){
    const b=e.target.closest('[data-st]'); if(!b) return; const a=b.dataset.st, U=FS.drives.usb;
    if(a==='plug'){ U.connected=true; FS.persist(); updateStatus(); this.render(); toast('تم توصيل فلاشة USB'); }
    if(a==='eject'){ await Files.eject(); this.render(); }
    if(a==='clean'){ if(this.base.temp<1){ toast('ماكو ملفات مؤقتة'); return; } const f=this.base.temp; await Files.progress('جاري التنظيف…',f/40); this.base.temp=0; this.render(); toast('تم تحرير '+fmtSize(f)); }
    if(a==='check'){ await Files.progress('جاري فحص القرص…',400*MB); toast('القرص سليم — ما لكينا أي أخطاء'); }
    if(a==='test'){ await Files.progress('جاري اختبار السرعة…',300*MB); modal({title:'نتيجة اختبار السرعة',iconName:'timer',body:`<div class="kv"><div><small>القراءة المتتابعة</small><b>${nf(872)} MB/s</b></div><div><small>الكتابة المتتابعة</small><b>${nf(806)} MB/s</b></div><div><small>القراءة العشوائية 4K</small><b>${nf(58)} MB/s</b></div><div><small>الكتابة العشوائية 4K</small><b>${nf(164)} MB/s</b></div></div><p class="hint" style="margin-top:12px">راسبيري 5 يحدّ سرعة الـ SSD بسبب منفذ PCIe ×1، فالـ 4000MB/s تنزل لحدود 900MB/s — وهاي سرعة ممتازة للنظام.</p>`}); }
    if(a==='factory'){ if(await confirmBox('إعادة ضبط المصنع','راح تنحذف كل الإعدادات والسبورات والملفات والبرامج المثبتة ويرجع النظام مثل الجديد.','إعادة الضبط',true,'restart')){ try{ Object.keys(localStorage).filter(k=>k.startsWith('alharthia.')).forEach(k=>localStorage.removeItem(k)); }catch(_){} sysMessage('جاري إعادة ضبط النظام…',null,()=>location.reload()); } }
    if(a==='format'){
      const res=await modal({title:'فورمات الفلاشة',iconName:'format',body:`
        <p style="color:var(--danger);font-weight:600">تحذير: الفورمات يمسح كل الملفات اللي على الفلاشة (${nf(countFiles(U))} ملف — ${fmtSize(FS.size(U))}).</p>
        <div class="row"><label>اسم الفلاشة</label><input class="field" id="fmName" value="${esc(U.name)}" maxlength="11" style="min-width:0"></div>
        <div class="row"><label>نظام الملفات</label><select class="field" id="fmFs">
          <option value="exFAT">exFAT (يُنصح به — يشتغل على ويندوز وماك ولينكس)</option><option value="FAT32">FAT32 (أجهزة قديمة، ملف أقصاه 4GB)</option>
          <option value="NTFS">NTFS (ويندوز)</option><option value="ext4">ext4 (لينكس فقط)</option></select></div>
        <div class="row"><label>فورمات سريع</label><label class="sw"><input type="checkbox" id="fmQuick" checked><span></span></label></div>`,
        actions:[{label:'إلغاء',val:null,cls:'ghost'},{label:'فورمات الآن',cls:'danger fill',val:ov=>({name:$('#fmName',ov).value.trim()||'USB',fs:$('#fmFs',ov).value,quick:$('#fmQuick',ov).checked})}]});
      if(!res) return;
      if(!await confirmBox('متأكد؟','ما تكدر ترجع الملفات بعد الفورمات.','نعم، امسح كل شي',true,'trash')) return;
      await Files.progress('جاري الفورمات ('+res.fs+')…',res.quick?300*MB:2*GB);
      U.children=[]; U.name=res.name.toUpperCase(); U.fsType=res.fs; FS.persist(); this.render(); if(current==='files') Files.render();
      toast('تم فورمات الفلاشة بنظام '+res.fs);
    }
  }
};
function countFiles(n){ return (n.children||[]).reduce((t,c)=>t+(c.type==='dir'?countFiles(c):1),0); }
