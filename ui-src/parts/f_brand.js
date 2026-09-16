
/* ---------------- brand layout ---------------- */
const logoSrc=()=>S.logo||LOGO_DEFAULT;
const PRESETS=['tr','tc','tl','mr','mc','ml','br','bc','bl'];
const PRESET_NAMES={tr:'أعلى اليمين',tc:'أعلى الوسط',tl:'أعلى اليسار',mr:'الوسط يمين',mc:'المنتصف',ml:'الوسط يسار',br:'أسفل اليمين',bc:'أسفل الوسط',bl:'أسفل اليسار'};
const CTX={
  home:{root:$('#home'),desk:$('#desk'),logo:$('#bLogo'),text:$('#bText'),ref:1028},
  pv:{root:$('#pv'),desk:$('#pvDesk'),logo:$('#pvLogo'),text:$('#pvText'),ref:1080}
};
function presetXY(p,w,h,W,H){
  const m=Math.max(10,Math.min(W,H*16/9)*0.035);
  const x=p[1]==='r'?W-m-w/2:p[1]==='l'?m+w/2:W/2;
  const y=p[0]==='t'?m+h/2:p[0]==='b'?H-m-h/2:H/2;
  return [x,y];
}
function applyWall(el,holder){
  el.className='wall';
  el.style.backgroundImage='';
  const gsrc=el.id==='lockWall'&&S.lockMode==='img'?galSrc(S.lockId):(S.wall==='img'?(galSrc(S.wallId)||S.wallImg):null);
  if(gsrc){el.classList.add('img');el.style.backgroundImage=`url("${gsrc}")`;holder&&holder.classList.remove('is-light');return;}
  el.classList.add(S.wall==='img'?'navy':S.wall);
  holder&&holder.classList.toggle('is-light',S.wall==='light');
}
function layoutBrand(which){
  const c=CTX[which], {root,desk,logo,text}=c;
  const RW=root.clientWidth, RH=root.clientHeight;
  if(!RW||!RH) return;
  const u=Math.max(.16,Math.min(RW/1920,RH/c.ref));
  root.style.setProperty('--u',u);
  root.style.setProperty('--ls',S.logoSize);
  root.style.setProperty('--ts',S.textSize);
  if(logo.getAttribute('src')!==logoSrc()) logo.src=logoSrc();
  logo.hidden=!S.showLogo; text.hidden=!S.showText;
  const sc=text.querySelector('.b-school'); sc.textContent=S.school; sc.hidden=!S.showSchool;
  text.querySelector('.b-class').textContent=S.cls;
  const W=desk.clientWidth,H=desk.clientHeight;
  // logo
  const lw=logo.offsetWidth||u*200*S.logoSize, lh=lw;
  let lx,ly;
  if(S.logoPos.p)[lx,ly]=presetXY(S.logoPos.p,lw,lh,W,H); else {lx=S.logoPos.x*W;ly=S.logoPos.y*H;}
  lx=clamp(lx,lw/2,W-lw/2); ly=clamp(ly,lh/2,H-lh/2);
  logo.style.transform=`translate(${lx-lw/2}px,${ly-lh/2}px)`;
  // text
  const tp=S.textPos;
  const side=lx>W*.6?'r':lx<W*.4?'l':'c';
  let al;
  if(tp.p==='beside') al=S.showLogo?side:(S.logoPos.p?S.logoPos.p[1]:side);
  else if(tp.p) al=tp.p[1];
  else al=tp.x>.6?'r':tp.x<.4?'l':'c';
  text.style.setProperty('--ta',al==='r'?'right':al==='l'?'left':'center');
  const tw=text.offsetWidth, th=text.offsetHeight;
  let tx,ty;
  if(tp.p==='beside'){
    const gap=u*34;
    if(!S.showLogo){tx=lx;ty=ly; if(al==='r')tx=lx+lw/2-tw/2; else if(al==='l')tx=lx-lw/2+tw/2;}
    else if(side==='r'){tx=lx-lw/2-gap-tw/2;ty=ly;}
    else if(side==='l'){tx=lx+lw/2+gap+tw/2;ty=ly;}
    else {tx=lx;ty=ly+lh/2+gap+th/2; if(ty+th/2>H) ty=ly-lh/2-gap-th/2;}
  } else if(tp.p)[tx,ty]=presetXY(tp.p,tw,th,W,H);
  else {tx=tp.x*W;ty=tp.y*H;}
  tx=clamp(tx,tw/2,Math.max(tw/2,W-tw/2)); ty=clamp(ty,th/2,Math.max(th/2,H-th/2));
  text.style.transform=`translate(${tx-tw/2}px,${ty-th/2}px)`;
}
// keep the clock clear of the logo/text wherever the teacher puts them
function placeClock(){
  const cw=$('#clockW'); if(cw.hidden||current!=='home') return;
  const desk=$('#desk'), d=desk.getBoundingClientRect(), W=d.width, H=d.height;
  const boxes=[CTX.home.logo,CTX.home.text].filter(e=>!e.hidden).map(e=>e.getBoundingClientRect());
  cw.style.left='50%'; cw.style.top='50%';
  const cr=cw.getBoundingClientRect(), w=cr.width, h=cr.height, g=24;
  const C=[[.5,.5],[.5,.68],[.5,.32],[.72,.5],[.28,.5],[.72,.7],[.28,.7],[.72,.3],[.28,.3],[.5,.82],[.5,.18]];
  for(const [fx,fy] of C){
    const x=fx*W, y=fy*H, L=d.left+x-w/2, T=d.top+y-h/2;
    if(x-w/2<0||x+w/2>W||y-h/2<0||y+h/2>H) continue;
    const hit=boxes.some(b=>L<b.right+g&&L+w>b.left-g&&T<b.bottom+g&&T+h>b.top-g);
    if(!hit){cw.style.left=x+'px';cw.style.top=y+'px';return;}
  }
}
function layoutAll(){
  if(current==='home'){ layoutBrand('home'); }
  if(current==='settings') layoutBrand('pv');
  $('#clockW').hidden=!S.clock;
  placeClock();
  // strips & other brand spots
  $$('.s-logo').forEach(i=>{ if(i.getAttribute('src')!==logoSrc()) i.src=logoSrc(); });
  $('#home').classList.toggle('is-light',S.wall==='light');
  $$('.strip .s-school').forEach(e=>{e.textContent=S.school; e.hidden=!S.showSchool;});
  $$('.strip .dot').forEach(e=>e.hidden=!S.showSchool);
  $$('.s-class').forEach(e=>e.textContent=S.cls);
  $('#boardStrip').hidden=!S.strip;
  $('#lockLogo').src=logoSrc(); $('#sysLogo').src=logoSrc();
  $('#lockSchool').textContent=S.school; $('#lockClass').textContent=S.cls;
}
function applyWalls(){
  applyWall($('#homeWall'),$('#home'));
  applyWall($('#pvWall'),$('#pv'));
  applyWall($('#lockWall'),$('#lock'));
}

