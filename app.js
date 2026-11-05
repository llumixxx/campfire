(function(){
"use strict";
const $=s=>document.querySelector(s);
const canvas=$("#scene"), ctx=canvas.getContext("2d");
const reduce=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const clean=(s,n)=>String(s||"").replace(/[\u0000-\u001f\u007f-\u009f\u00ad\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g,"").trim().slice(0,n||12);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const mix=(a,b,t)=>`rgb(${Math.round(lerp(a[0],b[0],t))},${Math.round(lerp(a[1],b[1],t))},${Math.round(lerp(a[2],b[2],t))})`;
const hex=h=>{h=h.trim().replace("#","");return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]};
function hsl2rgb(h,s,l){s/=100;l/=100;const k=n=>(n+h/30)%12,a=s*Math.min(l,1-l),f=n=>l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1)));return [Math.round(255*f(0)),Math.round(255*f(8)),Math.round(255*f(4))]}
const rnd=seed=>{const x=Math.sin(seed*12.9898+78.233)*43758.5453;return x-Math.floor(x)};

const XMAS=true; /* 크리스마스 테마: false로 바꾸면 평소 모닥불 */
/* 귀여운 3D 이모지 (Microsoft Fluent Emoji, MIT 라이선스) */
const FE_BASE="https://cdn.jsdelivr.net/npm/@lobehub/fluent-emoji-3d@1.1.0/assets/";
const feUrl=g=>FE_BASE+[...g].map(c=>c.codePointAt(0).toString(16)).join("-")+".webp";
const feCache=new Map();
function feImg(g){let im=feCache.get(g);if(!im){im=new Image();im.crossOrigin="anonymous";im.src=feUrl(g);feCache.set(g,im)}return im}
const feReady=im=>im&&im.complete&&im.naturalWidth>0;
function feTag(g){return `<img class="fe" src="${feUrl(g)}" alt="${g}" crossorigin="anonymous">`}
const AVATARS=["🐻","🐰","🦊","🐱","🐶","🐼","🐧","🐨","🐹","🐸","🐯","🐥"];
const HUES=[18,42,140,190,262,330];
const DUST=[{h:130,n:"초록"},{h:200,n:"파랑"},{h:275,n:"보라"},{h:320,n:"분홍"}];
const EMOS=["👏","😂","🔥","❤️","🍻","🙏","😴","👻","🎉","🎄","🎅","⛄"];
const FOODS={m:{e:"🍡",n:"마시멜로",t:[14,34,52],c:[[247,242,232],[232,170,80],[122,68,32],[40,28,22]],v:["아직 하얘요","노릇노릇, 완벽해요","살짝 탔지만 맛있어요","숯이 됐어요"]},
  s:{e:"🌭",n:"소시지",t:[10,28,48],c:[[228,150,150],[200,92,62],[122,52,32],[45,25,20]],v:["아직 덜 익었어요","톡 터지는 육즙!","겉바속촉 완성","탄 소시지…"]},
  g:{e:"🍠",n:"고구마",t:[25,55,85],c:[[160,78,98],[125,58,62],[82,42,36],[35,25,22]],v:["아직 딱딱해요","호호, 잘 익었어요","꿀이 흘러요","겉은 숯, 속은 꿀"]},
  c:{e:"🌽",n:"옥수수",t:[10,28,48],c:[[250,222,96],[240,190,62],[172,112,42],[60,40,25]],v:["아직 생옥수수","톡톡 맛있어요","고소하게 잘 익었어요","새까매졌어요"]},
  b:{e:"🌰",n:"군밤",t:[12,30,50],c:[[132,78,44],[104,56,30],[66,36,20],[26,18,12]],v:["아직 덜 익었어요","껍질이 톡 벌어졌어요","달달하게 잘 익었어요","새까맣게 탔어요"]}};
const GIFTS=["🧣 목도리","🧤 장갑","🍪 쿠키","☕ 핫초코","🧦 양말","🎀 리본","⭐ 별 장식","🦌 루돌프 인형","🍰 케이크","💌 손편지"];
const foodOf=k=>FOODS[k]?k:"m";
function verdict(k,sec){const f=FOODS[foodOf(k)];return sec<f.t[0]?f.v[0]:sec<f.t[1]?f.v[1]:sec<f.t[2]?f.v[2]:f.v[3]}
const me={name:clean(store.get("fire.name")),av:+(store.get("fire.av")||0),hue:+store.get("fire.hue"),logs:[],roast:null,rk:"m",burn:null,dice:null,say:null,emo:null,dust:null,wish:null,typing:false,away:false,fw:null,card:null,pick:null,snow:null,gift:null};
if(!HUES.includes(me.hue)){me.hue=HUES[Math.floor(Math.random()*HUES.length)];store.set("fire.hue",me.hue)}
if(!(me.av>=0&&me.av<AVATARS.length))me.av=0;

let room=null,myPeer=null,loadedAt=performance.now();
const known=new Map(), bubbles=new Map();
const flying=[],flames=[],embers=[],floats=[];
let W=0,H=0,DPR=1,K=1,stars=[],treesFar=[],treesNear=[],colors={};
let intensity=.3,kick=0,tint=null;

/* ---------- scene ---------- */
function readColors(){const cs=getComputedStyle(document.documentElement);
  colors={top:cs.getPropertyValue("--sky-top"),bottom:cs.getPropertyValue("--sky-bottom"),hill:cs.getPropertyValue("--hill"),ground:cs.getPropertyValue("--ground")}}
function makeTrees(minH,maxH){const arr=[];let x=-30;
  while(x<W+30){const w=lerp(18,36,Math.random())*K;arr.push({x,h:lerp(minH,maxH,Math.random())*K,w});x+=w*lerp(.45,.8,Math.random())}return arr}
function resize(){
  const ae=document.activeElement;if(W&&innerWidth===W&&ae&&/^(INPUT|TEXTAREA)$/.test(ae.tagName)&&innerHeight<H)return;
  DPR=Math.min(innerWidth<640?1.5:2,window.devicePixelRatio||1);W=innerWidth;H=innerHeight;K=W<640?clamp(W/430,.72,1):clamp(Math.min(W/760,H/720),.6,1.15);
  canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);canvas.style.width=W+"px";canvas.style.height=H+"px";
  ctx.setTransform(DPR,0,0,DPR,0,0);readColors();
  stars=[];const n=Math.round(W*H/5200);
  for(let i=0;i<n;i++)stars.push({x:Math.random()*W,y:Math.random()*HY()*.95,r:Math.random()*1.3+.3,ph:Math.random()*6.28,sp:.6+Math.random()*1.6});
  treesFar=makeTrees(28,70);treesNear=makeTrees(40,105);
  bulbs=[];treesNear.forEach((tr,i)=>{if(i%3)return;for(let k=0;k<5;k++){const u=(k+1)/6;bulbs.push({x:tr.x+(k%2?1:-1)*tr.w*.18*(1-u*.6),y:-(tr.h*.55*u)+(-tr.h*.12),tx:tr.x,c:k%4,ph:Math.random()*6.28})}});
  flies=[];for(let i=0;i<(W<640?7:14);i++)flies.push({x:Math.random()*W,y:HY()+Math.random()*H*.22,ph:Math.random()*6.28,sp:.3+Math.random()*.5,r:Math.random()*.5+.5});
}
let flies=[],bulbs=[];
const BULB=["255,90,80","255,210,90","120,220,140","120,180,255"];
function drawFlies(t){ctx.save();ctx.globalCompositeOperation="lighter";
  for(const f of flies){const tt=t/1000*f.sp+f.ph;const x=f.x+Math.sin(tt*1.3)*30,y=f.y+Math.cos(tt)*14;const a=Math.max(0,Math.sin(tt*2.2))*.85;
    if(a<.05)continue;const g=ctx.createRadialGradient(x,y,0,x,y,7);g.addColorStop(0,`rgba(214,255,140,${a})`);g.addColorStop(1,"rgba(214,255,140,0)");ctx.fillStyle=g;ctx.fillRect(x-7,y-7,14,14)}
  ctx.restore()}
if(window.visualViewport){const vv=window.visualViewport;const kb=()=>{const k=Math.max(0,innerHeight-vv.height-vv.offsetTop);document.documentElement.style.setProperty("--kb",(k>40?k:0)+"px")};vv.addEventListener("resize",kb);vv.addEventListener("scroll",kb)}
addEventListener("resize",resize);
const mq=window.matchMedia("(prefers-color-scheme: dark)");if(mq.addEventListener)mq.addEventListener("change",readColors);
const HY=()=>W<640?H*.36:H*.4;
function geom(){if(W<640){const rx=W*.34;return {cx:W/2,cy:H*.45,rx,ry:rx*.5}}const cx=W/2,cy=H*.56,rx=clamp(W*.34,130*K,330*K),ry=rx*.34;return {cx,cy,rx,ry}}

/* ---------- sprites ---------- */
function sprite(stops){const c=document.createElement("canvas");c.width=c.height=64;const g=c.getContext("2d");
  const gr=g.createRadialGradient(32,32,0,32,32,32);stops.forEach(([o,col])=>gr.addColorStop(o,col));g.fillStyle=gr;g.fillRect(0,0,64,64);return c}
const SP=[
  sprite([[0,"rgba(255,244,205,.55)"],[.35,"rgba(255,206,120,.35)"],[1,"rgba(255,170,60,0)"]]),
  sprite([[0,"rgba(255,170,70,.6)"],[.45,"rgba(255,110,36,.3)"],[1,"rgba(220,70,20,0)"]]),
  sprite([[0,"rgba(196,64,26,.6)"],[.55,"rgba(110,28,12,.25)"],[1,"rgba(60,20,10,0)"]])];
const tintCache={};
function tinted(h){if(tintCache[h])return tintCache[h];const a=hsl2rgb(h,90,85),b=hsl2rgb(h,90,58),c=hsl2rgb(h,80,35);
  const r=x=>x.join(",");
  return tintCache[h]=[sprite([[0,`rgba(${r(a)},.6)`],[.35,`rgba(${r(a)},.35)`],[1,`rgba(${r(b)},0)`]]),
    sprite([[0,`rgba(${r(b)},.65)`],[.45,`rgba(${r(b)},.3)`],[1,`rgba(${r(c)},0)`]]),
    sprite([[0,`rgba(${r(c)},.6)`],[.55,`rgba(${r(c)},.25)`],[1,`rgba(${r(c)},0)`]])]}
function fireTint(){if(tint&&performance.now()<tint.until)return tint;tint=null;return null}
function glowRGB(){const t=fireTint();return t?hsl2rgb(t.h,90,55).join(","):"255,140,60"}

/* ---------- people ---------- */
function selfPerson(){return {id:"SELF",key:myPeer||"~",name:me.name,av:me.av,hue:me.hue,logs:me.logs,roast:me.roast,rk:me.rk,typing:false,away:me.away,isMe:true}}
function people(){
  const out=[];let haveMe=false;
  if(room){for(const p of room.peers()){
    if(p.kind!=="viewer")continue;
    if(p.sameTab){haveMe=true;if(me.name)out.push(selfPerson());continue}
    const pr=p.presence||{};const name=clean(pr.name);if(!name)continue;
    out.push({id:p.peer,key:p.peer,name,av:Number.isInteger(pr.av)&&pr.av>=0&&pr.av<AVATARS.length?pr.av:0,hue:HUES.includes(pr.hue)?pr.hue:30,
      logs:Array.isArray(pr.logs)?pr.logs.filter(Number.isFinite).slice(-12):[],
      roast:Number.isFinite(pr.roast)?pr.roast:null,rk:foodOf(pr.rk),typing:pr.typing===true,away:pr.away===true,isMe:false})}}
  if(!haveMe&&me.name)out.push(selfPerson());
  out.sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0);return out;
}
function seats(list){const {cx,cy,rx,ry}=geom();const n=list.length;const mi=Math.max(0,list.findIndex(p=>p.isMe));
  return list.map((p,i)=>{const a=Math.PI/2+(i-mi)*(Math.PI*2/Math.max(n,1));const x=cx+Math.cos(a)*rx,y=cy+Math.sin(a)*ry;
    return {p,x,y,s:(.7+.4*((y-(cy-ry))/(2*ry)))*K}})}

