
/* =====================================================================
   ATTENDANCE — الحضور والغياب
   ===================================================================== */
const AT_ST={p:['حاضر','#16a34a'],a:['غائب','#dc2626'],l:['متأخر','#d97706'],e:['مجاز','#2563eb']};
const dkey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const Attend={
  data:null, tab:'day', date:null, q:'', range:'month',
  init(){
    this.data=store.get('attendance',null)||{cur:null,classes:[]};
    if(!this.data.classes.length){ const id=uid(); this.data.classes.push({id,name:S.cls,students:[],records:{},notes:{}}); this.data.cur=id; }
    this.date=dkey(tzNow());
    $('#atSide').addEventListener('click',e=>this.onSide(e));
    $('#atMain').addEventListener('click',e=>this.onMain(e));
    $('#atMain').addEventListener('change',e=>{ if(e.target.id==='atDate'&&e.target.value){ this.date=e.target.value; this.render(); } if(e.target.id==='atRange'){ this.range=e.target.value; this.render(); } });
    $('#atMain').addEventListener('input',e=>{ if(e.target.id==='atQ'){ this.q=e.target.value.trim(); this.renderGrid(); } });
    $('#atMain').addEventListener('keydown',e=>{ if(e.target.id==='atName'&&e.key==='Enter'){ e.preventDefault(); this.addOne(); } });
    $('#atFile').onchange=async e=>{ const f=e.target.files[0]; e.target.value=''; if(f) this.addMany(await f.text()); };
    if(!S.attMig){ S.attMig=true; if(!S.dock.includes('attend')&&S.dock.length<7) S.dock.splice(1,0,'attend'); save(); }
  },
  persist(){ if(!store.set('attendance',this.data)) toast('تعذر حفظ سجل الحضور',false); },
  get cls(){ return this.data.classes.find(c=>c.id===this.data.cur)||this.data.classes[0]; },
  render(){ this.renderSide(); this.renderMain(); },
  renderSide(){
    const T=[['day','التسجيل اليومي','attend'],['students','الطلاب','users'],['report','التقرير','table']];
    $('#atSide').innerHTML=`<h4>القسم</h4>${T.map(([k,n,i])=>`<button class="nav-btn${this.tab===k?' on':''}" data-tab="${k}">${icon(i)}<span class="txt">${n}</span></button>`).join('')}
      <h4>الصفوف</h4>${this.data.classes.map(c=>`<button class="nav-btn${c.id===this.cls.id?' on':''}" data-cls="${c.id}">${icon('users')}<span class="txt">${esc(c.name)}</span><span class="end">${nf(c.students.length)}</span></button>`).join('')}
      <button class="nav-btn" data-cx="add">${icon('plus')}<span class="txt">إضافة صف</span></button>`;
  },
  dayLabel(k){ const [y,m,d]=k.split('-').map(Number); const dt=new Date(y,m-1,d); return `${DAYS[dt.getDay()]} ${nf(d)} ${MONTHS[m-1]} ${nf(y)}`; },
  counts(k){ const r=this.cls.records[k]||{}, c={p:0,a:0,l:0,e:0,n:0}; for(const s of this.cls.students){ const v=r[s.id]; if(v) c[v]++; else c.n++; } return c; },
  renderMain(){
    const C=this.cls, M=$('#atMain');
    const head=`<div class="app-head"><span class="ficon" style="--c:#0d9488;width:56px;height:56px">${icon('attend')}</span><div><h1 class="h1">${esc(C.name)}</h1><p class="sub" style="margin:0">${nf(C.students.length)} طالب</p></div><span class="grow"></span>
      <button class="btn ghost" data-cx="rename">${icon('edit')}تسمية الصف</button>${this.data.classes.length>1?`<button class="btn danger" data-cx="del">${icon('trash')}حذف الصف</button>`:''}</div>`;
    if(this.tab==='students'){
      M.innerHTML=head+`<div class="card"><h3>${icon('plus')}إضافة طالب</h3>
        <div class="row"><input class="field" id="atName" type="text" placeholder="اسم الطالب الثلاثي" autocomplete="off"><button class="btn primary" data-cx="addOne">${icon('plus')}إضافة</button></div>
        <details style="margin-top:8px"><summary style="cursor:pointer;font-weight:600;color:var(--head)">إضافة مجموعة أسماء مرة وحدة</summary>
          <p class="hint">الصق الأسماء — كل اسم بسطر (تكدر تنسخها من Excel)</p><textarea class="field" id="atBulk" placeholder="أحمد علي حسين&#10;حسين كريم جاسم&#10;..."></textarea>
          <div class="btns" style="margin-top:10px"><button class="btn primary" data-cx="addBulk">${icon('users')}إضافة الأسماء</button><button class="btn" data-cx="file">${icon('upload')}من ملف نصي أو CSV</button></div></details></div>
        <div class="card"><h3>${icon('users')}قائمة الطلاب (${nf(C.students.length)})${C.students.length?`<span class="end btns"><button class="btn sm" data-cx="sort">ترتيب أبجدي</button><button class="btn sm danger" data-cx="clearAll">${icon('trash')}حذف الكل</button></span>`:''}</h3>
        ${C.students.length?`<table class="tbl"><tr><th style="width:60px">ت</th><th>الاسم</th><th style="width:120px">الغيابات</th><th style="width:200px"></th></tr>
          ${C.students.map((s,i)=>`<tr><td class="n">${nf(i+1)}</td><td><b>${esc(s.name)}</b></td><td class="n">${nf(this.stats(s.id,'all').a)}</td>
          <td><div class="btns" style="justify-content:flex-end"><button class="btn sm ghost" data-ren="${s.id}">${icon('edit')}</button><button class="btn sm ghost" data-up="${s.id}" ${i?'':'disabled'}>${icon('chevUp')}</button><button class="btn sm danger" data-rm="${s.id}">${icon('trash')}</button></div></td></tr>`).join('')}</table>`
          :`<div class="empty">${icon('users')}<b>ماكو طلاب بعد</b><span>أضف الأسماء من فوق</span></div>`}</div>`;
      setTimeout(()=>$('#atName')&&$('#atName').focus(),50);
      return;
    }
    if(this.tab==='report'){
      const rows=C.students.map(s=>({s,...this.stats(s.id,this.range)}));
      const days=this.days(this.range).length;
      M.innerHTML=head+`<div class="card"><div class="fx-bar" style="margin:0"><b style="color:var(--head)">الفترة:</b>
          <select class="field" id="atRange" style="min-width:0"><option value="week" ${this.range==='week'?'selected':''}>هذا الأسبوع</option><option value="month" ${this.range==='month'?'selected':''}>هذا الشهر</option><option value="all" ${this.range==='all'?'selected':''}>كل السجل</option></select>
          <span class="hint">${nf(days)} يوم مسجّل</span><span class="grow" style="flex:1"></span>
          <button class="btn" data-cx="saveReport">${icon('folder')}حفظ بالملفات</button><button class="btn primary" data-cx="exportReport">${icon('download')}تصدير Excel (CSV)</button></div></div>
        <div class="card" style="overflow:auto">${rows.length?`<table class="tbl"><tr><th>ت</th><th>الاسم</th><th>حاضر</th><th>غائب</th><th>متأخر</th><th>مجاز</th><th>نسبة الغياب</th></tr>
          ${rows.map((r,i)=>{ const pct=r.total?Math.round(r.a/r.total*100):0, warn=r.a>=3||pct>=10;
            return `<tr class="${warn?'warn':''}"><td class="n">${nf(i+1)}</td><td><b>${esc(r.s.name)}</b>${warn?` <span style="color:var(--danger);font-size:12px;font-weight:700">⚠ تجاوز</span>`:''}</td><td class="n">${nf(r.p)}</td><td class="n" style="color:var(--danger);font-weight:700">${nf(r.a)}</td><td class="n">${nf(r.l)}</td><td class="n">${nf(r.e)}</td>
            <td><div style="display:flex;align-items:center;gap:8px"><div class="bar" style="flex:1"><i style="width:${pct}%"></i></div><b>${nf(pct)}٪</b></div></td></tr>`; }).join('')}</table>
          <p class="hint" style="margin-top:10px">⚠ يتلوّن الطالب إذا غيابه ٣ أيام أو أكثر، أو ١٠٪ من الأيام.</p>`:`<div class="empty">${icon('table')}<b>ماكو طلاب</b></div>`}</div>`;
      return;
    }
    const c=this.counts(this.date);
    M.innerHTML=head+`<div class="card" style="padding:14px 18px"><div class="at-date">
        <button class="icon-btn" data-dd="-1" title="اليوم السابق">${icon('chevR')}</button><input type="date" id="atDate" value="${this.date}"><button class="icon-btn" data-dd="1" title="اليوم التالي">${icon('chevL')}</button>
        <b>${this.dayLabel(this.date)}</b>${this.date!==dkey(tzNow())?`<button class="btn sm ghost" data-dd="0">اليوم</button>`:''}
        <span style="flex:1"></span>
        <label class="search" style="height:44px;min-width:180px">${icon('search')}<input id="atQ" type="search" placeholder="بحث عن طالب" value="${esc(this.q)}"></label></div></div>
      <div class="at-sum">${Object.entries(AT_ST).map(([k,[n,col]])=>`<div style="--c:${col}"><small>${n}</small><b>${nf(c[k])}</b></div>`).join('')}<div style="--c:#94a3b8"><small>غير مسجّل</small><b>${nf(c.n)}</b></div></div>
      <div class="btns" style="margin-bottom:14px"><button class="btn primary" data-cx="allP">${icon('check')}الكل حاضر</button><button class="btn" data-cx="restP">${icon('check')}الباقين حاضرين</button>
        <button class="btn" data-cx="pick">${icon('dice')}اختيار طالب عشوائي</button><button class="btn ghost" data-cx="clearDay">${icon('trash')}مسح تسجيل اليوم</button>
        <button class="btn ghost" data-cx="exportDay">${icon('download')}تصدير اليوم</button></div>
      <div id="atGrid"></div>`;
    this.renderGrid();
  },
  renderGrid(){
    const g=$('#atGrid'); if(!g) return; const C=this.cls, r=C.records[this.date]||{}, notes=(C.notes[this.date]||{});
    const list=C.students.map((s,i)=>({s,i})).filter(x=>!this.q||x.s.name.includes(this.q));
    if(!C.students.length){ g.innerHTML=`<div class="card"><div class="empty">${icon('users')}<b>ماكو طلاب بهذا الصف</b><button class="btn primary" data-tab="students">${icon('plus')}إضافة أسماء الطلاب</button></div></div>`; return; }
    g.innerHTML=`<div class="at-grid">${list.map(({s,i})=>{ const v=r[s.id];
      return `<div class="at-card" style="--st:${v?AT_ST[v][1]:'var(--line)'}"><div class="top"><span class="no">${nf(i+1)}</span><span class="nm" title="${esc(s.name)}">${esc(s.name)}</span><button class="note-b${notes[s.id]?' has':''}" data-note="${s.id}" title="ملاحظة">${icon('edit')}</button></div>
        ${notes[s.id]?`<div class="memo">${esc(notes[s.id])}</div>`:''}
        <div class="at-st">${Object.entries(AT_ST).map(([k,[n,col]])=>`<button class="${v===k?'on':''}" style="--c:${col}" data-set="${k}" data-sid="${s.id}">${n}</button>`).join('')}</div></div>`; }).join('')}</div>`;
  },
  refreshDay(){ const y=$('#atMain').scrollTop; this.renderMain(); $('#atMain').scrollTop=y; this.renderSide(); },
  setStatus(sid,v){ const C=this.cls, r=C.records[this.date]||(C.records[this.date]={}); if(r[sid]===v) delete r[sid]; else r[sid]=v; this.persist(); this.refreshDay(); },
  days(range){
    const all=Object.keys(this.cls.records).filter(k=>Object.keys(this.cls.records[k]).length).sort();
    if(range==='all') return all;
    const now=tzNow(); let from;
    if(range==='month') from=dkey(new Date(now.getFullYear(),now.getMonth(),1));
    else { const d=new Date(now); d.setDate(d.getDate()-((d.getDay()+1)%7)); from=dkey(d); }
    return all.filter(k=>k>=from);
  },
  stats(sid,range){ const o={p:0,a:0,l:0,e:0,total:0}; for(const k of this.days(range)){ const v=this.cls.records[k][sid]; if(v){ o[v]++; o.total++; } } return o; },
  addOne(){ const i=$('#atName'); const n=i.value.trim().replace(/\s+/g,' '); if(!n) return;
    if(this.cls.students.some(s=>s.name===n)){ toast('الاسم موجود مسبقاً',false); return; }
    this.cls.students.push({id:uid(),name:n}); this.persist(); this.render(); toast('تمت إضافة '+n); },
  addMany(text){
    const names=text.split(/\r?\n/).map(l=>l.split(/[,\t;]/).map(x=>x.trim()).find(x=>x&&!/^\d+$/.test(x))||'').map(x=>x.replace(/\s+/g,' ').replace(/^"|"$/g,'')).filter(Boolean);
    const have=new Set(this.cls.students.map(s=>s.name)); let n=0;
    for(const nm of names){ if(have.has(nm)||/^(الاسم|اسم الطالب|name)$/i.test(nm)) continue; have.add(nm); this.cls.students.push({id:uid(),name:nm}); n++; }
    this.persist(); this.render(); toast(n?`تمت إضافة ${nf(n)} طالب`:'ما انضاف أي اسم جديد',!!n);
  },
  csv(rows){ return '﻿'+rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\r\n'); },
  exportCSV(rows,name,toFiles){
    const blob=new Blob([this.csv(rows)],{type:'text/csv;charset=utf-8'});
    if(toFiles){ FS.add('docs',{name:FS.uniqueName(FS.find('docs'),name),type:'csv',size:blob.size,blob}); toast('تم الحفظ في «المستندات»'); }
    else { downloadURL(URL.createObjectURL(blob),name); toast('تم تصدير الملف'); }
  },
  reportRows(){ return [['ت','اسم الطالب','حاضر','غائب','متأخر','مجاز','نسبة الغياب %'],...this.cls.students.map((s,i)=>{ const r=this.stats(s.id,this.range); return [i+1,s.name,r.p,r.a,r.l,r.e,r.total?Math.round(r.a/r.total*100):0]; })]; },
  async onSide(e){
    const t=e.target.closest('[data-tab]'); if(t){ this.tab=t.dataset.tab; this.render(); return; }
    const c=e.target.closest('[data-cls]'); if(c){ this.data.cur=c.dataset.cls; this.persist(); this.render(); return; }
    if(e.target.closest('[data-cx=add]')){ const n=await promptBox('اسم الصف الجديد','الصف الثالث متوسط -د-'); if(!n) return; const id=uid(); this.data.classes.push({id,name:n,students:[],records:{},notes:{}}); this.data.cur=id; this.tab='students'; this.persist(); this.render(); }
  },
  async onMain(e){
    const t=e.target.closest('[data-tab]'); if(t){ this.tab=t.dataset.tab; this.render(); return; }
    const st=e.target.closest('[data-set]'); if(st){ this.setStatus(st.dataset.sid,st.dataset.set); return; }
    const dd=e.target.closest('[data-dd]'); if(dd){ const v=+dd.dataset.dd; if(!v) this.date=dkey(tzNow()); else { const [y,m,d]=this.date.split('-').map(Number); this.date=dkey(new Date(y,m-1,d+v)); } this.render(); return; }
    const C=this.cls;
    const nb=e.target.closest('[data-note]'); if(nb){ const sid=nb.dataset.note, N=C.notes[this.date]||(C.notes[this.date]={}); const v=await promptBox('ملاحظة عن الطالب',N[sid]||'','مثلاً: خرج مبكراً'); if(v===null) return; N[sid]=v; this.persist(); this.refreshDay(); return; }
    const rn=e.target.closest('[data-ren]'); if(rn){ const s=C.students.find(x=>x.id===rn.dataset.ren); const v=await promptBox('تعديل الاسم',s.name); if(v){ s.name=v; this.persist(); this.render(); } return; }
    const up=e.target.closest('[data-up]'); if(up){ const i=C.students.findIndex(x=>x.id===up.dataset.up); if(i>0){ [C.students[i-1],C.students[i]]=[C.students[i],C.students[i-1]]; this.persist(); this.render(); } return; }
    const rm=e.target.closest('[data-rm]'); if(rm){ const s=C.students.find(x=>x.id===rm.dataset.rm); if(await confirmBox('حذف طالب',`تريد تحذف «${esc(s.name)}» وسجل حضوره؟`,'حذف',true,'trash')){ C.students=C.students.filter(x=>x!==s); this.persist(); this.render(); } return; }
    const b=e.target.closest('[data-cx]'); if(!b) return; const a=b.dataset.cx, r=C.records[this.date]||(C.records[this.date]={});
    if(a==='addOne') this.addOne();
    if(a==='addBulk') this.addMany($('#atBulk').value);
    if(a==='file') $('#atFile').click();
    if(a==='sort'){ C.students.sort((x,y)=>x.name.localeCompare(y.name,'ar')); this.persist(); this.render(); }
    if(a==='clearAll'&&await confirmBox('حذف كل الطلاب','راح تنحذف كل الأسماء وسجل الحضور لهذا الصف.','حذف الكل',true,'trash')){ C.students=[]; C.records={}; C.notes={}; this.persist(); this.render(); }
    if(a==='allP'){ C.students.forEach(s=>r[s.id]='p'); this.persist(); this.refreshDay(); toast('تم تسجيل الكل حاضرين'); }
    if(a==='restP'){ C.students.forEach(s=>{ if(!r[s.id]) r[s.id]='p'; }); this.persist(); this.refreshDay(); }
    if(a==='clearDay'&&await confirmBox('مسح تسجيل اليوم','راح ينمسح تسجيل الحضور لهذا اليوم فقط.','مسح',true,'trash')){ delete C.records[this.date]; this.persist(); this.refreshDay(); }
    if(a==='exportDay') this.exportCSV([['ت','اسم الطالب','الحالة','ملاحظة'],...C.students.map((s,i)=>[i+1,s.name,r[s.id]?AT_ST[r[s.id]][0]:'غير مسجّل',(C.notes[this.date]||{})[s.id]||''])],`حضور ${C.name} ${this.date}.csv`);
    if(a==='exportReport') this.exportCSV(this.reportRows(),`تقرير غياب ${C.name}.csv`);
    if(a==='saveReport') this.exportCSV(this.reportRows(),`تقرير غياب ${C.name}.csv`,true);
    if(a==='rename'){ const n=await promptBox('اسم الصف',C.name); if(n){ C.name=n; this.persist(); this.render(); } }
    if(a==='del'&&await confirmBox('حذف الصف',`تريد تحذف «${esc(C.name)}» مع كل الطلاب والسجل؟`,'حذف',true,'trash')){ this.data.classes=this.data.classes.filter(x=>x!==C); this.data.cur=this.data.classes[0].id; this.persist(); this.render(); }
    if(a==='pick') this.pick();
  },
  pick(){
    const C=this.cls, r=C.records[this.date]||{};
    let pool=C.students.filter(s=>r[s.id]==='p'||r[s.id]==='l'); if(!pool.length) pool=C.students.filter(s=>r[s.id]!=='a'&&r[s.id]!=='e');
    if(!pool.length){ toast('ماكو طلاب حاضرين',false); return; }
    modal({title:'اختيار طالب عشوائي',iconName:'dice',body:'<div class="pick-name" id="pkN">…</div>',actions:[{label:'مرة ثانية',val:'again',cls:'ghost'},{label:'تم',val:null,cls:'primary'}],
      onOpen:ov=>{ let n=0; const el=$('#pkN',ov); const spin=()=>{ el.textContent=pool[Math.floor(Math.random()*pool.length)].name; if(++n<18) setTimeout(spin,50+n*9); else beep(1,880); }; spin(); }
    }).then(v=>{ if(v==='again') this.pick(); });
  }
};
onShow.attend=()=>Attend.render();
