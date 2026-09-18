
/* =====================================================================
   WHITEBOARD — rendering primitives (shared with PDF annotation)
   الإحداثيات محفوظة بشكل نسبي (مقسومة على عرض السبورة) حتى تبقى حادة بأي دقة
   ===================================================================== */
const REF=1920, PXCM=37.8;
const UIFONT='"IBM Plex Sans Arabic","Noto Sans Arabic","Segoe UI",Tahoma,sans-serif';
const QUICK_LIGHT=['#111827','#2563eb','#dc2626','#16a34a','#f0703e','#7c3aed'];
const QUICK_DARK=['#ffffff','#7dd3fc','#fca5a5','#86efac','#fde047','#fdba74'];
const imgCache=new Map();
function cachedImg(src,onload){
  let im=imgCache.get(src);
  if(!im){ im=new Image(); im.onload=()=>onload&&onload(); im.src=src; imgCache.set(src,im); }
  return im.complete&&im.naturalWidth?im:null;
}
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function segDist(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],L=dx*dx+dy*dy;let t=L?((p[0]-a[0])*dx+(p[1]-a[1])*dy)/L:0;t=clamp(t,0,1);return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}
function lineDist(p,a,b){const L=dist(a,b);if(!L)return dist(p,a);return Math.abs((b[0]-a[0])*(a[1]-p[1])-(a[0]-p[0])*(b[1]-a[1]))/L;}
const rotP=(p,c,a)=>{const s=Math.sin(a),co=Math.cos(a),x=p[0]-c[0],y=p[1]-c[1];return [c[0]+x*co-y*s,c[1]+x*s+y*co];};
function pointInPoly(p,poly){let ins=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])ins=!ins;}return ins;}

