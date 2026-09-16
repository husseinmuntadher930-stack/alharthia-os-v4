
/* ---------------- Browser (mock) ---------------- */
function initBrowser(){
  const Q=[['Google','G','#4285f4'],['YouTube','▶','#e11d48'],['ويكيبيديا','W','#475569'],['GeoGebra','∠','#6d5bd0'],['Khan Academy','K','#14a37f'],['المنصة التعليمية','م','#f0703e'],['بريد المدرسة','ب','#2f6fe4'],['الخرائط','خ','#16a34a']];
  $('#quick').innerHTML=Q.map(([n,l,c])=>`<button class="qk" data-toast="في النظام الحقيقي يفتح «${n}» في Chromium"><i style="--c:${c}">${l}</i>${n}</button>`).join('');
  const go2=e=>{ if(e.key==='Enter'&&e.target.value.trim()){ toast('في النظام الحقيقي: يفتح «'+e.target.value.trim()+'» في Chromium'); e.target.blur(); } };
  $('#urlIn').addEventListener('keydown',go2); $('#bSearch').addEventListener('keydown',go2);
}


/* ---------------- Timer ---------------- */
const Timer={
  mode:'down',total:5*60e3,left:5*60e3,end:0,start:0,elapsed:0,run:false,done:false,iv:0,C:2*Math.PI*90,
  init(){
    $('#tPrg').style.strokeDasharray=this.C;
    $('#tPresets').innerHTML=[1,3,5,10,15,20,30,45].map(m=>`<button class="chip" data-m="${m}">${nf(m)} د</button>`).join('');
    $('#tPresets').addEventListener('click',e=>{const b=e.target.closest('[data-m]'); if(!b) return; this.setMode('down'); this.total=this.left=+b.dataset.m*60e3; this.run=false; this.done=false; this.render();});
    $$('[data-tmode]').forEach(b=>b.onclick=()=>this.setMode(b.dataset.tmode));
    $('#tGo').onclick=()=>this.toggle();
    $('#tReset').onclick=()=>this.reset();
    $('#tPlus').onclick=()=>this.adj(60e3);
    $('#tMinus').onclick=()=>this.adj(-60e3);
    $('#tBig').onclick=()=>{$('#timer').classList.toggle('big-mode');$('#tBig').classList.toggle('on');};
    this.render();
  },
  running(){return this.run;},
  setMode(m){ if(m===this.mode) return; this.mode=m; this.run=false; this.done=false; this.elapsed=0; this.left=this.total;
    $$('[data-tmode]').forEach(b=>b.classList.toggle('on',b.dataset.tmode===m)); $('#tPresets').style.visibility=m==='down'?'':'hidden'; $('#tPlus').disabled=$('#tMinus').disabled=m==='up'; this.render(); },
  toggle(){
    if(this.mode==='down'){
      if(this.done||this.left<=0){this.left=this.total;this.done=false;}
      if(this.run){this.left=Math.max(0,this.end-Date.now());this.run=false;}
      else{this.end=Date.now()+this.left;this.run=true;}
    } else {
      if(this.run){this.elapsed=Date.now()-this.start;this.run=false;}
      else{this.start=Date.now()-this.elapsed;this.run=true;}
    }
    this.loop(); this.render();
  },
  reset(){this.run=false;this.done=false;this.left=this.total;this.elapsed=0;this.render();},
  adj(ms){ if(this.mode!=='down') return; this.total=clamp(this.total+ms,60e3,180*60e3);
    if(this.run){this.end+=ms; if(this.end<Date.now()+1000) this.end=Date.now()+1000;} else {this.left=this.total;this.done=false;} this.render(); },
  loop(){ clearInterval(this.iv); if(this.run) this.iv=setInterval(()=>this.step(),200); },
  step(){
    if(!this.run) return clearInterval(this.iv);
    if(this.mode==='down'){ this.left=this.end-Date.now(); if(this.left<=0){this.left=0;this.run=false;this.done=true;clearInterval(this.iv);beep(4);toast('انتهى الوقت!');} }
    else this.elapsed=Date.now()-this.start;
    this.render();
  },
  fmt(ms,up){ const s=up?Math.floor(ms/1000):Math.ceil(ms/1000); const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;
    return nf(h?`${h}:${pad(m)}:${pad(x)}`:`${m}:${pad(x)}`); },
  render(){
    const up=this.mode==='up', txt=this.fmt(up?this.elapsed:this.left,up);
    $('#tDigits').textContent=txt;
    $('#tLabel').textContent=this.done?'انتهى الوقت!':this.run?(up?'يعمل':'متبقي'):(up?(this.elapsed?'متوقف':'جاهز'):(this.left<this.total?'متوقف':'جاهز'));
    const frac=up?((this.elapsed%60e3)/60e3):(this.total?this.left/this.total:0);
    $('#tPrg').style.strokeDashoffset=this.C*(1-frac);
    $('#tRing').classList.toggle('done',this.done);
    $('#tGo').innerHTML=icon(this.run?'pause':'play');
    $$('#tPresets .chip').forEach(b=>b.classList.toggle('on',!up&&+b.dataset.m*60e3===this.total));
    const show=this.run||this.done, chip=this.done?'انتهى':txt;
    for(const el of [$('#tbTimer'),$('#cwTimer'),$('#boardStrip .tb-chip')]){ el.hidden=!show; el.querySelector('span').textContent=chip; }
  }
};

