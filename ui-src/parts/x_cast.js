
/* =====================================================================
   WIRELESS SCREEN SHARING — عرض شاشة الجهاز على أجهزة ثانية،
   واستقبال شاشة جهاز ثاني على هذا الجهاز (كلها من المتصفح، بدون تطبيق).
   البث المباشر H.264 بـ ٣٠ إطار/ثانية + AirPlay للآيفون والآيباد.
   ===================================================================== */
ICONS.cast='<path d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"/><circle cx="2" cy="20" r="1" fill="currentColor"/>';
ICONS.screenIn='<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M12 7v6M9 10l3 3 3-3"/>';
ICONS.qr='<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM19 14h2M14 19h3M19 18v3h2"/>';
ICONS.apple='<path d="M12 6c0-2 1.5-3.5 3.5-3.6C15.7 4.4 14.2 6 12 6Z"/><path d="M17.5 12.5c0-2 1.3-3 1.4-3.1-.8-1.1-2-1.3-2.5-1.3-1.1-.1-2.1.6-2.7.6-.6 0-1.4-.6-2.4-.6-1.8 0-3.7 1.5-3.7 4.3 0 1.7.6 3.5 1.5 4.7.7 1 1.4 1.8 2.4 1.8s1.3-.6 2.4-.6 1.4.6 2.4.6 1.7-.9 2.4-1.9c.5-.7.8-1.4 1-1.8-1.6-.7-2.2-2.2-2.2-2.7Z"/>';
const Cast={
  st:null, iv:0, full:false, fullIv:0, qrUrl:'', sig:'',
  async poll(){
    if(!(window.Native&&Native.on)){ this.st={on:false,demo:true}; this.render(); return; }
    try{ this.st=await API.get('/api/share'); }catch(e){ this.st={on:false,err:errMsg(e)}; }
    this.render();
  },
  async toggle(on){
    if(!(window.Native&&Native.on)){ toast('العرض اللاسلكي يشتغل على الجهاز الحقيقي فقط',false); return; }
    try{ this.st=await API.post('/api/share',{on}); this.render(); toast(on?'العرض اللاسلكي شغال':'تم إيقاف العرض اللاسلكي'); }
    catch(e){ toast(errMsg(e),false); }
  },
  async airplay(on){
    if(!(window.Native&&Native.on)){ toast('يشتغل على الجهاز الحقيقي فقط',false); return; }
    try{ this.st=await API.post('/api/share',{airplay:on}); this.render();
      toast(on?'صار الجهاز يظهر باسم Alharthia بقائمة «عكس الشاشة»':'تم الإيقاف'); }
    catch(e){ toast(errMsg(e),false); }
  },
  drawQR(url){
    const cv=$('#castQR'); if(!cv||!url) return;
    if(this.qrUrl===url&&cv.dataset.done) return;
    try{ QR.draw(cv,url,6,3); this.qrUrl=url; cv.dataset.done='1'; }
    catch(e){ cv.remove(); }
  },
  render(force){
    const m=$('#castMain'); if(!m) return;
    const s=this.st||{};
    const sig=JSON.stringify([s.on,s.url,s.viewers,s.incoming,s.from,s.tool,s.video,s.videoTool,s.videoErr,s.airplay]);
    if(!force&&sig===this.sig){ if(s.incoming) this.tickImg($('#castImg')); return; }
    this.sig=sig;
    const on=!!s.on, url=s.url||'', ap=s.airplay||'missing';
    m.innerHTML=`<div class="app-head"><h1 class="h1">العرض اللاسلكي</h1><span class="grow"></span>
        ${on?`<span class="cast-live">${icon('cast')}<span>شغّال</span>${s.viewers?` · ${nf(s.viewers)} <span>مشاهد</span>`:''}</span>`:''}</div>

      <div class="card"><h3>${icon('cast')}اعرض شاشة هذا الجهاز على شاشة ثانية
        ${on&&s.video?`<span class="cast-tag ok">بث مباشر ٣٠ إطار/ثانية</span>`:on?`<span class="cast-tag">صور متتابعة</span>`:''}</h3>
        <div class="row"><label for="castOn">تشغيل العرض اللاسلكي<span class="hint">أي جهاز على نفس شبكة الـ Wi-Fi يشوف الشاشة من المتصفح — آيفون، آيباد، أندرويد، أو كمبيوتر</span></label>
          <label class="sw"><input type="checkbox" id="castOn" ${on?'checked':''}><span></span></label></div>
        ${on?`<div class="cast-url"><span class="hint">افتح هذا العنوان بمتصفح الجهاز الثاني:</span><b dir="ltr">${esc(url)}</b>
            <div class="cast-qr"><canvas id="castQR"></canvas>
              <div class="qr-tip">${icon('qr')} صوّب كاميرا الهاتف على هذا الرمز — يفتح الشاشة مباشرة بدون ما تكتب العنوان.</div></div>
            <div class="btns" style="margin-top:12px"><button class="btn sm" data-cast="copy">${icon('copy')}نسخ العنوان</button>
            <span class="hint">أو اكتب <b dir="ltr">${esc(s.ip||'')}:${s.port||0}</b> بالمتصفح</span></div></div>`
          :`<p class="hint">من تشغّله يطلع لك عنوان ورمز QR تفتحه بالجهاز الثاني (لابتوب، شاشة ذكية، أو هاتف).</p>`}
        ${s.tool===false?`<p class="hint" style="color:var(--warn)">${icon('info')} أداة التقاط الشاشة (grim) غير مثبتة — نفّذ: sudo apt install grim</p>`:''}
        ${on&&s.videoTool===false?`<p class="hint" style="color:var(--warn)">${icon('info')} البث المباشر يحتاج wf-recorder و ffmpeg — نفّذ: sudo apt install wf-recorder ffmpeg (بدونها يشتغل بصور متتابعة)</p>`:''}
        ${on&&s.videoTool&&!s.video&&s.videoErr?`<p class="hint" style="color:var(--warn)">${icon('info')} ${esc(s.videoErr)}</p>`:''}
      </div>

      <div class="card"><h3>${icon('screenIn')}استقبل شاشة جهاز ثاني على هذا الجهاز</h3>
        ${on?`<ol class="cast-steps"><li>افتح نفس العنوان أعلاه بمتصفح الكمبيوتر (Chrome أو Edge).</li>
            <li>اضغط «شارك شاشتك مع الجهاز».</li><li>اختار الشاشة أو النافذة اللي تريد تعرضها.</li></ol>`
          :`<p class="hint">شغّل العرض اللاسلكي أولاً حتى تكدر تستقبل.</p>`}
        <div class="row"><label for="castAir">${icon('apple')} استقبال من آيفون / آيباد (AirPlay)
          <span class="hint">من تشغّله، افتح «مركز التحكم» بالآيفون ← «عكس الشاشة» ← اختر <b dir="ltr">Alharthia</b></span></label>
          <label class="sw"><input type="checkbox" id="castAir" ${ap==='on'?'checked':''} ${ap==='missing'?'disabled':''}><span></span></label></div>
        ${ap==='missing'?`<p class="hint" style="color:var(--warn)">${icon('info')} غير مثبت — نفّذ: sudo apt install uxplay avahi-daemon</p>`:''}
        <p class="hint">${icon('info')} أجهزة أندرويد تشارك شاشتها عن طريق نفس الرابط من متصفح كروم.</p>
        ${s.incoming?`<div class="cast-in"><div class="hint">يعرض الآن: <b>${esc(s.from||'جهاز')}</b></div>
            <img id="castImg" alt="">
            <div class="btns" style="margin-top:10px"><button class="btn primary" data-cast="full">${icon('fit')}ملء الشاشة</button></div></div>`
          :on?`<p class="hint">${icon('info')} ماكو جهاز يشارك شاشته هسه.</p>`:''}
      </div>
      ${(window.Native&&Native.on)?'':'<div class="card"><p class="hint">هذي معاينة — العرض اللاسلكي يشتغل على الراسبيري.</p></div>'}`;
    const t=$('#castOn'); if(t) t.onchange=()=>this.toggle(t.checked);
    const a=$('#castAir'); if(a) a.onchange=()=>this.airplay(a.checked);
    if(on&&url) this.drawQR(url);
    if(s.incoming) this.tickImg($('#castImg'));
  },
  tickImg(img){ if(!img) return; img.src='/api/share/incoming.jpg?t='+Date.now()+'&t2='+API.tok; },
  openFull(){
    this.full=true;
    const el=$('#castFull'); el.hidden=false;
    el.innerHTML=`<img alt=""><button class="btn ghost" data-cast="exitFull">${icon('x')}خروج</button>`;
    const img=el.querySelector('img');
    clearInterval(this.fullIv);
    this.fullIv=setInterval(()=>{ img.src='/api/share/incoming.jpg?t='+Date.now(); },300);
  },
  closeFull(){ this.full=false; clearInterval(this.fullIv); $('#castFull').hidden=true; },
  init(){
    document.addEventListener('click',async e=>{
      const b=e.target.closest('[data-cast]'); if(!b) return;
      const a=b.dataset.cast;
      if(a==='copy'){ try{ await navigator.clipboard.writeText(this.st.url); toast('تم نسخ العنوان'); }catch(er){ toast('انسخه يدوياً',false); } }
      if(a==='full') this.openFull();
      if(a==='exitFull') this.closeFull();
    });
  }
};
onShow.cast=()=>{ Cast.sig=''; Cast.poll(); clearInterval(Cast.iv); Cast.iv=setInterval(()=>{ if(current==='cast') Cast.poll(); },2500); };
onHide.cast=()=>{ clearInterval(Cast.iv); };