/* smooth centre-line path through points (quadratic mid-point) */
function smoothPath(P,W,path=new Path2D()){
  const n=P.length; if(!n) return path;
  path.moveTo(P[0][0]*W,P[0][1]*W);
  if(n===1){path.lineTo(P[0][0]*W+.01,P[0][1]*W);return path;}
  if(n===2){path.lineTo(P[1][0]*W,P[1][1]*W);return path;}
  for(let i=1;i<n-1;i++) path.quadraticCurveTo(P[i][0]*W,P[i][1]*W,(P[i][0]+P[i+1][0])/2*W,(P[i][1]+P[i+1][1])/2*W);
  path.lineTo(P[n-1][0]*W,P[n-1][1]*W);
  return path;
}
/* dense samples along the smoothed curve, with per-sample radius (variable-width pens) */
function resample(P,W,base){
  const n=P.length, out=[];
  const R=f=>Math.max(.35,base*f/2);
  if(n===1){out.push([P[0][0]*W,P[0][1]*W,R(P[0][2])]);return out;}
  const step=Math.max(.8,base*.12);
  const seg=(x0,y0,cx,cy,x1,y1,f0,f1,quad)=>{
    const len=quad?(Math.hypot(cx-x0,cy-y0)+Math.hypot(x1-cx,y1-cy)):Math.hypot(x1-x0,y1-y0);
    const m=Math.max(1,Math.ceil(len/step));
    for(let j=out.length?1:0;j<=m;j++){const t=j/m,u=1-t;
      const x=quad?u*u*x0+2*u*t*cx+t*t*x1:x0+(x1-x0)*t, y=quad?u*u*y0+2*u*t*cy+t*t*y1:y0+(y1-y0)*t;
      out.push([x,y,R(f0+(f1-f0)*t)]);}
  };
  const px=i=>P[i][0]*W, py=i=>P[i][1]*W, f=i=>P[i][2];
  if(n===2){seg(px(0),py(0),0,0,px(1),py(1),f(0),f(1),false);return out;}
  let sx=px(0),sy=py(0),sf=f(0);
  for(let i=1;i<n-1;i++){
    const ex=(px(i)+px(i+1))/2, ey=(py(i)+py(i+1))/2, ef=(f(i)+f(i+1))/2;
    seg(sx,sy,px(i),py(i),ex,ey,sf,ef,true); sx=ex;sy=ey;sf=ef;
  }
  seg(sx,sy,0,0,px(n-1),py(n-1),sf,f(n-1),false);
  return out;
}
/* union of circles + tangent quads — smooth variable-width outline */
function capsulePath(S){
  const p=new Path2D();
  for(let i=0;i<S.length;i++){
    const [x2,y2,r2]=S[i];
    p.moveTo(x2+r2,y2); p.arc(x2,y2,r2,0,Math.PI*2);
    if(!i) continue;
    const [x1,y1,r1]=S[i-1], dx=x2-x1, dy=y2-y1, d=Math.hypot(dx,dy);
    if(d<=Math.abs(r1-r2)+1e-6) continue;
    const a=Math.atan2(dy,dx), ph=Math.acos(clamp((r1-r2)/d,-1,1));
    const q=[[x1+r1*Math.cos(a+ph),y1+r1*Math.sin(a+ph)],[x2+r2*Math.cos(a+ph),y2+r2*Math.sin(a+ph)],[x2+r2*Math.cos(a-ph),y2+r2*Math.sin(a-ph)],[x1+r1*Math.cos(a-ph),y1+r1*Math.sin(a-ph)]];
    let ar=0; for(let k=0;k<4;k++){const u=q[k],v=q[(k+1)%4];ar+=u[0]*v[1]-v[0]*u[1];}
    if(ar<0) q.reverse();
    p.moveTo(q[0][0],q[0][1]); p.lineTo(q[1][0],q[1][1]); p.lineTo(q[2][0],q[2][1]); p.lineTo(q[3][0],q[3][1]); p.closePath();
  }
  return p;
}
const VARIABLE=new Set(['fountain','callig']);
function drawInk(x,s,W){
  if(!s.p.length) return;
  x.save();
  if(s.k==='eraser'){x.globalCompositeOperation='destination-out';x.strokeStyle=x.fillStyle='#000';}
  else{x.globalCompositeOperation='source-over';x.strokeStyle=x.fillStyle=s.c;if(s.k==='hl')x.globalAlpha=.34;}
  if(VARIABLE.has(s.k)) x.fill(capsulePath(resample(s.p,W,s.w*W)));
  else{ x.lineWidth=s.w*W; x.lineCap='round'; x.lineJoin='round'; x.stroke(smoothPath(s.p,W)); }
  x.restore();
}
/* ---- shapes ---- */
const LINE_KINDS=new Set(['line','dline','arrow','darrow']);
function regPoly(cx,cy,rx,ry,n,rot0=-Math.PI/2,inner=0){
  const pts=[]; const m=inner?n*2:n;
  for(let i=0;i<m;i++){const a=rot0+i*2*Math.PI/m, k=inner&&(i%2)?inner:1; pts.push([cx+Math.cos(a)*rx*k,cy+Math.sin(a)*ry*k]);}
  return pts;
}
function boxPoly(it,seg=48){
  const {bx:x,by:y,bw:w,bh:h}=it, cx=x+w/2, cy=y+h/2; let P;
  switch(it.k){
    case 'rect': case 'axes': P=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]; break;
    case 'triangle': P=[[cx,y],[x+w,y+h],[x,y+h]]; break;
    case 'rtri': P=[[x,y],[x,y+h],[x+w,y+h]]; break;
    case 'diamond': P=[[cx,y],[x+w,cy],[cx,y+h],[x,cy]]; break;
    case 'semi': { P=[]; const n=40; for(let i=0;i<=n;i++){ const a=Math.PI+i*Math.PI/n; P.push([cx+Math.cos(a)*w/2,y+h+Math.sin(a)*h]); } break; }
    case 'pentagon': P=regPoly(cx,cy+h*.05,w/2,h/2*1.05,5); break;
    case 'hexagon': P=regPoly(cx,cy,w/2,h/2,6,0); break;
    case 'star': P=regPoly(cx,cy+h*.06,w/2,h/2*1.06,5,-Math.PI/2,.45); break;
    default: P=regPoly(cx,cy,w/2,h/2,seg,0);
  }
  return it.rot?P.map(p=>rotP(p,[cx,cy],it.rot)):P;
}
function arrowHead(x,a,b,L){
  const an=Math.atan2(b[1]-a[1],b[0]-a[0]);
  x.moveTo(b[0]-L*Math.cos(an-.42),b[1]-L*Math.sin(an-.42)); x.lineTo(b[0],b[1]); x.lineTo(b[0]-L*Math.cos(an+.42),b[1]-L*Math.sin(an+.42));
}
function drawShape(x,it,W){
  x.save(); x.strokeStyle=x.fillStyle=it.c; x.lineWidth=it.w*W; x.lineCap='round'; x.lineJoin='round';
  const lw=it.w*W;
  if(LINE_KINDS.has(it.k)){
    const a=[it.a[0]*W,it.a[1]*W], b=[it.b[0]*W,it.b[1]*W];
    if(it.k==='dline') x.setLineDash([lw*3,lw*2.4]);
    x.beginPath(); x.moveTo(a[0],a[1]); x.lineTo(b[0],b[1]); x.stroke(); x.setLineDash([]);
    const L=Math.max(14,lw*4.2);
    if(it.k==='arrow'||it.k==='darrow'){x.beginPath();arrowHead(x,a,b,L);if(it.k==='darrow')arrowHead(x,b,a,L);x.stroke();}
  } else if(it.k==='poly'){
    x.beginPath(); it.pts.forEach((p,i)=>i?x.lineTo(p[0]*W,p[1]*W):x.moveTo(p[0]*W,p[1]*W)); if(it.closed) x.closePath();
    if(it.fill){x.globalAlpha=.25;x.fill();x.globalAlpha=1;} x.stroke();
  } else if(it.k==='arc'){
    x.beginPath(); x.arc(it.cx*W,it.cy*W,it.r*W,it.a0,it.a1); x.stroke();
  } else if(it.k==='axes'){
    const cx=(it.bx+it.bw/2)*W, cy=(it.by+it.bh/2)*W, w=it.bw*W, h=it.bh*W, unit=Math.min(w,h)/12;
    x.translate(cx,cy); if(it.rot) x.rotate(it.rot);
    x.beginPath(); x.moveTo(-w/2,0); x.lineTo(w/2,0); x.moveTo(0,h/2); x.lineTo(0,-h/2);
    arrowHead(x,[-w/2,0],[w/2,0],Math.max(12,lw*4)); arrowHead(x,[0,h/2],[0,-h/2],Math.max(12,lw*4)); x.stroke();
    x.lineWidth=Math.max(1,lw*.6); x.font=`500 ${Math.max(10,unit*.42)}px ${UIFONT}`; x.textAlign='center'; x.textBaseline='top';
    const nx=Math.floor((w/2-unit*.6)/unit), ny=Math.floor((h/2-unit*.6)/unit);
    x.beginPath();
    for(let i=-nx;i<=nx;i++){ if(!i) continue; x.moveTo(i*unit,-unit*.15); x.lineTo(i*unit,unit*.15); x.fillText((i<0?'−':'')+nf(Math.abs(i)),i*unit,unit*.22); }
    x.textAlign='right'; x.textBaseline='middle';
    for(let j=-ny;j<=ny;j++){ if(!j) continue; x.moveTo(-unit*.15,-j*unit); x.lineTo(unit*.15,-j*unit); x.fillText((j<0?'−':'')+nf(Math.abs(j)),-unit*.25,-j*unit); }
    x.stroke();
    x.font=`700 ${Math.max(12,unit*.6)}px ${UIFONT}`; x.textAlign='center';
    x.fillText('س',w/2-unit*.3,unit*.75); x.fillText('ص',unit*.7,-h/2+unit*.3); x.fillText(nf(0),-unit*.35,unit*.4);
  } else {
    const {bx,by,bw,bh}=it;
    x.beginPath();
    if(it.k==='circle'||it.k==='ellipse'){ x.ellipse((bx+bw/2)*W,(by+bh/2)*W,bw/2*W,bh/2*W,it.rot||0,0,Math.PI*2); }
    else { const P=boxPoly(it); P.forEach((p,i)=>i?x.lineTo(p[0]*W,p[1]*W):x.moveTo(p[0]*W,p[1]*W)); x.closePath(); }
    if(it.fill){x.globalAlpha=.28;x.fill();x.globalAlpha=1;}
    x.stroke();
  }
  x.restore();
}
function textLines(it){return String(it.text).split('\n');}
function drawText(x,it,W){
  const fs=it.fs*W, lh=fs*1.35, cx=(it.bx+it.bw/2)*W, cy=(it.by+it.bh/2)*W;
  x.save(); x.translate(cx,cy); if(it.rot) x.rotate(it.rot);
  x.fillStyle=it.c; x.font=`500 ${fs}px ${UIFONT}`; x.textBaseline='middle';
  x.direction=it.dir; x.textAlign=it.dir==='rtl'?'right':'left';
  const x0=it.dir==='rtl'?it.bw*W/2:-it.bw*W/2, y0=-it.bh*W/2;
  textLines(it).forEach((ln,i)=>x.fillText(ln,x0,y0+lh*(i+.5)));
  x.restore();
}
function drawImgItem(x,it,W,onload){
  const im=cachedImg(it.src,onload); if(!im) return;
  const cx=(it.bx+it.bw/2)*W, cy=(it.by+it.bh/2)*W;
  x.save(); x.translate(cx,cy); if(it.rot) x.rotate(it.rot);
  x.imageSmoothingQuality='high'; x.drawImage(im,-it.bw*W/2,-it.bh*W/2,it.bw*W,it.bh*W); x.restore();
}
function drawItem(x,it,W,onload){
  if(it.t==='ink') drawInk(x,it,W);
  else if(it.t==='shape') drawShape(x,it,W);
  else if(it.t==='text') drawText(x,it,W);
  else if(it.t==='img') drawImgItem(x,it,W,onload);
}
/* ---- geometry of items ---- */
const isBox=it=>it.t==='text'||it.t==='img'||(it.t==='shape'&&it.bw!=null);
function itemBBox(it){
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  const add=(p,r=0)=>{x0=Math.min(x0,p[0]-r);y0=Math.min(y0,p[1]-r);x1=Math.max(x1,p[0]+r);y1=Math.max(y1,p[1]+r);};
  const hw=(it.w||0)/2;
  if(it.t==='ink'){ const m=VARIABLE.has(it.k)?1.4:1; it.p.forEach(p=>add(p,hw*m)); }
  else if(it.t==='shape'&&LINE_KINDS.has(it.k)){ const r=hw+(it.k.includes('arrow')?Math.max(14/REF,it.w*4.2)*.5:0); add(it.a,r); add(it.b,r); }
  else if(it.t==='shape'&&it.k==='poly'){ it.pts.forEach(p=>add(p,hw)); }
  else if(it.t==='shape'&&it.k==='arc'){ add([it.cx,it.cy],it.r+hw); }
  else { const c=[it.bx+it.bw/2,it.by+it.bh/2]; [[it.bx,it.by],[it.bx+it.bw,it.by],[it.bx+it.bw,it.by+it.bh],[it.bx,it.by+it.bh]].forEach(p=>add(it.rot?rotP(p,c,it.rot):p,hw)); }
  return [x0,y0,x1,y1];
}
function itemHit(it,p,tol){
  const hw=(it.w||0)/2+tol;
  if(it.t==='ink'){ if(it.p.length===1) return dist(p,it.p[0])<=hw*1.3; for(let i=1;i<it.p.length;i++) if(segDist(p,it.p[i-1],it.p[i])<=hw*(VARIABLE.has(it.k)?1.4:1)) return true; return false; }
  if(it.t==='shape'){
    if(LINE_KINDS.has(it.k)) return segDist(p,it.a,it.b)<=hw;
    if(it.k==='arc'){ return Math.abs(dist(p,[it.cx,it.cy])-it.r)<=hw; }
    if(it.k==='poly'){ const P=it.pts; if(it.fill&&pointInPoly(p,P)) return true; for(let i=0;i<P.length-(it.closed?0:1);i++) if(segDist(p,P[i],P[(i+1)%P.length])<=hw) return true; return false; }
    if(it.k==='axes') return pointInPoly(p,boxPoly(it));
    const P=boxPoly(it,36); if(it.fill&&pointInPoly(p,P)) return true;
    for(let i=0;i<P.length;i++) if(segDist(p,P[i],P[(i+1)%P.length])<=hw) return true; return false;
  }
  return pointInPoly(p,boxPoly({...it,k:'rect'}));
}
function xformItem(it,f,s=1,dr=0){
  if(it.t==='ink'){ it.p=it.p.map(q=>{const r=f(q[0],q[1]);return [r[0],r[1],q[2]];}); it.w*=s; return; }
  if(it.t==='shape'&&LINE_KINDS.has(it.k)){ it.a=f(...it.a); it.b=f(...it.b); it.w*=s; return; }
  if(it.t==='shape'&&it.k==='poly'){ it.pts=it.pts.map(q=>f(q[0],q[1])); it.w*=s; return; }
  if(it.t==='shape'&&it.k==='arc'){ [it.cx,it.cy]=f(it.cx,it.cy); it.r*=s; it.a0+=dr; it.a1+=dr; it.w*=s; return; }
  const c=f(it.bx+it.bw/2,it.by+it.bh/2); it.bw*=s; it.bh*=s; it.bx=c[0]-it.bw/2; it.by=c[1]-it.bh/2; it.rot=(it.rot||0)+dr;
  if(it.t==='text') it.fs*=s; if(it.t==='shape') it.w*=s;
}
const cloneItem=it=>JSON.parse(JSON.stringify(it));