/* ---------- shooting star (같은 시간에 모두에게 같은 별) ---------- */
const STAR_P=70000,STAR_WIN=7000;
function starAt(now){const slot=Math.floor(now/STAR_P);
  for(const sl of [slot,slot-1]){if(rnd(sl)<.3)continue;const start=sl*STAR_P+rnd(sl+.5)*(STAR_P-STAR_WIN);
    if(now>=start&&now<start+STAR_WIN)return {sl,start,x0:rnd(sl+.1),y0:rnd(sl+.2),a:rnd(sl+.3)}}return null}
function drawStar(now){const st=starAt(now);if(!st)return;const u=(now-st.start)/1400;if(u>1)return;
  const x0=W*(.15+.6*st.x0),y0=H*(.04+.14*st.y0),ang=.35+.35*st.a,len=Math.min(W,900)*.45;
  const hx=x0+Math.cos(ang)*len*u,hy=y0+Math.sin(ang)*len*u;const tx=hx-Math.cos(ang)*120*K,ty=hy-Math.sin(ang)*120*K;
  const g=ctx.createLinearGradient(tx,ty,hx,hy);g.addColorStop(0,"rgba(255,255,255,0)");g.addColorStop(1,`rgba(255,250,235,${1-u*.6})`);
  ctx.strokeStyle=g;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(hx,hy);ctx.stroke();
  ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(hx,hy,2,0,6.283);ctx.fill()}

/* ---------- drawing ---------- */
function drawBackground(t){
  const hy=HY();const sky=ctx.createLinearGradient(0,0,0,hy);sky.addColorStop(0,colors.top);sky.addColorStop(1,colors.bottom);
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,hy+2);
  for(const s of stars){ctx.globalAlpha=clamp(.35+.35*Math.sin(t*s.sp+s.ph),.05,.8);ctx.fillStyle="#fff7e6";ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,6.283);ctx.fill()}
  ctx.globalAlpha=1;drawStar(Date.now());
  const hill=hex(colors.hill),gr=hex(colors.ground);
  ctx.fillStyle=mix(hill,hex(colors.bottom),.35);drawTrees(treesFar,hy-H*.03);
  ctx.fillStyle=colors.hill;ctx.fillRect(0,hy-H*.03,W,H*.04);
  ctx.fillStyle=mix(hill,gr,.5);drawTrees(treesNear,hy+H*.005,XMAS);if(XMAS)drawBulbs(t*1000,hy+H*.005);
  const g=ctx.createLinearGradient(0,hy,0,H);g.addColorStop(0,mix(hill,gr,.5));g.addColorStop(1,colors.ground);ctx.fillStyle=g;ctx.fillRect(0,hy,W,H-hy);
  if(XMAS){const s=ctx.createLinearGradient(0,hy,0,H);s.addColorStop(0,"rgba(200,215,235,.16)");s.addColorStop(1,"rgba(200,215,235,.05)");ctx.fillStyle=s;ctx.fillRect(0,hy,W,H-hy);drawBigTree(t*1000)}
}
function drawTrees(arr,base,snowy){ctx.beginPath();
  for(const tr of arr){for(let k=0;k<3;k++){const yy=base-tr.h*k*.28,w=tr.w*(1-k*.22);ctx.moveTo(tr.x-w/2,yy);ctx.lineTo(tr.x,yy-tr.h*.55);ctx.lineTo(tr.x+w/2,yy)}}ctx.fill();
  if(!snowy)return;const fs=ctx.fillStyle;ctx.fillStyle="rgba(225,235,245,.55)";ctx.beginPath();
  for(const tr of arr){for(let k=0;k<3;k++){const yy=base-tr.h*k*.28,w=tr.w*(1-k*.22),top=yy-tr.h*.55,q=.32;
    ctx.moveTo(tr.x-w/2*q,top+tr.h*.55*q);ctx.lineTo(tr.x,top);ctx.lineTo(tr.x+w/2*q,top+tr.h*.55*q);ctx.closePath()}}ctx.fill();ctx.fillStyle=fs}
function drawBulbs(t,base){ctx.save();ctx.globalCompositeOperation="lighter";
  for(const b of bulbs){const on=.45+.55*Math.max(0,Math.sin(t/600+b.ph));const x=b.x,y=base+b.y;
    const g=ctx.createRadialGradient(x,y,0,x,y,6);g.addColorStop(0,`rgba(${BULB[b.c]},${on})`);g.addColorStop(1,`rgba(${BULB[b.c]},0)`);ctx.fillStyle=g;ctx.fillRect(x-6,y-6,12,12)}
  ctx.restore()}
function drawBigTree(t){const hy=HY();const mob=W<640;const x=mob?W*.84:W*.8,base=hy+H*(mob?.09:.1),h=H*(mob?.2:.26),w=h*.62;
  ctx.fillStyle="#3a2618";ctx.fillRect(x-w*.06,base-h*.08,w*.12,h*.1);
  for(let k=0;k<4;k++){const yy=base-h*.08-k*h*.2,ww=w*(1-k*.2);ctx.fillStyle=k%2?"#163a2a":"#1b4532";ctx.beginPath();ctx.moveTo(x-ww/2,yy);ctx.lineTo(x,yy-h*.34);ctx.lineTo(x+ww/2,yy);ctx.closePath();ctx.fill()}
  ctx.save();ctx.globalCompositeOperation="lighter";
  for(let i=0;i<22;i++){const u=rnd(i*3.1),v=rnd(i*7.7);const yy=base-h*.12-u*h*.7;const half=w*.5*(1-(base-h*.12-yy)/(h*.85))*.85;const xx=x+(v*2-1)*half;
    const on=.4+.6*Math.max(0,Math.sin(t/500+i));const c=BULB[i%4];const g=ctx.createRadialGradient(xx,yy,0,xx,yy,7);g.addColorStop(0,`rgba(${c},${on})`);g.addColorStop(1,`rgba(${c},0)`);ctx.fillStyle=g;ctx.fillRect(xx-7,yy-7,14,14)}
  const sy=base-h*.08-3*h*.2-h*.34;const sp=.7+.3*Math.sin(t/300);const g=ctx.createRadialGradient(x,sy,0,x,sy,16*sp);g.addColorStop(0,"rgba(255,236,150,1)");g.addColorStop(1,"rgba(255,220,120,0)");ctx.fillStyle=g;ctx.fillRect(x-16,sy-16,32,32);
  ctx.restore();ctx.fillStyle="#ffe58a";ctx.beginPath();for(let i=0;i<10;i++){const r=i%2?3.2:7.5,a=-Math.PI/2+i*Math.PI/5;ctx.lineTo(x+Math.cos(a)*r,sy+Math.sin(a)*r)}ctx.closePath();ctx.fill()}
function drawGlow(I){const {cx,cy}=geom();const r=(150+320*I)*K;const c=glowRGB();
  ctx.save();ctx.globalCompositeOperation="lighter";
  const g=ctx.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,`rgba(${c},${.32*I})`);g.addColorStop(.45,`rgba(${c},${.12*I})`);g.addColorStop(1,`rgba(${c},0)`);
  ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(cx,cy,r,r*.62,0,0,6.283);ctx.fill();ctx.restore()}
function drawPit(I){const {cx,cy}=geom();const c=glowRGB();
  ctx.save();ctx.globalCompositeOperation="lighter";const g=ctx.createRadialGradient(cx,cy+2*K,0,cx,cy+2*K,40*K);
  g.addColorStop(0,`rgba(${c},${.5+.3*I})`);g.addColorStop(1,`rgba(${c},0)`);ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(cx,cy+2*K,42*K,12*K,0,0,6.283);ctx.fill();ctx.restore();
  for(let i=0;i<11;i++){const a=i/11*6.283;const x=cx+Math.cos(a)*48*K,y=cy+4*K+Math.sin(a)*14*K;const lit=Math.sin(a)<0?.15:.35+.3*I;
    ctx.fillStyle=mix([40,42,40],[150,110,80],lit);ctx.beginPath();ctx.ellipse(x,y,9*K,5.5*K,0,0,6.283);ctx.fill()}
  for(const [rot,dy] of [[-.35,0],[.35,0],[.05,-3]]){ctx.save();ctx.translate(cx,cy+dy*K);ctx.rotate(rot);
    ctx.fillStyle="#3b2416";ctx.fillRect(-34*K,-5*K,68*K,10*K);ctx.fillStyle=`rgba(${c},${.25+.35*I})`;ctx.fillRect(-10*K,-5*K,20*K,3*K);ctx.restore()}}
function drawFlames(){const t=fireTint();const S=t?tinted(t.h):SP;
  ctx.save();ctx.globalCompositeOperation="lighter";
  for(const f of flames){const u=f.age/f.life;const sz=f.size*(1-.55*u);ctx.globalAlpha=clamp((1-u)*1.1,0,1);ctx.drawImage(S[u<.3?0:u<.66?1:2],f.x-sz/2,f.y-sz/2,sz,sz)}
  for(const e of embers){ctx.globalAlpha=clamp(1-e.age/e.life,0,1);ctx.fillStyle=e.c||"#ffd791";ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,6.283);ctx.fill()}
  ctx.restore();ctx.globalAlpha=1}
function rr(x,y,w,h,r){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h)}
function drawPerson(st,I,t){const {p,x,y,s}=st;const {cx,cy,rx}=geom();
  ctx.globalAlpha=p.away?.55:1;
  const lit=clamp(I*1.15-Math.hypot(x-cx,(y-cy)*2.4)/(rx*2.6),.08,1);
  const bob=reduce?0:Math.sin(t/900+x*.05)*.8*s;
  ctx.fillStyle="rgba(0,0,0,.32)";ctx.beginPath();ctx.ellipse(x+(x-cx)*.06,y+2*s,22*s,5*s,0,0,6.283);ctx.fill();
  /* 몸: 불빛 받는 담요 실루엣 */
  ctx.fillStyle=mix([18,24,23],[128,86,56],lit*.8);ctx.beginPath();ctx.moveTo(x-18*s,y);ctx.quadraticCurveTo(x-20*s,y-29*s+bob,x,y-33*s+bob);ctx.quadraticCurveTo(x+20*s,y-29*s+bob,x+18*s,y);ctx.closePath();ctx.fill();
  /* 목도리 */
  ctx.fillStyle=`hsl(${p.hue} 50% ${18+30*lit}%)`;rr(x-13*s,y-34*s+bob,26*s,6*s,3*s);ctx.fill();ctx.fillRect(x+4*s,y-30*s+bob,5*s,10*s);
  /* 얼굴 (동물) */
  const im=feImg(AVATARS[p.av||0]);const hs=38*s,hy=y-31*s-hs*.9+bob;
  if(feReady(im)){ctx.drawImage(im,x-hs/2,hy,hs,hs);
    const sh=clamp(.62-lit*.75,0,.6);if(sh>0){ctx.fillStyle=`rgba(10,14,20,${sh})`;ctx.beginPath();ctx.arc(x,hy+hs*.53,hs*.43,0,6.283);ctx.fill()}
    const gl=clamp(lit-.4,0,.5);if(gl>0){ctx.save();ctx.globalCompositeOperation="lighter";ctx.fillStyle=`rgba(255,140,60,${gl*.25})`;ctx.beginPath();ctx.arc(x,hy+hs*.53,hs*.42,0,6.283);ctx.fill();ctx.restore()}}
  else{ctx.fillStyle=mix([22,27,26],[160,112,76],lit*.85);ctx.beginPath();ctx.arc(x,hy+hs/2,hs*.3,0,6.283);ctx.fill()}
  /* 산타 모자 */
  if(XMAS){const top=hy+hs*.16;ctx.fillStyle=`hsl(356 65% ${24+26*lit}%)`;ctx.beginPath();ctx.moveTo(x-hs*.32,top+2*s);ctx.quadraticCurveTo(x-2*s,top-hs*.5,x+hs*.4,top-hs*.16);ctx.lineTo(x+hs*.28,top+2*s);ctx.closePath();ctx.fill();
    ctx.fillStyle=`rgba(240,240,236,${.55+.4*lit})`;rr(x-hs*.36,top-1*s,hs*.72,5.5*s,2.75*s);ctx.fill();ctx.beginPath();ctx.arc(x+hs*.41,top-hs*.16,3.4*s,0,6.283);ctx.fill()}
  ctx.font=`500 ${Math.max(12,Math.round(13*K))}px "Pretendard Variable", Pretendard, "Apple SD Gothic Neo", sans-serif`;ctx.textAlign="center";ctx.textBaseline="top";
  ctx.fillStyle=`rgba(243,235,221,${.5+.4*lit})`;ctx.fillText((p.isMe?p.name+" (나)":p.name)+(p.away?" · 자리 비움":""),x,y+9*s);
  ctx.globalAlpha=1;
  if(p.away){ctx.font=`700 ${Math.max(12,Math.round(14*K))}px "Gowun Batang", serif`;ctx.fillStyle="rgba(220,230,255,.75)";ctx.textBaseline="bottom";
    for(let k=0;k<3;k++){const u=((t/1000)*.5+k/3)%1;ctx.globalAlpha=Math.sin(u*Math.PI)*.8;ctx.fillText("z",x+14*s+u*16*s,y-70*s-u*26*s)}ctx.globalAlpha=1}}