/* ---------------- dragging ---------------- */
let dragOn=false, selItem='text';
function selectItem(key){
  selItem=key;
  for(const w of ['home','pv']){
    CTX[w].logo.classList.toggle('sel',key==='logo'&&(w==='pv'||dragOn));
    CTX[w].text.classList.toggle('sel',key==='text'&&(w==='pv'||dragOn));
  }
}
function setDrag(on){
  dragOn=on;
  $('#desk').classList.toggle('dragging',on);
  $('#dragBar').hidden=!on;
  selectItem(selItem);
  if(!on){CTX.home.logo.classList.remove('sel');CTX.home.text.classList.remove('sel');}
}
function makeDraggable(which){
  const c=CTX[which];
  for(const [el,key] of [[c.logo,'logo'],[c.text,'text']]){
    el.addEventListener('pointerdown',e=>{
      if(which==='home'&&!dragOn) return;
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      selectItem(key);
      const r=c.desk.getBoundingClientRect(), er=el.getBoundingClientRect();
      const ox=e.clientX-(er.left+er.width/2), oy=e.clientY-(er.top+er.height/2);
      let moved=false;
      const mv=ev=>{
        moved=true;
        const pos={p:null,x:clamp((ev.clientX-ox-r.left)/r.width,0,1),y:clamp((ev.clientY-oy-r.top)/r.height,0,1)};
        if(key==='logo'){
          // keep "beside" text attached; otherwise freeze text where it is
          S.logoPos=pos;
        } else S.textPos=pos;
        layoutBrand(which); if(which==='home') placeClock();
      };
      const end=()=>{
        el.removeEventListener('pointermove',mv);el.removeEventListener('pointerup',end);el.removeEventListener('pointercancel',end);
        if(moved){syncSettingsUI();save();}
      };
      el.addEventListener('pointermove',mv);el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
    });
  }
}
$('#dDone').onclick=()=>{setDrag(false);save('تم حفظ مكان الشعار والنص');};
const bump=d=>{
  if(selItem==='logo') S.logoSize=clamp(+(S.logoSize+d).toFixed(2),.5,2.2);
  else S.textSize=clamp(+(S.textSize+d).toFixed(2),.6,1.8);
  layoutBrand('home'); placeClock(); syncSettingsUI(); save();
};
$('#dSmaller').onclick=()=>bump(-.1);
$('#dBigger').onclick=()=>bump(.1);