/* ---- shape recognition (مساعد الخط المستقيم) ---- */
function rdp(P,eps){
  if(P.length<3) return P.slice();
  let idx=0,mx=0; for(let i=1;i<P.length-1;i++){const d=lineDist(P[i],P[0],P[P.length-1]);if(d>mx){mx=d;idx=i;}}
  if(mx>eps){const a=rdp(P.slice(0,idx+1),eps),b=rdp(P.slice(idx),eps);return a.slice(0,-1).concat(b);}
  return [P[0],P[P.length-1]];
}
function snapAngle(a,b,deg=6){
  const L=dist(a,b); let an=Math.atan2(b[1]-a[1],b[0]-a[0]); const st=Math.PI/4, r=Math.round(an/st)*st;
  if(Math.abs(an-r)<deg*Math.PI/180) an=r; else return b;
  return [a[0]+Math.cos(an)*L,a[1]+Math.sin(an)*L];
}
function recognize(s,W){
  const P=s.p; if(P.length<4) return null;
  let L=0; for(let i=1;i<P.length;i++) L+=dist(P[i-1],P[i]);
  if(L*W<30) return null;
  const a=P[0], b=P[P.length-1], ch=dist(a,b);
  let dev=0; for(const p of P) dev=Math.max(dev,lineDist(p,a,b));
  if(ch/L>.88&&dev<Math.max(.04*ch,5/W)){
    const avg=P.reduce((t,q)=>t+q[2],0)/P.length;
    const k=s.k==='hl'?'hl':'pen';
    return {...s,k,w:s.w*(VARIABLE.has(s.k)?avg:1),p:[[a[0],a[1],1],[...snapAngle(a,b),1]]};
  }
  if(s.k==='hl') return null;
  let bx0=Infinity,by0=Infinity,bx1=-Infinity,by1=-Infinity; P.forEach(p=>{bx0=Math.min(bx0,p[0]);by0=Math.min(by0,p[1]);bx1=Math.max(bx1,p[0]);by1=Math.max(by1,p[1]);});
  const diag=Math.hypot(bx1-bx0,by1-by0);
  if(ch<Math.max(.22*diag,12/W)&&L*W>90){
    const base={t:'shape',c:s.c,w:s.w,id:s.id,fill:false,rot:0};
    const cx=(bx0+bx1)/2, cy=(by0+by1)/2, rx=(bx1-bx0)/2, ry=(by1-by0)/2;
    let err=0; for(const p of P){const d=Math.hypot((p[0]-cx)/(rx||1e-6),(p[1]-cy)/(ry||1e-6));err+=Math.abs(d-1);} err/=P.length;
    const closedPts=P.slice(0,-1).concat([P[0]]);
    const simp=rdp(closedPts,diag*.075); let V=simp.slice(0,-1);
    if(V.length>=3&&V.length<=4&&err>.09){
      if(V.length===4){
        const ang=V.map((p,i)=>{const q=V[(i+1)%4];return Math.abs(Math.atan2(q[1]-p[1],q[0]-p[0]))%(Math.PI/2);});
        const aligned=ang.every(t=>t<.2||t>Math.PI/2-.2);
        if(aligned) return {...base,k:'rect',bx:bx0,by:by0,bw:bx1-bx0,bh:by1-by0};
      }
      return {...base,k:'poly',pts:V.map(p=>[p[0],p[1]]),closed:true};
    }
    if(err<.2){
      const circ=Math.abs(rx-ry)/Math.max(rx,ry)<.18, r=(rx+ry)/2;
      return circ?{...base,k:'circle',bx:cx-r,by:cy-r,bw:2*r,bh:2*r}:{...base,k:'ellipse',bx:bx0,by:by0,bw:bx1-bx0,bh:by1-by0};
    }
  }
  return null;
}