function roastColor(k,sec){const f=FOODS[foodOf(k)],c=f.c,t=f.t;
  if(sec<t[0])return mix(c[0],c[0],0);if(sec<t[1])return mix(c[0],c[1],(sec-t[0])/(t[1]-t[0]));if(sec<t[2])return mix(c[1],c[2],(sec-t[1])/(t[2]-t[1]));return mix(c[2],c[3],clamp((sec-t[2])/12,0,1))}
function drawRoasts(list,now){const {cx,cy}=geom();
  for(const {p,x,y,s} of list){if(p.roast==null)continue;const dir=x<cx-4?1:x>cx+4?-1:0;const hx=x+(dir||1)*14*s,hy=y-24*s;
    const tx=lerp(hx,cx,.7),ty=lerp(hy,cy-34*K,.7);ctx.strokeStyle="#d9b98a";ctx.lineWidth=Math.max(1.6,2.4*s);
    ctx.beginPath();ctx.moveTo(hx,hy);ctx.lineTo(tx,ty);ctx.stroke();const sec=Math.max(0,(now-p.roast)/1000);
    const k=foodOf(p.rk),f=FOODS[k];const mw=Math.max(8,9*K),mh=Math.max(7,8*K);const ang=Math.atan2(ty-hy,tx-hx);
    ctx.fillStyle="rgba(20,12,6,.5)";ctx.beginPath();ctx.ellipse(tx,ty,mw*(k==="m"?1:1.6)+4,mh+4,ang,0,6.283);ctx.fill();
    ctx.save();ctx.translate(tx,ty);ctx.rotate(ang);ctx.fillStyle=roastColor(k,sec);ctx.strokeStyle="#2a1a0e";ctx.lineWidth=2;ctx.beginPath();
    if(k==="m"){ctx.rotate(-ang);if(ctx.roundRect)ctx.roundRect(-mw,-mh,mw*2,mh*2,mh*.7);else ctx.rect(-mw,-mh,mw*2,mh*2);ctx.fill();ctx.stroke();
      ctx.fillStyle="rgba(255,255,255,.55)";ctx.beginPath();ctx.ellipse(-mw*.35,-mh*.4,mw*.35,mh*.22,0,0,6.283);ctx.fill()}
    else if(k==="s"){const L=mw*1.7,Hh=mh*.75;if(ctx.roundRect)ctx.roundRect(-L,-Hh,L*2,Hh*2,Hh);else ctx.rect(-L,-Hh,L*2,Hh*2);ctx.fill();ctx.stroke();
      if(sec>f.t[0]){ctx.strokeStyle="rgba(50,22,12,.7)";ctx.lineWidth=1.6;for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(i*L*.45-3,-Hh*.7);ctx.lineTo(i*L*.45+3,Hh*.7);ctx.stroke()}}
      ctx.fillStyle="rgba(255,255,255,.35)";ctx.beginPath();ctx.ellipse(0,-Hh*.45,L*.6,Hh*.18,0,0,6.283);ctx.fill()}
    else if(k==="g"){ctx.ellipse(0,0,mw*1.55,mh*1.05,0,0,6.283);ctx.fill();ctx.stroke();
      if(sec>f.t[1]){ctx.fillStyle="rgba(255,196,64,.9)";ctx.beginPath();ctx.ellipse(mw*.4,-mh*.2,mw*.45,mh*.35,.3,0,6.283);ctx.fill()}}
    else if(k==="b"){for(let i=-1;i<=1;i++){ctx.beginPath();ctx.fillStyle=roastColor(k,sec);ctx.ellipse(i*mw*.95,0,mw*.55,mh*.62,0,0,6.283);ctx.fill();ctx.stroke();
        ctx.fillStyle=sec>f.t[0]?"rgba(250,214,140,.85)":"rgba(255,255,255,.25)";ctx.beginPath();ctx.ellipse(i*mw*.95,-mh*.15,mw*.22,mh*.12,0,0,6.283);ctx.fill()}}
    else{ctx.ellipse(0,0,mw*1.5,mh*.95,0,0,6.283);ctx.fill();ctx.stroke();ctx.fillStyle="rgba(255,250,210,.55)";
      for(let i=-2;i<=2;i++)for(let j=-1;j<=1;j++){ctx.beginPath();ctx.arc(i*mw*.5,j*mh*.48,1.4,0,6.283);ctx.fill()}
      ctx.fillStyle="#6f9a3e";ctx.beginPath();ctx.moveTo(-mw*1.45,0);ctx.lineTo(-mw*2.1,-mh*.9);ctx.lineTo(-mw*1.8,mh*.2);ctx.closePath();ctx.fill()}
    ctx.restore();
    if(sec>f.t[2]&&Math.random()<.3)embers.push({x:tx,y:ty,vx:(Math.random()-.5)*10,vy:-20,life:1,age:0,r:1})}}
function wrap(text,maxW){const out=[];let line="";
  for(const ch of Array.from(text)){if(ctx.measureText(line+ch).width>maxW&&line){out.push(line);line=ch;if(out.length===3)break}else line+=ch}
  if(out.length<3&&line)out.push(line);if(out.length===3&&Array.from(text).join("").length>out.join("").length)out[2]=out[2].slice(0,-1)+"…";return out}
