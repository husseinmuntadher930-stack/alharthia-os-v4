
/* =====================================================================
   MEDIA PLAYER — mp4 / mp3 (and webm, mkv, wav, ogg, m4a…)
   ===================================================================== */
ICONS.back10='<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><text x="12" y="15.5" text-anchor="middle" font-size="7" fill="currentColor" stroke="none" font-weight="700">10</text>';
ICONS.fwd10='<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/><text x="12" y="15.5" text-anchor="middle" font-size="7" fill="currentColor" stroke="none" font-weight="700">10</text>';
ICONS.loop='<path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>';
ICONS.skipNext='<path d="M5 5v14l10-7z" fill="currentColor"/><path d="M19 5v14"/>';
ICONS.skipPrev='<path d="M19 5v14L9 12z" fill="currentColor"/><path d="M5 5v14"/>';
ICONS.external='<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>';
ICONS.volMute='<path d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6M16 9l6 6"/>';
const MEDIA_VIDEO=['mp4','webm','mkv','mov','m4v','ogv','avi','3gp'], MEDIA_AUDIO=['mp3','wav','ogg','oga','m4a','aac','flac','opus','wma'];
const mediaKind=n=>{ const e=(/\.([a-z0-9]+)$/i.exec(n||'')||[])[1]; const x=(e||'').toLowerCase(); return MEDIA_VIDEO.includes(x)?'video':MEDIA_AUDIO.includes(x)?'audio':null; };
const fmtTime=s=>{ if(!isFinite(s)) return '--:--'; s=Math.floor(s); const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60; return nf((h?h+':'+pad(m):m)+':'+pad(x)); };
const Media={
  list:[], i:0, el:null, failed:false, hideT:0,
  // item: {name, src, path?}
  open(item,list){
    this.list=list&&list.length?list:[item]; this.i=Math.max(0,this.list.findIndex(x=>x.src===item.src));
    go('media'); this.load();
  },
  cur(){ return this.list[this.i]; },
  load(){
    const it=this.cur(); if(!it){ this.renderEmpty(); return; }
    const kind=mediaKind(it.name)||'video'; this.failed=false;
    setTitle(it.name);
    const st=$('#mdStage');
    st.innerHTML=`<video id="mdV" playsinline preload="metadata" ${kind==='audio'?'class="aud"':''}></video>
      ${kind==='audio'?`<div class="md-art"><span>${icon('music')}</span><b>${esc(it.name.replace(/\.[^.]+$/,''))}</b><small>${nf(this.i+1)} / ${nf(this.list.length)}</small></div>`:''}
      <div class="md-err" hidden></div><div class="md-big" hidden>${icon('play')}</div>`;
    const v=this.el=$('#mdV');
    v.src=it.src; v.volume=(S.mediaVol??100)/100; v.muted=!!S.mediaMute; v.playbackRate=S.mediaRate||1; v.loop=!!S.mediaLoop;
    v.onloadedmetadata=()=>this.sync(); v.ontimeupdate=()=>this.sync(); v.onplay=v.onpause=()=>{ this.sync(); this.poke(); };
    v.onended=()=>{ if(this.i<this.list.length-1){ this.i++; this.load(); } else this.sync(); };
    v.onerror=()=>this.fail();
    v.onclick=()=>this.toggle();
    v.ondblclick=()=>toggleFullscreen();
    v.play().catch(()=>{});
    this.renderBar(); this.renderList(); this.poke();
  },
  fail(){
    if(this.failed) return; this.failed=true;
    const it=this.cur(), box=$('#mdStage .md-err'); if(!box) return;
    const nat=window.Native&&Native.on&&it.path;
    box.hidden=false;
    box.innerHTML=`${icon('info')}<b>ما كدرت أشغّل هذا الملف هنا</b><span>${nat?'راح ينفتح بمشغل الوسائط الكامل (mpv) اللي يشغّل كل الصيغ.':'الصيغة غير مدعومة بهذا المتصفح.'}</span>
      ${nat?`<button class="btn primary" data-md="ext">${icon('play')}تشغيل بمشغل الوسائط</button>`:''}`;
    if(nat) this.external();
  },
  external(){ const it=this.cur(); if(window.Native&&Native.on&&it&&it.path){ if(this.el) this.el.pause(); Native.launch({id:'media',path:it.path},'مشغل الوسائط'); } },
  toggle(){ const v=this.el; if(!v) return; v.paused?v.play().catch(()=>this.fail()):v.pause(); },
  renderEmpty(){
    setTitle('مشغل الوسائط');
    $('#mdStage').innerHTML=`<div class="empty md-empty">${icon('video')}<b>مشغل الفيديو والصوت</b><span>يشغّل ملفات MP4 و MP3 وغيرها. افتح ملف من الجهاز أو من مستكشف الملفات.</span>
      <div class="btns"><button class="btn primary" data-md="pick">${icon('folder')}فتح ملف</button><button class="btn" data-md="vids">${icon('video')}مجلد الفيديو</button></div></div>`;
    $('#mdBar').innerHTML=''; $('#mdList').hidden=true; this.el=null;
  },
  renderBar(){
    const v=this.el, multi=this.list.length>1;
    $('#mdBar').innerHTML=`<div class="md-seek"><span id="mdT">0:00</span><input type="range" id="mdPos" min="0" max="1000" value="0"><span id="mdD">--:--</span></div>
      <div class="md-ctl">
        <div class="md-side">
          <button class="tbtn" data-md="mute" title="كتم">${icon(S.mediaMute?'volMute':'vol')}</button>
          <input type="range" id="mdVol" min="0" max="100" value="${S.mediaVol??100}" title="الصوت">
        </div>
        <div class="md-mid">
          ${multi?`<button class="tbtn" data-md="prev" title="السابق">${icon('skipPrev')}</button>`:''}
          <button class="tbtn" data-md="b10" title="رجوع ١٠ ثواني">${icon('back10')}</button>
          <button class="md-play" data-md="play">${icon(v&&!v.paused?'pause':'play')}</button>
          <button class="tbtn" data-md="f10" title="تقديم ١٠ ثواني">${icon('fwd10')}</button>
          ${multi?`<button class="tbtn" data-md="next" title="التالي">${icon('skipNext')}</button>`:''}
        </div>
        <div class="md-side end">
          <button class="tbtn${S.mediaLoop?' on':''}" data-md="loop" title="تكرار">${icon('loop')}</button>
          <button class="tbtn txt" data-md="rate" title="السرعة">${nf((S.mediaRate||1))}×</button>
          ${multi?`<button class="tbtn${this.showList?' on':''}" data-md="list" title="قائمة التشغيل">${icon('list')}</button>`:''}
          <button class="tbtn" data-md="pick" title="فتح ملف">${icon('folder')}</button>
          ${window.Native&&Native.on?`<button class="tbtn" data-md="ext" title="فتح بمشغل الوسائط الكامل">${icon('external')}</button>`:''}
          <button class="tbtn" data-md="full" title="ملء الشاشة">${icon('fit')}</button>
        </div>
      </div>`;
    setRangeFill&&$$('#mdBar input[type=range]').forEach(r=>setRangeFill(r));
  },
  renderList(){
    const l=$('#mdList'); l.hidden=!(this.showList&&this.list.length>1); if(l.hidden) return;
    l.innerHTML=`<h3>قائمة التشغيل (${nf(this.list.length)})</h3>`+this.list.map((x,k)=>`<button class="md-li${k===this.i?' on':''}" data-mdi="${k}">${icon(mediaKind(x.name)==='audio'?'music':'video')}<span>${esc(x.name)}</span></button>`).join('');
  },
  sync(){
    const v=this.el; if(!v) return;
    const p=$('#mdPos'); if(p&&!this.seeking){ p.value=v.duration?Math.round(v.currentTime/v.duration*1000):0; setRangeFill&&setRangeFill(p); }
    const t=$('#mdT'), d=$('#mdD'); if(t) t.textContent=fmtTime(v.currentTime); if(d) d.textContent=fmtTime(v.duration);
    const pb=$('#mdBar [data-md=play]'); if(pb) pb.innerHTML=icon(v.paused?'play':'pause');
    const big=$('#mdStage .md-big'); if(big) big.hidden=!v.paused||this.failed||!v.currentTime;
  },
  poke(){ const s=$('#media'); s.classList.remove('idle'); clearTimeout(this.hideT); if(this.el&&!this.el.paused&&mediaKind(this.cur().name)!=='audio') this.hideT=setTimeout(()=>s.classList.add('idle'),3000); },
  async pick(){
    const inp=$('#mdFile'); inp.value=''; inp.click();
  },
  onBar(e){
    const b=e.target.closest('[data-md]'); if(!b) return; const a=b.dataset.md, v=this.el;
    if(a==='play') this.toggle();
    if(a==='b10'&&v) v.currentTime=Math.max(0,v.currentTime-10);
    if(a==='f10'&&v) v.currentTime=Math.min(v.duration||0,v.currentTime+10);
    if(a==='prev'){ if(v&&v.currentTime>3) v.currentTime=0; else if(this.i>0){ this.i--; this.load(); } }
    if(a==='next'&&this.i<this.list.length-1){ this.i++; this.load(); }
    if(a==='mute'){ S.mediaMute=!S.mediaMute; save(); if(v) v.muted=S.mediaMute; b.innerHTML=icon(S.mediaMute?'volMute':'vol'); }
    if(a==='loop'){ S.mediaLoop=!S.mediaLoop; save(); if(v) v.loop=S.mediaLoop; b.classList.toggle('on',S.mediaLoop); }
    if(a==='rate'){ const R=[1,1.25,1.5,2,0.5,0.75]; S.mediaRate=R[(R.indexOf(S.mediaRate||1)+1)%R.length]; save(); if(v) v.playbackRate=S.mediaRate; b.textContent=nf(S.mediaRate)+'×'; }
    if(a==='list'){ this.showList=!this.showList; b.classList.toggle('on',this.showList); this.renderList(); }
    if(a==='full') toggleFullscreen();
    if(a==='pick') this.pick();
    if(a==='ext') this.external();
    if(a==='vids'){ go('files'); Files.open('internal','vids'); }
    this.poke();
  },
  init(){
    const s=$('#media');
    s.addEventListener('click',e=>{ const li=e.target.closest('[data-mdi]'); if(li){ this.i=+li.dataset.mdi; this.load(); return; } this.onBar(e); });
    s.addEventListener('pointermove',()=>this.poke()); s.addEventListener('pointerdown',()=>this.poke());
    s.addEventListener('input',e=>{
      const v=this.el;
      if(e.target.id==='mdPos'&&v&&v.duration){ this.seeking=true; v.currentTime=e.target.value/1000*v.duration; setRangeFill&&setRangeFill(e.target); clearTimeout(this.skT); this.skT=setTimeout(()=>this.seeking=false,200); }
      if(e.target.id==='mdVol'){ S.mediaVol=+e.target.value; if(v) v.volume=S.mediaVol/100; setRangeFill&&setRangeFill(e.target); save(); }
    });
    $('#mdFile').addEventListener('alh-paths',e=>{
      const items=e.detail.filter(f=>mediaKind(f.name)).map(f=>({name:f.name,path:f.path,src:API.url(f.path)}));
      if(items.length) this.open(items[0],items); else toast('هذا مو ملف فيديو أو صوت',false);
    });
    $('#mdFile').onchange=e=>{
      const files=[...e.target.files].filter(f=>mediaKind(f.name)); if(!files.length){ if(e.target.files.length) toast('هذا مو ملف فيديو أو صوت',false); return; }
      const items=files.map(f=>({name:f.name,src:URL.createObjectURL(f),path:f.alhPath}));
      this.open(items[0],items);
    };
    addEventListener('keydown',e=>{ if(current!=='media'||e.target.closest('input:not([type=range]),textarea')) return;
      if(e.key===' '){ e.preventDefault(); this.toggle(); }
      if(e.key==='ArrowRight'&&this.el) this.el.currentTime+=5; if(e.key==='ArrowLeft'&&this.el) this.el.currentTime-=5; });
  }
};
onShow.media=()=>{ if(!Media.list.length) Media.renderEmpty(); };
onHide.media=()=>{ if(Media.el&&mediaKind(Media.cur()?.name)!=='audio') Media.el.pause(); };