/* ---- backgrounds ---- */
const BG_TYPES=[['white','أبيض'],['black','أسود'],['chalk','أخضر طباشير'],['navy','كحلي'],['grid','مربعات'],['bigGrid','مربعات كبيرة'],['graph','ورق بياني'],['dots','نقاط'],['lines','أسطر دفتر'],['callig','كراسة خط'],['iso','شبكة مثلثات'],['coord','مستوى إحداثي'],['music','نوتة موسيقية']];
const DARK_BG=new Set(['black','chalk','navy']);
const bgIsDark=bg=>DARK_BG.has(bg.type)||(bg.type==='color'&&(()=>{const [r,g,b]=hex2rgb(bg.color);return (r*299+g*587+b*114)/1000<130;})());
function drawBg(x,bg,W,H,onload){
  const k=W/REF; x.save();
  const hl=(y,c,w=1)=>{x.strokeStyle=c;x.lineWidth=w;x.beginPath();x.moveTo(0,y);x.lineTo(W,y);x.stroke();};
  const grid=(st,c,w=1,off=0)=>{x.strokeStyle=c;x.lineWidth=w;x.beginPath();for(let i=off%st;i<=W;i+=st){x.moveTo(Math.round(i)+.5,0);x.lineTo(Math.round(i)+.5,H);}for(let j=off%st;j<=H;j+=st){x.moveTo(0,Math.round(j)+.5);x.lineTo(W,Math.round(j)+.5);}x.stroke();};
  const fills={white:'#ffffff',black:'#111827',navy:'#0f1f47',grid:'#ffffff',bigGrid:'#ffffff',graph:'#fffdf8',dots:'#ffffff',lines:'#fffdf7',callig:'#fffcf3',iso:'#ffffff',coord:'#ffffff',music:'#fffdf8',image:'#ffffff'};
  if(bg.type==='chalk'){const g=x.createRadialGradient(W/2,H*.4,0,W/2,H*.4,Math.max(W,H)*.75);g.addColorStop(0,'#24573f');g.addColorStop(1,'#163a2b');x.fillStyle=g;}
  else x.fillStyle=bg.type==='color'?bg.color:(fills[bg.type]||'#fff');
  x.fillRect(0,0,W,H);
  switch(bg.type){
    case 'grid': grid(40*k,'#e2e8f0'); break;
    case 'bigGrid': grid(80*k,'#d5dcea',1.2); break;
    case 'graph': grid(10*k,'#f2e2d3',.8); grid(50*k,'#e8c3a4',1.2); break;
    case 'dots': x.fillStyle='#bcc6d6'; for(let i=16*k;i<W;i+=32*k)for(let j=16*k;j<H;j+=32*k){x.beginPath();x.arc(i,j,1.7*Math.max(k,.6),0,7);x.fill();} break;
    case 'lines': for(let j=96*k;j<H;j+=52*k) hl(j,'#c9d8ee'); x.strokeStyle='#f1a7a7';x.lineWidth=1.5;x.beginPath();x.moveTo(W-90*k,0);x.lineTo(W-90*k,H);x.stroke(); break;
    case 'callig': for(let j=80*k;j<H;j+=120*k){ x.fillStyle='rgba(240,112,62,.05)'; x.fillRect(0,j,W,40*k); hl(j,'#e9c9a8'); hl(j+40*k,'#c88a55',1.4); } break;
    case 'iso': { const s=44*k, h=s*Math.sin(Math.PI/3); x.strokeStyle='#e3e8f1'; x.lineWidth=1; x.beginPath();
      for(let j=0;j<=H;j+=h){x.moveTo(0,j);x.lineTo(W,j);}
      const t=Math.tan(Math.PI/3); for(let i=-H/t;i<=W+H/t;i+=s){x.moveTo(i,0);x.lineTo(i+H/t,H);x.moveTo(i,0);x.lineTo(i-H/t,H);} x.stroke(); break; }
    case 'coord': { const u=48*k, cx=Math.round(W/2/u)*u, cy=Math.round(H/2/u)*u; grid(u,'#e5eaf2',1,cx);
      x.strokeStyle='#334155'; x.lineWidth=Math.max(1.5,2*k); x.beginPath(); x.moveTo(0,cy); x.lineTo(W,cy); x.moveTo(cx,0); x.lineTo(cx,H);
      arrowHead(x,[0,cy],[W-4,cy],12*Math.max(k,.5)); arrowHead(x,[cx,H],[cx,4],12*Math.max(k,.5)); x.stroke();
      x.fillStyle='#64748b'; x.font=`500 ${13*k}px ${UIFONT}`; x.textAlign='center'; x.textBaseline='top';
      for(let i=1;cx+i*u<W-u/2||cx-i*u>u/2;i++){ if(cx+i*u<W-u/2) x.fillText(nf(i),cx+i*u,cy+5*k); if(cx-i*u>u/2) x.fillText('−'+nf(i),cx-i*u,cy+5*k); }
      x.textAlign='right'; x.textBaseline='middle';
      for(let j=1;cy+j*u<H-u/2||cy-j*u>u/2;j++){ if(cy-j*u>u/2) x.fillText(nf(j),cx-6*k,cy-j*u); if(cy+j*u<H-u/2) x.fillText('−'+nf(j),cx-6*k,cy+j*u); }
      x.fillStyle='#0f172a'; x.font=`700 ${20*k}px ${UIFONT}`; x.fillText('س',W-10*k,cy-18*k); x.textAlign='left'; x.fillText('ص',cx+10*k,16*k); break; }
    case 'music': { x.strokeStyle='#94a3b8'; x.lineWidth=1.2; const m=70*k;
      for(let j=90*k;j+48*k<H;j+=130*k){ x.beginPath(); for(let l=0;l<5;l++){x.moveTo(m,j+l*12*k);x.lineTo(W-m,j+l*12*k);} x.moveTo(m,j);x.lineTo(m,j+48*k);x.moveTo(W-m,j);x.lineTo(W-m,j+48*k); x.stroke(); } break; }
    case 'image': { const im=cachedImg(bg.img,onload); if(im){ const r=bg.fit==='contain'?Math.min(W/im.width,H/im.height):Math.max(W/im.width,H/im.height);
      const w=im.width*r,h=im.height*r; x.imageSmoothingQuality='high'; x.drawImage(im,(W-w)/2,(H-h)/2,w,h); } break; }
  }
  x.restore();
}