function drawBubbles(list,t){
  for(const st of list){const b=bubbles.get(st.p.id);
    if(!b&&st.p.typing){const bx=st.x,by=st.y-82*st.s;ctx.fillStyle="rgba(250,244,232,.85)";ctx.beginPath();
      if(ctx.roundRect)ctx.roundRect(bx-20,by-14,40,22,11);else ctx.rect(bx-20,by-14,40,22);ctx.fill();
      for(let k=0;k<3;k++){ctx.fillStyle=`rgba(36,26,18,${.35+.5*Math.max(0,Math.sin(t/180-k*.8))})`;ctx.beginPath();ctx.arc(bx-9+k*9,by-3,2.6,0,6.283);ctx.fill()}continue}
    if(!b)continue;const age=(t-b.t0)/1000;if(age>9){bubbles.delete(st.p.id);continue}
    ctx.globalAlpha=age<.2?age/.2:age>8?9-age:1;
    const bf=Math.max(14,Math.round(15*K));ctx.font=`500 ${bf}px "Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;const lines=wrap(b.text,Math.max(150,170*K));
    const lh=bf*1.35,pad=Math.max(8,9*K);const w=Math.max(...lines.map(l=>ctx.measureText(l).width))+pad*2,h=lines.length*lh+pad*1.4;
    const bx=clamp(st.x-w/2,6,W-w-6),by=st.y-76*st.s-h;
    ctx.fillStyle="rgba(250,244,232,.93)";ctx.beginPath();
    if(ctx.roundRect)ctx.roundRect(bx,by,w,h,12*K);else ctx.rect(bx,by,w,h);ctx.fill();
    ctx.beginPath();ctx.moveTo(st.x-6*K,by+h-1);ctx.lineTo(st.x,by+h+7*K);ctx.lineTo(st.x+6*K,by+h-1);ctx.fill();
    ctx.fillStyle="#241a12";ctx.textAlign="center";ctx.textBaseline="top";
    lines.forEach((l,i)=>ctx.fillText(l,bx+w/2,by+pad*.7+i*lh))}
  ctx.globalAlpha=1}
function drawFloats(list,t){const byId=new Map(list.map(st=>[st.p.id,st]));ctx.textAlign="center";ctx.textBaseline="bottom";
  for(let i=floats.length-1;i>=0;i--){const f=floats[i];const u=(t-f.t0)/(f.emoji?1800:2600);if(u>=1){floats.splice(i,1);continue}
    const st=byId.get(f.id);if(!st||u<0)continue;ctx.globalAlpha=u<.12?u/.12:1-Math.max(0,(u-.6)/.4);
    if(f.emoji){ctx.font=`${Math.round(30*K)}px sans-serif`;ctx.fillText(f.text,st.x+(f.dx||0)*K+Math.sin(u*6+f.ph)*8*K,st.y-76*st.s-u*90*K)}
    else{ctx.font=`700 ${Math.round(15*K)}px "Gowun Batang", serif`;ctx.fillStyle="#ffe2b0";ctx.fillText(f.text,st.x,st.y-84*st.s-u*24*K)}}
  ctx.globalAlpha=1}
function drawFlying(list,t){const byId=new Map(list.map(st=>[st.p.id,st]));const {cx,cy}=geom();
  for(let i=flying.length-1;i>=0;i--){const f=flying[i];const u=(t-f.t0)/750;const st=byId.get(f.id);
    if(!st||u>=1){flying.splice(i,1);if(st){if(f.dust!=null)dustBurst(f.dust);else{burst();if(f.paper)paperBurst()}}continue}
    const x=lerp(st.x,cx,u),y=lerp(st.y-26*st.s,cy-6*K,u)-Math.sin(u*Math.PI)*90*K;ctx.save();ctx.translate(x,y);
    if(f.paper){ctx.rotate(u*7);ctx.fillStyle="#f4ecd8";ctx.fillRect(-9*K,-6*K,18*K,12*K);ctx.strokeStyle="rgba(120,90,60,.6)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-6*K,-2*K);ctx.lineTo(6*K,-2*K);ctx.moveTo(-6*K,2*K);ctx.lineTo(4*K,2*K);ctx.stroke()}
    else if(f.dust!=null){const c=hsl2rgb(f.dust,90,70).join(",");for(let k=0;k<6;k++){ctx.fillStyle=`rgba(${c},.85)`;ctx.beginPath();ctx.arc(Math.cos(k+u*9)*6*K,Math.sin(k*2+u*9)*6*K,2*K,0,6.283);ctx.fill()}}
    else{ctx.rotate(u*5);ctx.fillStyle="#5a3a22";ctx.fillRect(-16*K,-4*K,32*K,8*K);ctx.fillStyle="#8a6040";ctx.beginPath();ctx.ellipse(16*K,0,2.5*K,4*K,0,0,6.283);ctx.fill()}
    ctx.restore()}}
function burst(){const {cx,cy}=geom();kick=Math.min(kick+.35,.8);const n=reduce?10:28;
  for(let i=0;i<n;i++)embers.push({x:cx+(Math.random()-.5)*30*K,y:cy-10*K,vx:(Math.random()-.5)*90,vy:-(80+Math.random()*160),life:1.2+Math.random()*1.6,age:0,r:Math.random()*1.6+.6});
  crackle()}
function paperBurst(){const {cx,cy}=geom();kick=Math.min(kick+.3,.9);
  for(let i=0;i<(reduce?10:30);i++)embers.push({x:cx+(Math.random()-.5)*20*K,y:cy-20*K,vx:(Math.random()-.5)*60,vy:-(60+Math.random()*120),life:1.8+Math.random()*1.6,age:0,r:Math.random()*1.4+.6,c:"#b9b3a8"})}
function dustBurst(h){const {cx,cy}=geom();tint={h,until:performance.now()+12000};kick=Math.min(kick+.25,.8);const c=`hsl(${h} 90% 75%)`;
  for(let i=0;i<(reduce?14:40);i++)embers.push({x:cx+(Math.random()-.5)*40*K,y:cy-14*K,vx:(Math.random()-.5)*140,vy:-(60+Math.random()*200),life:1.4+Math.random()*1.8,age:0,r:Math.random()*2+.8,c})}

/* ---------- simulation ---------- */
function targetIntensity(list,now){let e=0;for(const p of list)for(const ts of p.logs){const age=Math.max(0,now-ts);if(age<15*60e3)e+=Math.exp(-age/240e3)}return clamp(.3+e*.17,.3,1.15)}
let flameAcc=0,emberAcc=0;
function step(dt,I){const {cx,cy}=geom();
  flameAcc+=dt*(reduce?30:(50+100*I)*(W<640?.65:1));
  while(flameAcc>1){flameAcc--;const sp=(12+20*I)*K;flames.push({x:cx+(Math.random()-.5)*2*sp,y:cy-4*K,vx:(Math.random()-.5)*16,vy:-(50+60*Math.random())*(.7+.6*I)*K,life:(.5+.6*Math.random())*(.8+.4*I),age:0,size:(24+22*I)*K*(.7+.6*Math.random())*(W<640?1.15:1)})}
  emberAcc+=dt*(1.5+6*I);
  while(emberAcc>1){emberAcc--;embers.push({x:cx+(Math.random()-.5)*24*K,y:cy-20*K,vx:(Math.random()-.5)*30,vy:-(40+Math.random()*90),life:1.4+Math.random()*1.6,age:0,r:Math.random()*1.2+.5})}
  for(let i=flames.length-1;i>=0;i--){const f=flames[i];f.age+=dt;if(f.age>=f.life){flames.splice(i,1);continue}f.vx+=(cx-f.x)*1.4*dt;f.x+=f.vx*dt;f.y+=f.vy*dt}
  for(let i=embers.length-1;i>=0;i--){const e=embers[i];e.age+=dt;if(e.age>=e.life){embers.splice(i,1);continue}e.x+=(e.vx+Math.sin(e.age*4+e.r*9)*14)*dt;e.y+=e.vy*dt;e.vy*=1-dt*.3}}

/* ---------- 모닥불 소리 (Glaneur de sons, CC BY 3.0, Wikimedia Commons) ---------- */
const FIRE_SND="https://upload.wikimedia.org/wikipedia/commons/transcoded/b/b1/Campfire_sound_ambience.ogg/Campfire_sound_ambience.ogg.mp3";
let sfx=null;
function startSfx(){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;const a=new AC();
  const comp=a.createDynamicsCompressor();comp.threshold.value=-30;comp.knee.value=10;comp.ratio.value=4;
  const g=a.createGain();g.gain.value=0;comp.connect(g).connect(a.destination);
  const o={a,g,on:true,ready:false};
  fetch(FIRE_SND).then(r=>r.arrayBuffer()).then(ab=>new Promise((res,rej)=>a.decodeAudioData(ab,res,rej))).then(buf=>{
    const src=a.createBufferSource();src.buffer=buf;src.loop=true;src.loopStart=1;src.loopEnd=Math.max(2,Math.min(52,buf.duration-1));
    src.connect(comp);src.start(0,1);o.ready=true}).catch(()=>toast("모닥불 소리를 불러오지 못했어요"));
  return o}
function crackle(){if(sfx&&sfx.on&&sfx.ready){const t=sfx.a.currentTime;sfx.g.gain.cancelScheduledValues(t);sfx.g.gain.setTargetAtTime(3.2,t,.08);sfx.g.gain.setTargetAtTime(2,t+.6,.6)}}
$("#soundBtn").addEventListener("click",()=>{if(!sfx){sfx=startSfx();if(!sfx)return}else{sfx.on=!sfx.on;sfx.on?sfx.a.resume():sfx.a.suspend()}
  $("#soundBtn").textContent=sfx.on?"모닥불 소리 끄기":"모닥불 소리 켜기";$("#soundBtn").classList.toggle("on",sfx.on)});

/* ---------- 노래 (모두 같은 곡, 같은 구간) ---------- */
let tracks=[],anchor=0,anchorAt=0,listening=false,curSrc="",musicAction=null;
const music=new Audio();music.preload="auto";music.volume=.6;
const musicBtn=$("#musicBtn"),skipBtn=$("#skipBtn"),vol=$("#vol"),nowEl=$("#now");
function total(){return tracks.reduce((s,t)=>s+t.duration,0)}
function schedule(now){const T=total();if(!T)return null;let pos=((now-anchor)/1000)%T;if(pos<0)pos+=T;
  for(let i=0;i<tracks.length;i++){if(pos<tracks[i].duration)return {i,off:pos};pos-=tracks[i].duration}return {i:0,off:0}}
function refreshMusicUI(){
  if(!tracks.length){musicBtn.disabled=true;musicBtn.textContent="노래 준비 중";vol.hidden=true;nowEl.textContent="";skipBtn.hidden=true;return}
  musicBtn.disabled=false;musicBtn.textContent=listening?"노래 끄기":"노래 듣기";musicBtn.classList.toggle("on",listening);
  vol.hidden=!listening;skipBtn.hidden=tracks.length<2;const s=schedule(Date.now());nowEl.textContent=s?"♪ "+tracks[s.i].title:""}
function syncMusic(){refreshMusicUI();if(!listening)return;const s=schedule(Date.now());if(!s)return;const src=tracks[s.i].src;
  if(curSrc!==src){curSrc=src;music.src=src;music.play().catch(()=>{});return}
  if(music.readyState>=1&&!music.seeking&&Math.abs(music.currentTime-s.off)>2.5)music.currentTime=s.off;
  if(music.paused)music.play().catch(()=>{})}
music.addEventListener("loadedmetadata",()=>{const s=schedule(Date.now());if(s&&listening)music.currentTime=Math.min(s.off,Math.max(0,music.duration-.5))});
music.addEventListener("ended",syncMusic);setInterval(syncMusic,1500);
musicBtn.addEventListener("click",()=>{listening=!listening;
  if(listening){const s=schedule(Date.now());if(s){curSrc=tracks[s.i].src;music.src=curSrc;music.play().catch(()=>{})}}else{music.pause();curSrc=""}refreshMusicUI()});
vol.addEventListener("input",()=>{music.volume=+vol.value});
function setAnchor(a,at){if(!(at>anchorAt))return;anchor=a;anchorAt=at;curSrc="";syncMusic()}
skipBtn.addEventListener("click",()=>{const now=Date.now();const s=schedule(now);if(!s)return;let start=0;for(let i=0;i<=s.i;i++)start+=tracks[i].duration;
  setAnchor(now-start*1000,now);if(musicAction)musicAction.send({anchor,at:anchorAt});addLine("",0,`${me.name||"누군가"}님이 다음 곡으로 넘겼어요`,true)});
function probe(src){return new Promise(res=>{const a=new Audio();a.preload="metadata";const done=v=>{a.src="";res(v)};
  a.addEventListener("loadedmetadata",()=>done(Number.isFinite(a.duration)?a.duration:0));a.addEventListener("error",()=>done(0));setTimeout(()=>done(0),15000);a.src=src})}
async function loadTracks(){
  let list=[];try{const r=await fetch("music/list.json",{cache:"no-cache"});list=await r.json()}catch(e){list=[]}
  if(!Array.isArray(list))list=[];
  const out=[];for(const t of list){if(!t||typeof t.file!=="string")continue;const src="music/"+encodeURIComponent(t.file);const d=await probe(src);
    if(d>1)out.push({src,duration:d,title:clean(t.title||t.file.replace(/\.[^.]+$/,""),60)})}
  tracks=out;syncMusic()}

/* ---------- loop ---------- */
let lastT=performance.now(),lastGain=0,fireHigh=false,fireWarned=0;
function frame(t){
  const dt=Math.min(.1,(t-lastT)/1000);lastT=t;const now=Date.now();const list=people();
  const tgt=targetIntensity(list,now);if(tgt>.6)fireHigh=true;
  if(fireHigh&&tgt<.38&&now-fireWarned>180000){fireHigh=false;fireWarned=now;toast("불이 약해지고 있어요. 장작 하나 넣어볼까요?")}
  intensity+=(tgt+kick-intensity)*Math.min(1,dt*1.4);kick*=Math.exp(-dt*1.1);
  const I=intensity*(1+(reduce?0:.05*Math.sin(t/90)+.03*Math.sin(t/37)));
  step(dt,I);drawBackground(t/1000);drawFlies(t);drawGlow(I);
  const st=seats(list);const {cy}=geom();
  st.filter(s=>s.y<cy).sort((a,b)=>a.y-b.y).forEach(s=>drawPerson(s,I,t));
  drawPit(I);drawFlames();drawFlying(st,t);
  st.filter(s=>s.y>=cy).sort((a,b)=>a.y-b.y).forEach(s=>drawPerson(s,I,t));
  drawRoasts(st,now);drawGifts(st,t);drawBubbles(st,t);drawFloats(st,t);drawFireworks(t,dt);drawSnow(t,dt);
  const star=starAt(now);const show=!!star&&me.name&&(!me.wish||me.wish.s!==star.sl);
  if(wishBtn.hidden===show)wishBtn.hidden=!show;
  if(sfx&&sfx.on&&sfx.ready&&t-lastGain>1500){sfx.g.gain.setTargetAtTime(1.4+1.2*clamp(I,0,1.2),sfx.a.currentTime,.8);lastGain=t}
  requestAnimationFrame(frame)}

/* ---------- UI ---------- */
let toastTimer=null;const toastQ=[];
function toast(m){toastQ.push(m);if(!toastTimer)nextToast()}
function nextToast(){const el=$("#toast");const m=toastQ.shift();if(!m){el.classList.remove("on");toastTimer=null;return}
  el.textContent=m;el.classList.add("on");toastTimer=setTimeout(()=>{el.classList.remove("on");setTimeout(nextToast,500)},2800)}
const logEl=$("#log");
function addLine(name,hue,text,sys){const ph=logEl.querySelector(".empty");if(ph)ph.remove();const d=document.createElement("div");d.className="ln";
  if(sys){const s=document.createElement("span");s.className="sys";s.textContent=text;d.appendChild(s)}
  else{const n=document.createElement("span");n.className="nm";n.style.color=`hsl(${hue} 70% 72%)`;n.textContent=name;d.appendChild(n);d.appendChild(document.createTextNode(text))}
  logEl.appendChild(d);while(logEl.children.length>40)logEl.firstChild.remove();logEl.scrollTop=logEl.scrollHeight;setTimeout(()=>d.classList.add("old"),40000)}
let solo=false;
let enteredAt=0;
function updateWho(){const n=people().length;const m=enteredAt?Math.floor((Date.now()-enteredAt)/60000):0;const tm=m>=1?` · ${m}분째 불멍 중`:"";
  $("#who").textContent=solo?"친구 연결이 안 되고 있어요. 새로고침해 보세요.":n<=1?"혼자 불을 지키는 중"+tm+". 초대 링크를 친구한테 보내 보세요.":`불 앞에 ${n}명`+tm}
setInterval(updateWho,30000);
function pushPresence(){if(!room||!me.name)return;room.presence({name:me.name,av:me.av,hue:me.hue,logs:me.logs,roast:me.roast,say:me.say,emo:me.emo,dust:me.dust,wish:me.wish,typing:me.typing,away:me.away,fw:me.fw,card:me.card,pick:me.pick,snow:me.snow,rk:me.rk,burn:me.burn,dice:me.dice,gift:me.gift}).catch(()=>{})}
function needName(){if(!me.name){openSit();return true}return false}

const sit=$("#sit"),nameInput=$("#nameInput"),sw=$("#swatches");
const avBox=$("#avatars");
AVATARS.forEach((g,i)=>{const b=document.createElement("button");b.type="button";b.className="av";b.innerHTML=feTag(g);b.setAttribute("aria-label",`캐릭터 ${i+1}`);
  b.addEventListener("click",()=>{me.av=i;markAv()});avBox.appendChild(b)});
function markAv(){avBox.querySelectorAll(".av").forEach((b,i)=>b.setAttribute("aria-pressed",String(i===me.av)))}
HUES.forEach((h,i)=>{const b=document.createElement("button");b.type="button";b.className="sw";b.style.background=`hsl(${h} 55% 55%)`;
  b.setAttribute("aria-label",`목도리 색 ${i+1}`);b.dataset.h=h;b.addEventListener("click",()=>{me.hue=h;markSw()});sw.appendChild(b)});
function markSw(){sw.querySelectorAll(".sw").forEach(b=>b.setAttribute("aria-pressed",String(+b.dataset.h===me.hue)))}
function openSit(){nameInput.value=me.name;markSw();markAv();sit.hidden=false;setTimeout(()=>nameInput.focus(),50)}
$("#sitForm").addEventListener("submit",e=>{e.preventDefault();const n=clean(nameInput.value);if(!n)return;
  me.name=n;store.set("fire.name",n);store.set("fire.hue",me.hue);store.set("fire.av",me.av);sit.hidden=true;pushPresence();updateWho()});
$("#renameBtn").addEventListener("click",openSit);

const logBtn=$("#logBtn");
logBtn.addEventListener("click",()=>{if(needName())return;const now=Date.now();me.logs=me.logs.filter(ts=>now-ts<15*60e3).concat(now).slice(-12);
  flying.push({id:"SELF",t0:performance.now()});pushPresence();logBtn.disabled=true;setTimeout(()=>logBtn.disabled=false,1200)});
const roastBtn=$("#roastBtn");
function setRoastLabel(){roastBtn.querySelector(".i").textContent=me.roast==null?"🍢":FOODS[me.rk].e;roastBtn.querySelector(".t").textContent=me.roast==null?"굽기":"먹기"}
roastBtn.addEventListener("click",()=>{if(needName())return;
  if(me.roast==null){toggleTray("roast");return}
  const sec=(Date.now()-me.roast)/1000;floats.push({id:"SELF",text:FOODS[me.rk].e+" "+verdict(me.rk,sec),t0:performance.now()});
  me.roast=null;setRoastLabel();pushPresence()});
document.querySelectorAll("#roastTray .food").forEach(b=>b.addEventListener("click",()=>{if(needName())return;
  me.rk=foodOf(b.dataset.k);me.roast=Date.now();setRoastLabel();toggleTray("none");pushPresence()}));
const dustBtn=$("#dustBtn");
dustBtn.addEventListener("click",()=>{if(needName())return;const d=DUST[Math.floor(Math.random()*DUST.length)];
  me.dust={h:d.h,at:Date.now()};flying.push({id:"SELF",t0:performance.now(),dust:d.h});pushPresence();
  addLine("",0,`${me.name}님이 ${d.n} 마법 가루를 뿌렸어요`,true);dustBtn.disabled=true;setTimeout(()=>dustBtn.disabled=false,4000)});
const emoBtn=$("#emoBtn"),emotes=$("#emotes");
EMOS.forEach(e=>{const b=document.createElement("button");b.type="button";b.className="emo";b.textContent=e;b.setAttribute("aria-label",e);
  b.addEventListener("click",()=>{if(needName())return;me.emo={e,at:Date.now()};floats.push({id:"SELF",text:e,emoji:true,t0:performance.now(),dx:(Math.random()-.5)*30,ph:Math.random()*6});pushPresence()});emotes.appendChild(b)});
function toggleTray(which){const T2={emo:[emotes,emoBtn],fun:[$("#funTray"),$("#funBtn")],roast:[$("#roastTray"),roastBtn],gift:[$("#giftTray"),$("#funBtn")]};
  const on=new Set();for(const k in T2){const [tr,bt]=T2[k];const show=k===which?tr.hidden:false;tr.hidden=!show;if(show)on.add(bt)}
  for(const k in T2){const bt=T2[k][1];bt.setAttribute("aria-expanded",String(on.has(bt)))}}
emoBtn.addEventListener("click",()=>toggleTray("emo"));
$("#funBtn").addEventListener("click",()=>toggleTray("fun"));
const wishBtn=$("#wishBtn");
wishBtn.addEventListener("click",()=>{const s=starAt(Date.now());if(!s||needName())return;me.wish={s:s.sl,at:Date.now()};
  floats.push({id:"SELF",text:"🌠 소원 빌었어요",t0:performance.now()});wishBtn.hidden=true;pushPresence();setTimeout(()=>offerCard("wish"),900)});
let lastSay=0;
$("#chatForm").addEventListener("submit",e=>{e.preventDefault();if(needName())return;const inp=$("#chatInput");const text=clean(inp.value,80);if(!text)return;
  const now=Date.now();if(now-lastSay<700)return;lastSay=now;me.say={t:text,at:now};bubbles.set("SELF",{text,t0:performance.now()});
  addLine(me.name,me.hue,text);inp.value="";me.typing=false;pushPresence()});


/* ---------- 놀거리: 폭죽 · 이야기 카드 · 제비뽑기 · 눈 ---------- */
const QUESTIONS=["올해 받고 싶은 크리스마스 선물은?","올해 제일 고마웠던 사람은?","올해 나한테 상 하나 준다면 무슨 상?","산타한테 딱 하나만 빌 수 있다면?","기억에 남는 크리스마스 있어?","내년엔 이것만은 꼭!","올해의 나를 한 단어로 하면?","크리스마스에 꼭 먹어야 하는 음식은?","요즘 제일 자주 듣는 노래는?","지금 당장 떠날 수 있다면 어디로?","살면서 먹은 최고의 야식은?","10년 전 나한테 해주고 싶은 말은?","요즘 빠져 있는 거 하나만","무인도에 딱 세 개 가져간다면?","가장 기억에 남는 여행은?","최근에 제일 크게 웃었던 일은?","인생 영화나 드라마 하나 꼽자면?","어릴 때 꿈은 뭐였어?","하루 동안 다른 사람으로 살 수 있다면 누구?","올해 안에 꼭 해보고 싶은 거 하나","제일 좋아하는 계절이랑 그 이유는?","요즘 고민 하나 털어놓기","나만 아는 맛집 하나 풀기","첫 월급으로 뭐 했어?","가장 무서웠던 경험은?","지금 이 자리에 있는 사람 첫인상 하나","돈 걱정 없으면 뭐 하면서 살래?","최근에 산 것 중 제일 잘 산 거","잠 안 올 때 뭐 해?","내 인생 노래방 18번은?","지금까지 받은 최고의 선물은?","다시 태어나면 뭐로 태어나고 싶어?","요즘 나를 웃게 하는 작은 것","제일 오래된 친구 이야기 하나","자기 전에 꼭 하는 습관은?","한 가지 초능력을 가질 수 있다면?","올해 나에게 점수를 준다면 몇 점?","혼자 있을 때 제일 좋아하는 시간은?","살면서 제일 잘한 선택은?","요즘 제일 듣고 싶은 말은?","라면 끓일 때 나만의 비법은?","가장 최근에 운 건 언제?","10년 뒤 오늘 나는 뭐 하고 있을까?","무조건 추천하는 유튜브 채널 하나","내 MBTI 맞는 것 같아, 아닌 것 같아?","밸런스 게임: 평생 여름 vs 평생 겨울","밸런스 게임: 과거로 가기 vs 미래 보기","밸런스 게임: 평생 라면 금지 vs 평생 치킨 금지"];
const fireworks=[],sparksFw=[],snowflakes=[],gifts=[];let snowUntil=0;
function sendGiftAnim(fromId,toKey,item){gifts.push({from:fromId,to:toKey,item,t0:performance.now()})}
function drawGifts(list,t){const byId=new Map(list.map(st=>[st.p.id,st])),byKey=new Map(list.map(st=>[st.p.key,st]));
  for(let i=gifts.length-1;i>=0;i--){const g=gifts[i];const a=byId.get(g.from),b=byKey.get(g.to);const u=(t-g.t0)/1100;
    if(!a||!b){gifts.splice(i,1);continue}
    if(u>=1){gifts.splice(i,1);floats.push({id:b.p.id,text:"🎁 "+g.item,t0:t});continue}
    const x=lerp(a.x,b.x,u),y=lerp(a.y-50*a.s,b.y-50*b.s,u)-Math.sin(u*Math.PI)*120*K;
    ctx.font=`${Math.round(26*K)}px sans-serif`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("🎁",x,y)}}
function launchFirework(x,h){fireworks.push({x,h,t0:performance.now()});crackle()}
function drawFireworks(t,dt){
  ctx.save();ctx.globalCompositeOperation="lighter";
  for(let i=fireworks.length-1;i>=0;i--){const f=fireworks[i];const u=(t-f.t0)/900;const x=W*(.15+.7*f.x),y0=HY()+20,y1=H*(.1+.12*rnd(f.x*7));
    if(u>=1){fireworks.splice(i,1);const n=reduce?30:80;for(let k=0;k<n;k++){const a=k/n*6.283+Math.random()*.1,v=(90+Math.random()*120)*K;
      sparksFw.push({x,y:y1,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1.4+Math.random()*.6,age:0,h:f.h+(Math.random()*30-15)})}continue}
    const y=lerp(y0,y1,1-Math.pow(1-u,2));ctx.fillStyle=`hsla(${f.h},90%,80%,.9)`;ctx.beginPath();ctx.arc(x,y,2.2,0,6.283);ctx.fill()}
  for(let i=sparksFw.length-1;i>=0;i--){const p=sparksFw[i];p.age+=dt;if(p.age>=p.life){sparksFw.splice(i,1);continue}
    p.vy+=60*dt;p.vx*=1-dt*.9;p.vy*=1-dt*.9;p.x+=p.vx*dt;p.y+=p.vy*dt;ctx.globalAlpha=clamp(1-p.age/p.life,0,1);
    ctx.fillStyle=`hsl(${p.h} 95% 68%)`;ctx.beginPath();ctx.arc(p.x,p.y,1.8,0,6.283);ctx.fill()}
  ctx.restore();ctx.globalAlpha=1}
function drawSnow(t,dt){const now=Date.now();
  const heavy=now<snowUntil,amb=XMAS&&!reduce?(W<640?28:50):0;if((heavy&&snowflakes.length<(reduce?60:160))||(!heavy&&snowflakes.length<amb&&Math.random()<.3))snowflakes.push({x:Math.random()*W,y:-10,vy:(25+Math.random()*35),r:1+Math.random()*2.2,ph:Math.random()*6});
  ctx.fillStyle="rgba(255,255,255,.85)";
  for(let i=snowflakes.length-1;i>=0;i--){const f=snowflakes[i];f.y+=f.vy*dt;f.x+=Math.sin(t/900+f.ph)*12*dt;
    if(f.y>H+10){if(heavy||snowflakes.length<=amb){f.y=-10;f.x=Math.random()*W}else{snowflakes.splice(i,1);continue}}
    ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,6.283);ctx.fill()}}
let qTimer=null;
function showCard(i,by){if(!(i>=0&&i<QUESTIONS.length))return;$("#qwho").textContent=`💬 ${by}님이 꺼낸 이야기`;$("#qtext").textContent=QUESTIONS[i];
  $("#qcard").hidden=false;clearTimeout(qTimer);qTimer=setTimeout(()=>$("#qcard").hidden=true,20000)}
$("#qclose").addEventListener("click",()=>{$("#qcard").hidden=true});
let bannerTimer=null;
function showPick(name,by){const el=$("#banner");const names=people().map(p=>p.name);if(!names.length)names.push(name);
  let k=0;clearInterval(bannerTimer);el.classList.add("on");const start=performance.now();
  bannerTimer=setInterval(()=>{if(performance.now()-start>1600){clearInterval(bannerTimer);el.textContent=`🎯 ${name}님 당첨!`;
      setTimeout(()=>el.classList.remove("on"),2600);return}el.textContent=names[k++%names.length]},90);
  addLine("",0,`${by}님의 제비뽑기: ${name}님 당첨!`,true)}
$("#fwBtn").addEventListener("click",()=>{if(needName())return;const x=Math.random(),h=Math.floor(Math.random()*360);me.fw={x,h,at:Date.now()};launchFirework(x,h);pushPresence()});
$("#cardBtn").addEventListener("click",()=>{if(needName())return;const i=Math.floor(Math.random()*QUESTIONS.length);me.card={i,at:Date.now()};showCard(i,me.name);addLine("",0,`${me.name}님이 이야기 카드를 꺼냈어요`,true);pushPresence()});
$("#pickBtn").addEventListener("click",()=>{if(needName())return;const ps=people();const pk=ps[Math.floor(Math.random()*ps.length)];if(!pk)return;
  me.pick={name:pk.name,at:Date.now()};showPick(pk.name,me.name);pushPresence();toggleTray("none")});
$("#snowBtn").addEventListener("click",()=>{if(needName())return;me.snow={at:Date.now()};snowUntil=Date.now()+40000;addLine("",0,`${me.name}님이 눈을 내렸어요`,true);pushPresence()});

const burnBox=$("#burnBox");
$("#burnBtn").addEventListener("click",()=>{if(needName())return;toggleTray("none");$("#burnText").value="";burnBox.hidden=false;setTimeout(()=>$("#burnText").focus(),50)});
$("#burnCancel").addEventListener("click",()=>{burnBox.hidden=true});
$("#burnForm").addEventListener("submit",e=>{e.preventDefault();if(!$("#burnText").value.trim())return;$("#burnText").value="";burnBox.hidden=true;
  me.burn={at:Date.now()};flying.push({id:"SELF",t0:performance.now(),paper:true});floats.push({id:"SELF",text:"훨훨 날려 보냈어요",t0:performance.now()+700});
  addLine("",0,`${me.name}님이 고민 하나를 불에 태웠어요`,true);pushPresence();setTimeout(()=>offerCard("burn"),1400)});
$("#diceBtn").addEventListener("click",()=>{if(needName())return;const v=1+Math.floor(Math.random()*6);me.dice={v,at:Date.now()};
  floats.push({id:"SELF",text:"🎲 "+v,t0:performance.now()});addLine("",0,`${me.name}님 주사위: ${v}`,true);pushPresence()});

const giftTray=$("#giftTray");
function escHTML(t){return String(t).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function giftPeople(){giftTray.textContent="";const others=people().filter(p=>!p.isMe);
  const lb=document.createElement("div");lb.className="tlabel";lb.textContent=others.length?"누구한테 줄까요?":"선물 줄 사람이 아직 없어요";giftTray.appendChild(lb);
  for(const p of others){const b=document.createElement("button");b.type="button";b.className="chip";b.innerHTML=feTag(AVATARS[p.av||0])+" "+escHTML(p.name);
    b.addEventListener("click",()=>giftItems(p));giftTray.appendChild(b)}}
function giftItems(to){giftTray.textContent="";const lb=document.createElement("div");lb.className="tlabel";lb.textContent=`${to.name}님한테 뭘 줄까요?`;giftTray.appendChild(lb);
  GIFTS.forEach((item,i)=>{const b=document.createElement("button");b.type="button";b.className="chip";b.textContent=item;
    b.addEventListener("click",()=>{me.gift={to:to.key,name:to.name,i,at:Date.now()};sendGiftAnim("SELF",to.key,item);addLine("",0,`${me.name}님이 ${to.name}님에게 선물을 줬어요: ${item}`,true);toggleTray("none");pushPresence()});giftTray.appendChild(b)});
  const back=document.createElement("button");back.type="button";back.className="chip";back.textContent="← 다른 사람";back.addEventListener("click",giftPeople);giftTray.appendChild(back)}
$("#giftBtn").addEventListener("click",()=>{if(needName())return;giftPeople();toggleTray("gift")});

/* ---------- 모바일 메뉴 ---------- */
const menuBtn=$("#menuBtn"),scrim=$("#scrim");
function setMenu(open){document.body.classList.toggle("menu-open",open);scrim.hidden=!open;menuBtn.setAttribute("aria-expanded",String(open))}
menuBtn.addEventListener("click",()=>setMenu(!document.body.classList.contains("menu-open")));
scrim.addEventListener("click",()=>setMenu(false));
$("#chips").addEventListener("click",e=>{if(e.target.closest(".chip")&&innerWidth<640&&e.target.id!=="soundBtn")setMenu(false)});

/* ---------- 타이핑 표시 · 자리 비움 · 기념사진 · 단축키 ---------- */
const chatInput=$("#chatInput");let typingTimer=null;
function setTyping(v){if(me.typing===v)return;me.typing=v;pushPresence()}
chatInput.addEventListener("input",()=>{setTyping(chatInput.value.trim().length>0);clearTimeout(typingTimer);typingTimer=setTimeout(()=>setTyping(false),5000)});
chatInput.addEventListener("blur",()=>setTyping(false));
let lastAct=Date.now(),hideTimer=null;
function setAway(v){if(me.away===v)return;me.away=v;pushPresence()}
["pointerdown","keydown","pointermove"].forEach(ev=>addEventListener(ev,()=>{lastAct=Date.now();if(me.away&&!document.hidden)setAway(false)},{passive:true}));
document.addEventListener("visibilitychange",()=>{clearTimeout(hideTimer);if(document.hidden)hideTimer=setTimeout(()=>setAway(true),30000);else{lastAct=Date.now();setAway(false)}});
setInterval(()=>{if(!me.away&&Date.now()-lastAct>5*60e3)setAway(true)},15000);
addEventListener("keydown",e=>{if(e.key==="Enter"&&sit.hidden&&lobby.hidden&&$("#pwBox").hidden&&burnBox.hidden&&!(e.target instanceof HTMLInputElement)&&!(e.target instanceof HTMLButtonElement)){e.preventDefault();chatInput.focus()}});
const photoBtn=$("#photoBtn");
photoBtn.addEventListener("click",async()=>{
  const c=document.createElement("canvas");c.width=canvas.width;c.height=canvas.height;const g=c.getContext("2d");g.drawImage(canvas,0,0);
  const d=new Date(),p2=n=>String(n).padStart(2,"0");const day=`${d.getFullYear()}.${p2(d.getMonth()+1)}.${p2(d.getDate())}`;
  g.font=`700 ${Math.round(22*DPR)}px "Gowun Batang", serif`;g.fillStyle="rgba(255,236,200,.85)";g.textAlign="right";g.textBaseline="bottom";
  g.fillText(day+(XMAS?" 🎄 모닥불":" 모닥불"),c.width-24*DPR,c.height-46*DPR);
  g.font=`500 ${Math.round(14*DPR)}px "Pretendard Variable", Pretendard, sans-serif`;g.fillStyle="rgba(255,236,200,.7)";g.fillText(location.host,c.width-24*DPR,c.height-24*DPR);
  const fl=document.createElement("div");fl.style.cssText="position:fixed;inset:0;background:#fff;opacity:.8;pointer-events:none;transition:opacity .6s";
  document.body.appendChild(fl);requestAnimationFrame(()=>{fl.style.opacity="0";setTimeout(()=>fl.remove(),700)});
  const blob=await new Promise(r=>c.toBlob(r,"image/png"));if(!blob)return;
  await deliverPhoto(blob,`모닥불_${day.replace(/\./g,"")}_${p2(d.getHours())}${p2(d.getMinutes())}.png`)});
let cardKind=null,cardTimer=null;const shareCardBtn=$("#shareCardBtn");
function offerCard(kind){cardKind=kind;shareCardBtn.hidden=false;clearTimeout(cardTimer);cardTimer=setTimeout(()=>{shareCardBtn.hidden=true},9000)}
shareCardBtn.addEventListener("click",async()=>{shareCardBtn.hidden=true;const k=cardKind;
  const Wc=1080,Hc=1350;const c=document.createElement("canvas");c.width=Wc;c.height=Hc;const g=c.getContext("2d");
  g.fillStyle="#0b141c";g.fillRect(0,0,Wc,Hc);const sc=Math.max(Wc/canvas.width,Hc/canvas.height);const sw2=canvas.width*sc,sh2=canvas.height*sc;
  g.globalAlpha=.85;g.drawImage(canvas,(Wc-sw2)/2,(Hc-sh2)/2,sw2,sh2);g.globalAlpha=1;
  const gr=g.createLinearGradient(0,Hc*.45,0,Hc);gr.addColorStop(0,"rgba(5,8,12,0)");gr.addColorStop(1,"rgba(5,8,12,.88)");g.fillStyle=gr;g.fillRect(0,0,Wc,Hc);
  const yr=new Date().getFullYear();const title=k==="burn"?`${yr}년의 고민 하나,\n모닥불에 태웠어요`:`별똥별에\n소원을 빌었어요`;const em=k==="burn"?"📜🔥":"🌠";
  g.textAlign="center";g.fillStyle="#fff2dc";g.font='120px sans-serif';g.fillText(em,Wc/2,Hc*.66);
  g.font='700 76px "Gowun Batang", serif';title.split("\n").forEach((l,i)=>g.fillText(l,Wc/2,Hc*.76+i*96));
  g.font='500 34px "Pretendard Variable", Pretendard, sans-serif';g.fillStyle="rgba(255,236,200,.75)";g.fillText((XMAS?"🎄 ":"")+"모닥불 · "+location.host,Wc/2,Hc*.95);
  const blob=await new Promise(r=>c.toBlob(r,"image/png"));if(blob)await deliverPhoto(blob,`모닥불_${k}_${Date.now()}.png`)});
async function deliverPhoto(blob,filename){
  const file=new File([blob],filename,{type:"image/png"});
  if(/Android|iPhone|iPad/i.test(navigator.userAgent)&&navigator.canShare&&navigator.canShare({files:[file]})){
    try{await navigator.share({files:[file],title:"모닥불"});return}catch(e){if(e&&e.name==="AbortError")return}}
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);toast("사진을 저장했어요")}

/* ---------- 대화창: 평소엔 아래에 붙어 있고, 원하면 떼어서 옮기기 · 글씨 크기 ---------- */
const cp=$("#chatPanel"),cpHead=$("#cpHead"),dockEl=document.querySelector(".dock");
let cpState=(()=>{try{return JSON.parse(store.get("fire.chat2")||"null")}catch(e){return null}})()||{};
if(!(cpState.fs>=12&&cpState.fs<=24))cpState.fs=innerWidth<640?14:15;
function cpSave(){store.set("fire.chat2",JSON.stringify(cpState))}
function cpApply(){logEl.style.fontSize=cpState.fs+"px";
  if(cpState.float){if(cp.parentNode!==document.body)document.body.appendChild(cp);cp.classList.add("float");
    const w=cp.offsetWidth||360,h=cp.offsetHeight||180;
    if(cpState.w&&innerWidth>=640)cp.style.width=Math.min(cpState.w,innerWidth-20)+"px";else cp.style.width="";
    if(cpState.h)cp.style.height=Math.min(cpState.h,innerHeight*.7)+"px";else cp.style.height=(innerWidth<640?170:220)+"px";
    const x=cpState.x==null?(innerWidth-(cp.offsetWidth||w))/2:cpState.x,y=cpState.y==null?110:cpState.y;
    cp.style.left=clamp(x,8,innerWidth-(cp.offsetWidth||w)-8)+"px";cp.style.top=clamp(y,50,innerHeight-80)+"px";$("#cpMove").textContent="제자리로"}
  else{if(cp.parentNode!==dockEl)dockEl.insertBefore(cp,dockEl.firstChild);cp.classList.remove("float");cp.style.cssText="";$("#cpMove").textContent="옮기기"}
  logEl.scrollTop=logEl.scrollHeight}
$("#cpBigger").addEventListener("click",()=>{cpState.fs=Math.min(24,cpState.fs+2);cpApply();cpSave()});
$("#cpSmaller").addEventListener("click",()=>{cpState.fs=Math.max(12,cpState.fs-2);cpApply();cpSave()});
$("#cpMove").addEventListener("click",()=>{cpState.float=!cpState.float;if(cpState.float){cpState.x=null;cpState.y=null}cpApply();cpSave();
  if(cpState.float)toast("위쪽 막대를 잡고 원하는 곳으로 옮기세요")});
let drag=null;
cpHead.addEventListener("pointerdown",e=>{if(!cpState.float||e.target.closest("button"))return;const r=cp.getBoundingClientRect();drag={dx:e.clientX-r.left,dy:e.clientY-r.top};cpHead.setPointerCapture(e.pointerId)});
cpHead.addEventListener("pointermove",e=>{if(!drag)return;const r=cp.getBoundingClientRect();
  cp.style.left=clamp(e.clientX-drag.dx,8,innerWidth-r.width-8)+"px";cp.style.top=clamp(e.clientY-drag.dy,50,innerHeight-60)+"px"});
cpHead.addEventListener("pointerup",()=>{if(!drag)return;const r=cp.getBoundingClientRect();cpState.x=r.left;cpState.y=r.top;cpSave();drag=null});
if(window.ResizeObserver){let rt=null;new ResizeObserver(()=>{if(!cpState.float||innerWidth<640)return;clearTimeout(rt);rt=setTimeout(()=>{const r=cp.getBoundingClientRect();cpState.w=r.width;cpState.h=r.height;cpSave()},300)}).observe(cp)}
addEventListener("resize",()=>setTimeout(cpApply,50));
cpApply();

/* ---------- room ---------- */
function onPeers(ch){const t=performance.now();const early=t-loadedAt<3000;
  for(const p of ch.peers)if(p.sameTab)myPeer=p.peer;
  for(const p of [...ch.joined,...ch.updated]){
    if(p.sameTab||p.kind!=="viewer")continue;const pr=p.presence||{};const name=clean(pr.name);const hue=HUES.includes(pr.hue)?pr.hue:30;
    const logs=Array.isArray(pr.logs)?pr.logs.filter(Number.isFinite):[];const lastLog=logs.length?Math.max(...logs):0;
    const roast=Number.isFinite(pr.roast)?pr.roast:null;
    const sayAt=pr.say&&Number.isFinite(pr.say.at)?pr.say.at:0,emoAt=pr.emo&&Number.isFinite(pr.emo.at)?pr.emo.at:0,
      dustAt=pr.dust&&Number.isFinite(pr.dust.at)?pr.dust.at:0,wishAt=pr.wish&&Number.isFinite(pr.wish.at)?pr.wish.at:0;
    const at=o=>o&&typeof o==="object"&&Number.isFinite(o.at)?o.at:0;const giftAt=at(pr.gift),fwAt=at(pr.fw),cardAt=at(pr.card),pickAt=at(pr.pick),snowAt=at(pr.snow),burnAt=at(pr.burn),diceAt=at(pr.dice);const rk=foodOf(pr.rk);
    const prev=known.get(p.peer);const fresh=v=>v&&Math.abs(Date.now()-v)<15000;
    if(prev&&prev.name&&name){
      if(lastLog&&lastLog!==prev.lastLog&&fresh(lastLog))flying.push({id:p.peer,t0:t});
      if(prev.roast!=null&&roast==null)floats.push({id:p.peer,text:FOODS[prev.rk||"m"].e+" "+verdict(prev.rk,(Date.now()-prev.roast)/1000),t0:t});
      if(giftAt&&giftAt!==prev.giftAt&&fresh(giftAt)&&typeof pr.gift.to==="string"&&GIFTS[pr.gift.i]){const item=GIFTS[pr.gift.i];const toKey=pr.gift.to;
        const mine=myPeer&&toKey===myPeer;const tn=mine?me.name:clean(pr.gift.name);sendGiftAnim(p.peer,toKey,item);
        addLine("",0,`${name}님이 ${tn}님에게 선물을 줬어요: ${item}`,true);if(mine)toast(`🎁 ${name}님이 ${item}을(를) 줬어요!`)}
      if(burnAt&&burnAt!==prev.burnAt&&fresh(burnAt)){flying.push({id:p.peer,t0:t,paper:true});addLine("",0,`${name}님이 고민 하나를 불에 태웠어요`,true)}
      if(diceAt&&diceAt!==prev.diceAt&&fresh(diceAt)&&Number.isInteger(pr.dice.v)&&pr.dice.v>=1&&pr.dice.v<=6){floats.push({id:p.peer,text:"🎲 "+pr.dice.v,t0:t});addLine("",0,`${name}님 주사위: ${pr.dice.v}`,true)}
      if(sayAt&&sayAt!==prev.sayAt&&fresh(sayAt)){const text=clean(pr.say.t,80);if(text){bubbles.set(p.peer,{text,t0:t});addLine(name,hue,text)}}
      if(emoAt&&emoAt!==prev.emoAt&&fresh(emoAt)&&EMOS.includes(pr.emo.e))floats.push({id:p.peer,text:pr.emo.e,emoji:true,t0:t,dx:(Math.random()-.5)*30,ph:Math.random()*6});
      if(dustAt&&dustAt!==prev.dustAt&&fresh(dustAt)){const d=DUST.find(x=>x.h===pr.dust.h);if(d){flying.push({id:p.peer,t0:t,dust:d.h});addLine("",0,`${name}님이 ${d.n} 마법 가루를 뿌렸어요`,true)}}
      if(wishAt&&wishAt!==prev.wishAt&&fresh(wishAt)){floats.push({id:p.peer,text:"🌠 소원 빌었어요",t0:t});addLine("",0,`${name}님이 별똥별에 소원을 빌었어요`,true)}
      if(fwAt&&fwAt!==prev.fwAt&&fresh(fwAt)&&Number.isFinite(pr.fw.x)&&Number.isFinite(pr.fw.h))launchFirework(clamp(pr.fw.x,0,1),pr.fw.h%360);
      if(cardAt&&cardAt!==prev.cardAt&&fresh(cardAt)&&Number.isInteger(pr.card.i)){showCard(pr.card.i,name);addLine("",0,`${name}님이 이야기 카드를 꺼냈어요`,true)}
      if(pickAt&&pickAt!==prev.pickAt&&fresh(pickAt)){const pn=clean(pr.pick.name);if(pn)showPick(pn,name)}
      if(snowAt&&snowAt!==prev.snowAt&&fresh(snowAt)){snowUntil=Math.max(snowUntil,Date.now()+40000);addLine("",0,`${name}님이 눈을 내렸어요`,true)}
    }else if(name&&(!prev||!prev.name)&&!early){toast(`${name}님이 불 앞에 앉았어요`);addLine("",0,`${name}님이 불 앞에 앉았어요`,true)}
    known.set(p.peer,{giftAt,lastLog,roast,rk,name,sayAt,emoAt,dustAt,wishAt,fwAt,cardAt,pickAt,snowAt,burnAt,diceAt})}
  for(const p of ch.left){const k=known.get(p.peer);if(k&&k.name){toast(`${k.name}님이 자리를 떴어요`);addLine("",0,`${k.name}님이 자리를 떴어요`,true)}known.delete(p.peer);bubbles.delete(p.peer)}
  updateWho()}
function goSolo(){room=null;solo=true;updateWho()}

/* ---------- 실시간 연결 (Firebase Realtime Database 중계) ---------- */
const FB_CFG={apiKey:"AIzaSyAs3aqh2N75_c24xdjDNf271L16-VYCmls",authDomain:"lomxx-calculator.firebaseapp.com",
  databaseURL:"https://lomxx-calculator-default-rtdb.asia-southeast1.firebasedatabase.app",projectId:"lomxx-calculator"};
let fdb=null;try{fdb=firebase.initializeApp(FB_CFG,"campfire").database()}catch(e){console.error(e)}
const ROOT="campfire";const MY_ID="u"+Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);
const STALE=90000;
let fbOnline=true;
function makeRoom(roomKey){
  const base=fdb.ref(`${ROOT}/rooms/${roomKey}`),pref=base.child("p"),myRef=pref.child(MY_ID);
  const map=new Map();const subs=[];let mine={},timer=null,snap,live=true;
  const self={peer:MY_ID,isMe:true,sameTab:true,kind:"viewer",presence:mine};
  const rebuild=()=>{const now=Date.now();snap=Object.freeze([self,...[...map.values()].filter(p=>now-(p.presence.ts||0)<STALE)])};rebuild();
  const fire=ch=>{rebuild();const c={peers:snap,joined:ch.joined||[],left:ch.left||[],updated:ch.updated||[]};subs.forEach(f=>{try{f(c)}catch(e){console.error(e)}})};
  const mk=(id,v)=>({peer:id,isMe:false,sameTab:false,kind:"viewer",presence:(v&&typeof v==="object"&&!Array.isArray(v))?v:{}});
  const ok=v=>{try{return JSON.stringify(v).length<=4096}catch(e){return false}};
  const onAdd=sn=>{if(sn.key===MY_ID||!ok(sn.val()))return;const p=mk(sn.key,sn.val());map.set(sn.key,p);fire({joined:[p]})};
  const onChg=sn=>{if(sn.key===MY_ID||!ok(sn.val()))return;const isNew=!map.has(sn.key);const p=mk(sn.key,sn.val());map.set(sn.key,p);fire(isNew?{joined:[p]}:{updated:[p]})};
  const onRem=sn=>{const p=map.get(sn.key);if(!p)return;map.delete(sn.key);fire({left:[p]})};
  pref.on("child_added",onAdd);pref.on("child_changed",onChg);pref.on("child_removed",onRem);
  const write=()=>{if(!live)return;mine={...mine,ts:Date.now()};self.presence=mine;myRef.onDisconnect().remove();myRef.set(mine).catch(()=>{})};
  const iv=setInterval(()=>{if(Object.keys(mine).length)write();
    const now=Date.now();for(const [k,p] of map)if(now-(p.presence.ts||0)>STALE){map.delete(k);fire({left:[p]})}},30000);
  const actions=[];
  return {raw:{makeAction(name){const r=base.child("a_"+name);let cb=null;const h=sn=>{const v=sn.val();if(v&&cb)cb(v,{peerId:""})};r.on("value",h);actions.push([r,h]);
      return {send(d){r.set(d).catch(()=>{})},set onMessage(f){cb=f}}}},
    rewrite:write,
    leave(){live=false;clearInterval(iv);subs.length=0;pref.off("child_added",onAdd);pref.off("child_changed",onChg);pref.off("child_removed",onRem);
      actions.forEach(([r,h])=>r.off("value",h));myRef.onDisconnect().cancel();myRef.remove().catch(()=>{})},
    onJoin(){},peers:()=>{rebuild();return snap},
    presence(patch){const n={...mine};for(const k in patch){if(patch[k]===null||patch[k]===undefined)delete n[k];else n[k]=patch[k]}
      mine=n;self.presence=n;clearTimeout(timer);timer=setTimeout(write,60);return Promise.resolve()},
    onPeers(fn){subs.push(fn);setTimeout(()=>fn({peers:snap,joined:snap.slice(),left:[],updated:[]}),0);return()=>{}}};
}
async function roomKeyOf(id,pw){if(!pw)return id;const buf=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(id+"|"+pw));
  return "k"+[...new Uint8Array(buf)].slice(0,16).map(b=>b.toString(16).padStart(2,"0")).join("")}
/* ---------- 방 목록 · 만들기 · 들어가기 · 비밀번호 · 퇴장 ---------- */
const lobby=$("#lobby"),roomTitleEl=$("#roomTitle"),pwBox=$("#pwBox");
let roomId="",roomName="",roomPw="",roomHidden=false,lastRoom=null,pending=null;
const cleanId=v=>String(v||"").replace(/[^a-zA-Z0-9-]/g,"").slice(0,40);
function roomUrl(){const q=new URLSearchParams();q.set("room",roomId);if(roomName)q.set("name",roomName);if(roomPw)q.set("lock","1");if(roomHidden)q.set("hidden","1");return location.pathname+"?"+q.toString()}
function showLobby(left){document.body.classList.add("in-lobby");lobby.hidden=false;sit.hidden=true;pwBox.hidden=true;setMenu(false);
  $("#rejoin").hidden=!left;if(left)$("#rejoinText").textContent=`${left.name?"“"+left.name+"” ":""}불 앞에서 일어났어요.`;renderRooms()}

/* 방 목록: 각 방에 있는 사람이 lobby/{방코드}/{내ID} 에 표시를 남기고, 나가면 자동으로 지워짐 */
const ads=new Map();const lobbyStart=Date.now();let lobbyRef=null;
function announce(){if(!fdb||!room||!roomId||roomHidden)return;lobbyRef=fdb.ref(`${ROOT}/lobby/${roomId}/${MY_ID}`);
  lobbyRef.onDisconnect().remove();lobbyRef.set({name:roomName,lock:!!roomPw,ts:Date.now()}).catch(()=>{})}
function unannounce(){if(lobbyRef){lobbyRef.onDisconnect().cancel();lobbyRef.remove().catch(()=>{});lobbyRef=null}}
setInterval(()=>{if(lobbyRef)announce()},30000);
function initLobby(){if(!fdb)return;
  fdb.ref(`${ROOT}/lobby`).on("value",sn=>{ads.clear();const now=Date.now();
    sn.forEach(r=>{const id=cleanId(r.key);if(!id)return;let n=0,name="",lock=false;
      r.forEach(u=>{const v=u.val()||{};if(now-(v.ts||0)>STALE)return;n++;if(!name&&typeof v.name==="string")name=clean(v.name,20);if(v.lock===true)lock=true});
      if(n)ads.set(id,{id,name,n:Math.min(n,99),lock,seen:Infinity})});renderRooms()});
  fdb.ref(".info/connected").on("value",sn=>{const on=sn.val()===true;
    if(on&&!fbOnline){if(room)room.rewrite();if(lobbyRef)announce()}fbOnline=on;
    if(!on&&room)setTimeout(()=>{if(!fbOnline)toast("연결이 잠깐 끊겼어요. 다시 연결하는 중…")},4000)});
  setInterval(renderRooms,10000)}
const PAGE=8;let shown=PAGE;
function renderRooms(){if(lobby.hidden)return;const now=Date.now();for(const [k,e] of ads)if(now-e.seen>25000)ads.delete(k);
  const q=$("#roomSearch").value.trim().toLowerCase();const list=[...ads.values()].filter(e=>!q||e.name.toLowerCase().includes(q)||e.id.toLowerCase().includes(q)).sort((a,b)=>b.n-a.n);
  const box=$("#rlist");box.textContent="";$("#roomCount").textContent=ads.size?`${ads.size}개`:"";
  if(!list.length){const p=document.createElement("p");p.className="rempty";
    p.textContent=q?"찾는 방이 없어요.":now-lobbyStart<5000?"방을 찾는 중이에요…":"지금 열린 방이 없어요. 새 방을 만들어 보세요.";box.appendChild(p);return}
  for(const e of list.slice(0,shown)){const b=document.createElement("button");b.type="button";b.className="ritem";
    const nm=document.createElement("span");nm.className="nm";nm.textContent=(e.lock?"🔒 ":"🔥 ")+(e.name||"이름 없는 방");
    const meta=document.createElement("span");meta.className="meta";meta.textContent=`${e.n}명`;
    b.append(nm,meta);b.addEventListener("click",()=>enterRoom(e.id,e.name,{lock:e.lock}));box.appendChild(b)}
  if(list.length>shown){const m=document.createElement("button");m.type="button";m.className="btn more";m.textContent=`더 보기 (${list.length-shown}개 더)`;
    m.addEventListener("click",()=>{shown+=PAGE;renderRooms()});box.appendChild(m)}}
$("#roomSearch").addEventListener("input",()=>{shown=PAGE;renderRooms()});

function askPw(id,name,opts){pending={id,name,opts};$("#pwText").textContent=`${name?"“"+name+"” ":"이 "}방은 비밀번호가 있어요.`;
  $("#pwInput").value="";pwBox.hidden=false;lobby.hidden=true;setTimeout(()=>$("#pwInput").focus(),50)}
$("#pwForm").addEventListener("submit",e=>{e.preventDefault();const pw=$("#pwInput").value;if(!pw||!pending)return;const p=pending;pending=null;pwBox.hidden=true;
  enterRoom(p.id,p.name,{...p.opts,pw})});
$("#pwCancel").addEventListener("click",()=>{pending=null;pwBox.hidden=true;history.replaceState(null,"",location.pathname);showLobby(lastRoom)});

let pwCheck=null;
async function enterRoom(id,name,opts={}){
  id=cleanId(id);if(!id)return;
  if(opts.lock&&!opts.pw){askPw(id,clean(name,20),opts);return}
  roomId=id;roomName=clean(name,20);roomPw=opts.pw||"";roomHidden=!!opts.hidden;
  history.replaceState(null,"",roomUrl());roomTitleEl.textContent=(roomPw?"🔒 ":"")+roomName;
  document.body.classList.remove("in-lobby");lobby.hidden=true;pwBox.hidden=true;solo=false;loadedAt=performance.now();enteredAt=Date.now();
  if(!me.name)openSit();updateWho();
  try{if(!fdb)throw new Error("no firebase");const key=await roomKeyOf(roomId,roomPw);
    room=makeRoom(key);room.onPeers(onPeers);
    musicAction=room.raw.makeAction("music");musicAction.onMessage=d=>{if(d&&Number.isFinite(d.anchor)&&Number.isFinite(d.at))setAnchor(d.anchor,d.at)};
    pushPresence();updateWho();announce();
    clearTimeout(pwCheck);if(roomPw)pwCheck=setTimeout(()=>{const e=ads.get(roomId);if(room&&e&&e.n>=1&&people().length<=1)toast("비밀번호가 틀린 것 같아요. 다시 확인해 주세요")},7000);
  }catch(e){console.error(e);goSolo()}
}
function leaveRoom(){
  clearTimeout(pwCheck);unannounce();
  if(room){room.leave();room=null}
  lastRoom={id:roomId,name:roomName,lock:!!roomPw,hidden:roomHidden};musicAction=null;
  known.clear();bubbles.clear();flying.length=0;floats.length=0;gifts.length=0;myPeer=null;snowUntil=0;$("#qcard").hidden=true;
  if(me.roast!=null){me.roast=null;setRoastLabel()}
  if(listening){listening=false;music.pause();curSrc="";refreshMusicUI()}
  enteredAt=0;logEl.textContent="";roomTitleEl.textContent="";roomId="";roomName="";roomPw="";roomHidden=false;toggleTray("none");
  $("#joinInput").value="";history.replaceState(null,"",location.pathname);showLobby(lastRoom);
}
$("#leaveBtn").addEventListener("click",leaveRoom);
const PLAZA_MAX=8;
$("#plazaBtn").addEventListener("click",async()=>{const b=$("#plazaBtn");b.disabled=true;b.textContent="빈자리 찾는 중…";
  const wait=4500-(Date.now()-lobbyStart);if(wait>0)await new Promise(r=>setTimeout(r,wait));
  const taken=new Map();for(const e of ads.values()){const m=/^plaza-(\d+)$/.exec(e.id);if(m)taken.set(+m[1],e.n)}
  let i=1;while(i<200&&(taken.get(i)||0)>=PLAZA_MAX)i++;
  b.disabled=false;b.textContent=(XMAS?"🎄 ":"🔥 ")+"광장 모닥불 바로 앉기";enterRoom("plaza-"+i,"광장 모닥불 "+i)});
$("#rejoinBtn").addEventListener("click",()=>{if(lastRoom)enterRoom(lastRoom.id,lastRoom.name,{lock:lastRoom.lock,hidden:lastRoom.hidden})});
$("#openCreate").addEventListener("click",()=>{const f=$("#createForm");f.hidden=!f.hidden;$("#openCreate").hidden=!f.hidden;if(!f.hidden)$("#roomNameInput").focus()});
$("#createBtn").addEventListener("click",()=>{const pw=$("#roomPwInput").value;
  enterRoom("fire-"+Math.random().toString(36).slice(2,8),$("#roomNameInput").value,{pw,hidden:$("#hiddenCheck").checked});
  $("#roomPwInput").value="";$("#createForm").hidden=true;$("#openCreate").hidden=false});
$("#joinForm").addEventListener("submit",e=>{e.preventDefault();const v=$("#joinInput").value.trim();if(!v)return;
  let id=v,name="",lock=false,hidden=false;try{const u=new URL(v);id=u.searchParams.get("room")||"";name=u.searchParams.get("name")||"";lock=u.searchParams.get("lock")==="1";hidden=u.searchParams.get("hidden")==="1"}catch(err){}
  id=cleanId(id);if(!id){toast("방 코드를 다시 확인해 주세요");return}const ad=ads.get(id);if(ad&&ad.lock)lock=true;enterRoom(id,name||(ad&&ad.name)||"",{lock,hidden})});
$("#inviteBtn").addEventListener("click",async()=>{const url=location.origin+roomUrl();const msg=roomPw?"링크를 복사했어요. 비밀번호는 따로 알려 주세요":"링크를 복사했어요. 친구한테 보내 주세요";
  if(navigator.share&&/Android|iPhone|iPad/i.test(navigator.userAgent)){try{await navigator.share({title:"모닥불",text:`${me.name||"친구"}님이 모닥불에 초대했어요${roomName?" ("+roomName+")":""}`+(roomPw?" · 비밀번호는 따로 물어보세요":""),url});return}catch(e){if(e&&e.name==="AbortError")return}}
  try{await navigator.clipboard.writeText(url);toast(msg)}catch(e){window.prompt("이 링크를 친구한테 보내 주세요",url)}});
(async()=>{
  resize();requestAnimationFrame(frame);refreshMusicUI();loadTracks();initLobby();
  const params=new URLSearchParams(location.search);const id=cleanId(params.get("room"));
  if(id)enterRoom(id,params.get("name")||"",{lock:params.get("lock")==="1",hidden:params.get("hidden")==="1"});else showLobby(null);
})();
})();
