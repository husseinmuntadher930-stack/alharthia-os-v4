
/* =====================================================================
   QR CODE — مولّد صغير (وضع البايت، تصحيح خطأ M، إصدارات ١..١٠)
   يشتغل بدون إنترنت وبدون مكتبات.
   ===================================================================== */
const QR=(()=>{
  const EXP=new Array(512), LOG=new Array(256);
  for(let i=0,x=1;i<255;i++){ EXP[i]=x; LOG[x]=i; x<<=1; if(x&256) x^=0x11d; }
  for(let i=255;i<512;i++) EXP[i]=EXP[i-255];
  const mul=(a,b)=>(a&&b)?EXP[LOG[a]+LOG[b]]:0;
  // total data codewords / (ec per block, g1 blocks, g1 data, g2 blocks, g2 data) for level M
  const CAP=[0,16,28,44,64,86,108,124,154,182,216];
  const BLK=[null,[10,1,16,0,0],[16,1,28,0,0],[26,1,44,0,0],[18,2,32,0,0],[24,2,43,0,0],
    [16,4,27,0,0],[18,4,31,0,0],[22,2,38,2,39],[22,3,36,2,37],[26,4,43,1,44]];
  const ALIGN=[null,[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50]];

  function rsGen(n){ let g=[1]; for(let i=0;i<n;i++){ const ng=new Array(g.length+1).fill(0);
    for(let j=0;j<g.length;j++){ ng[j]^=mul(g[j],1); ng[j+1]^=mul(g[j],EXP[i]); } g=ng; } return g; }
  function rsEnc(data,n){ const g=rsGen(n), res=new Array(n).fill(0);
    for(const d of data){ const f=d^res[0]; res.shift(); res.push(0);
      for(let i=0;i<n;i++) res[i]^=mul(g[i+1],f); } return res; }

  function bits(str){
    const bytes=new TextEncoder().encode(str);
    let v=1; while(v<=10&&bytes.length+ (v<10?2:3) > CAP[v]) v++;
    if(v>10) throw new Error('النص طويل');
    const cap=CAP[v]*8, out=[];
    const push=(val,len)=>{ for(let i=len-1;i>=0;i--) out.push((val>>i)&1); };
    push(4,4); push(bytes.length, v<10?8:16);
    bytes.forEach(b=>push(b,8));
    for(let i=0;i<4&&out.length<cap;i++) out.push(0);
    while(out.length%8) out.push(0);
    const pads=[0xEC,0x11]; let k=0;
    while(out.length<cap){ push(pads[k++%2],8); }
    const cw=[]; for(let i=0;i<out.length;i+=8){ let b=0; for(let j=0;j<8;j++) b=(b<<1)|out[i+j]; cw.push(b); }
    return {v,cw};
  }

  function interleave(v,cw){
    const [ec,g1,d1,g2,d2]=BLK[v], blocks=[], ecs=[];
    let p=0;
    for(let i=0;i<g1;i++){ const b=cw.slice(p,p+d1); p+=d1; blocks.push(b); ecs.push(rsEnc(b,ec)); }
    for(let i=0;i<g2;i++){ const b=cw.slice(p,p+d2); p+=d2; blocks.push(b); ecs.push(rsEnc(b,ec)); }
    const out=[], maxD=Math.max(d1,d2||0);
    for(let i=0;i<maxD;i++) blocks.forEach(b=>{ if(i<b.length) out.push(b[i]); });
    for(let i=0;i<ec;i++) ecs.forEach(b=>out.push(b[i]));
    return out;
  }

  function build(v,data){
    const n=21+(v-1)*4;
    const m=Array.from({length:n},()=>new Array(n).fill(null));
    const set=(r,c,val)=>{ if(r>=0&&r<n&&c>=0&&c<n) m[r][c]=val; };
    const finder=(r,c)=>{ for(let i=-1;i<=7;i++) for(let j=-1;j<=7;j++){
      const rr=r+i, cc=c+j; if(rr<0||cc<0||rr>=n||cc>=n) continue;
      const on=(i>=0&&i<=6&&(j===0||j===6))||(j>=0&&j<=6&&(i===0||i===6))||(i>=2&&i<=4&&j>=2&&j<=4);
      set(rr,cc,on?1:0); } };
    finder(0,0); finder(0,n-7); finder(n-7,0);
    for(let i=8;i<n-8;i++){ set(6,i,i%2?0:1); set(i,6,i%2?0:1); }
    for(const r of ALIGN[v]) for(const c of ALIGN[v]){
      if((r<9&&c<9)||(r<9&&c>n-10)||(r>n-10&&c<9)) continue;
      for(let i=-2;i<=2;i++) for(let j=-2;j<=2;j++)
        set(r+i,c+j,(Math.max(Math.abs(i),Math.abs(j))!==1)?1:0);
    }
    set(n-8,8,1);
    // reserve format + version areas
    for(let i=0;i<9;i++){ if(m[8][i]===null) set(8,i,2); if(m[i][8]===null) set(i,8,2); }
    for(let i=0;i<8;i++){ if(m[8][n-1-i]===null) set(8,n-1-i,2); if(m[n-1-i][8]===null) set(n-1-i,8,2); }
    if(v>=7){ for(let i=0;i<6;i++) for(let j=0;j<3;j++){ set(n-11+j,i,2); set(i,n-11+j,2); } }
    // place data
    let bi=0, dir=-1, row=n-1;
    const bitAt=k=>(data[k>>3]>>(7-(k&7)))&1;
    for(let col=n-1;col>0;col-=2){
      if(col===6) col--;
      for(let i=0;i<n;i++){
        const r=dir<0?n-1-i:i;
        for(const c of [col,col-1]){
          if(m[r][c]!==null) continue;
          m[r][c]=bi<data.length*8?bitAt(bi):0; bi++;
        }
      }
      dir=-dir;
    }
    return m;
  }

  const MASKS=[(r,c)=>(r+c)%2===0,(r,c)=>r%2===0,(r,c)=>c%3===0,(r,c)=>(r+c)%3===0,
    (r,c)=>((r>>1)+Math.floor(c/3))%2===0,(r,c)=>((r*c)%2+(r*c)%3)===0,
    (r,c)=>(((r*c)%2+(r*c)%3)%2)===0,(r,c)=>(((r+c)%2+(r*c)%3)%2)===0];

  function fmtBits(mask){
    const data=(0<<3)|mask;              // level M = 00
    let d=data<<10, g=0x537;
    for(let i=4;i>=0;i--) if(d&(1<<(i+10))) d^=g<<i;
    return ((data<<10)|d)^0x5412;
  }
  function verBits(v){
    let d=v<<12, g=0x1f25;
    for(let i=5;i>=0;i--) if(d&(1<<(i+12))) d^=g<<i;
    return (v<<12)|d;
  }

  function penalty(m){
    const n=m.length; let p=0;
    const run=(get)=>{ for(let i=0;i<n;i++){ let c=1;
      for(let j=1;j<n;j++){ if(get(i,j)===get(i,j-1)) c++; else { if(c>=5) p+=3+(c-5); c=1; } }
      if(c>=5) p+=3+(c-5); } };
    run((i,j)=>m[i][j]); run((i,j)=>m[j][i]);
    for(let r=0;r<n-1;r++) for(let c=0;c<n-1;c++){
      const s=m[r][c]+m[r][c+1]+m[r+1][c]+m[r+1][c+1]; if(s===0||s===4) p+=3; }
    const pat=[1,0,1,1,1,0,1,0,0,0,0];
    const look=(get)=>{ for(let i=0;i<n;i++) for(let j=0;j+10<n;j++){
      let ok=true; for(let k=0;k<11;k++) if(get(i,j+k)!==pat[k]){ ok=false; break; } if(ok) p+=40; } };
    look((i,j)=>m[i][j]); look((i,j)=>m[j][i]);
    let dark=0; m.forEach(r=>r.forEach(v=>dark+=v));
    p+=Math.floor(Math.abs(dark*100/(n*n)-50)/5)*10;
    return p;
  }

  function make(text){
    const {v,cw}=bits(text), data=interleave(v,cw), base=build(v,data), n=base.length;
    let best=null;
    for(let mask=0;mask<8;mask++){
      const m=base.map(r=>r.slice());
      for(let r=0;r<n;r++) for(let c=0;c<n;c++) if(base[r][c]!==2&&!isFunc(base,r,c,v)&&MASKS[mask](r,c)) m[r][c]^=1;
      const f=fmtBits(mask);
      for(let i=0;i<15;i++){
        const bit=(f>>i)&1;
        if(i<6) m[i][8]=bit; else if(i===6) m[7][8]=bit; else if(i===7) m[8][8]=bit;
        else if(i===8) m[8][7]=bit; else m[8][14-i]=bit;
        if(i<8) m[8][n-1-i]=bit; else m[n-15+i][8]=bit;
      }
      m[n-8][8]=1;
      if(v>=7){ const vb=verBits(v);
        for(let i=0;i<18;i++){ const bit=(vb>>i)&1; const r=Math.floor(i/3), c=i%3;
          m[n-11+c][r]=bit; m[r][n-11+c]=bit; } }
      const p=penalty(m);
      if(!best||p<best.p) best={p,m};
    }
    return best.m;
  }
  // function modules = finders, timing, alignment, dark module, reserved areas
  function isFunc(base,r,c,v){
    const n=base.length;
    if(r===6||c===6) return true;
    if(r<9&&c<9) return true;
    if(r<9&&c>=n-8) return true;
    if(r>=n-8&&c<9) return true;
    for(const ar of ALIGN[v]) for(const ac of ALIGN[v]){
      if((ar<9&&ac<9)||(ar<9&&ac>n-10)||(ar>n-10&&ac<9)) continue;
      if(Math.abs(r-ar)<=2&&Math.abs(c-ac)<=2) return true; }
    if(v>=7&&((r<6&&c>=n-11&&c<n-8)||(c<6&&r>=n-11&&r<n-8))) return true;
    return false;
  }

  function draw(canvas,text,px=6,quiet=4){
    const m=make(text), n=m.length, size=(n+quiet*2)*px;
    canvas.width=canvas.height=size;
    const x=canvas.getContext('2d');
    x.fillStyle='#fff'; x.fillRect(0,0,size,size);
    x.fillStyle='#000';
    for(let r=0;r<n;r++) for(let c=0;c<n;c++) if(m[r][c]) x.fillRect((c+quiet)*px,(r+quiet)*px,px,px);
    return canvas;
  }
  return {make,draw};
})();