/* ---------------- audio output device ---------------- */
const AudioOut={
  data:null,
  demo:{available:true,sinks:[{id:'hdmi',name:'HDMI — الشاشة',kind:'hdmi',default:true},{id:'usb',name:'سماعة USB',kind:'usb',default:false},{id:'bt',name:'سماعة بلوتوث JBL',kind:'bt',default:false}]},
  async load(){
    if(window.Native&&Native.on){ try{ this.data=await API.get('/api/audio'); }catch(e){ this.data={available:false,sinks:[],err:errMsg(e)}; } }
    else this.data=this.data||structuredClone(this.demo);
    this.render();
  },
  render(){
    const el=$('#audioOut'); if(!el) return;
    const d=this.data;
    if(!d){ el.innerHTML='<div class="empty"><div class="spin"></div></div>'; return; }
    const ic=k=>icon({hdmi:'monitor',usb:'usb',bt:'bluetooth',jack:'headphones'}[k]||'speaker');
    const lbl={hdmi:'منفذ HDMI',usb:'USB',bt:'بلوتوث',jack:'سماعة رأس',speaker:'سماعة'};
    el.innerHTML=(d.sinks.length?d.sinks.map(x=>`<div class="row" ${x.default?'':`data-aout="${esc(x.id)}" style="cursor:pointer"`}>
        <span class="lbl" style="display:flex;align-items:center;gap:12px"><span style="font-size:22px;color:${x.default?'var(--acc)':'var(--muted)'}">${ic(x.kind)}</span><span>${esc(x.name)}<span class="hint" style="display:block">${lbl[x.kind]||''}</span></span></span>
        ${x.default?'<span style="color:var(--ok);font-weight:600">يطلع منه الصوت</span>':'<span class="btn sm ghost">استخدام</span>'}</div>`).join('')
      :`<p class="hint">${d.available===false?'ما لكيت أجهزة صوت. تأكد إن الشاشة بيها سماعات أو وصّل سماعة USB أو بلوتوث.':'ماكو أجهزة'}</p>`)+
      `<div class="btns" style="margin-top:10px"><button class="btn sm" data-aref="1">${icon('restart')}تحديث</button><button class="btn sm" data-atest="1">${icon('vol')}تجربة الصوت</button></div>`;
  },
  async pick(id){
    try{
      if(window.Native&&Native.on) this.data=await API.post('/api/audio',{id});
      else this.data.sinks.forEach(x=>x.default=x.id===id);
      this.render(); const cur=this.data.sinks.find(x=>x.default); toast('الصوت يطلع من: '+(cur?cur.name:''));
      setTimeout(()=>beep(1),400);
    }catch(e){ toast(errMsg(e),false); }
  },
  init(){
    document.addEventListener('click',e=>{
      const a=e.target.closest('[data-aout]'); if(a) this.pick(a.dataset.aout);
      if(e.target.closest('[data-aref]')){ this.data=null; this.render(); this.load(); }
      if(e.target.closest('[data-atest]')) beep(2);
    });
  }
};
