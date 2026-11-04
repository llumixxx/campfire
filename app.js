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

const HUES=[18,42,140,190,262,330];
const DUST=[{h:130,n:"초록"},{h:200,n:"파랑"},{h:275,n:"보라"},{h:320,n:"분홍"}];
const EMOS=["👏","😂","🔥","❤️","🍻","🙏","😴","👻","🎉"];
const FOODS={m:{e:"🍡",n:"마시멜로",t:[14,34,52],c:[[247,242,232],[232,170,80],[122,68,32],[40,28,22]],v:["아직 하얘요","노릇노릇, 완벽해요","살짝 탔지만 맛있어요","숯이 됐어요"]},
  s:{e:"🌭",n:"소시지",t:[10,28,48],c:[[228,150,150],[200,92,62],[122,52,32],[45,25,20]],v:["아직 덜 익었어요","톡 터지는 육즙!","겉바속촉 완성","탄 소시지…"]},
  g:{e:"🍠",n:"고구마",t:[25,55,85],c:[[160,78,98],[125,58,62],[82,42,36],[35,25,22]],v:["아직 딱딱해요","호호, 잘 익었어요","꿀이 흘러요","겉은 숯, 속은 꿀"]},
  c:{e:"🌽",n:"옥수수",t:[10,28,48],c:[[250,222,96],[240,190,62],[172,112,42],[60,40,25]],v:["아직 생옥수수","톡톡 맛있어요","고소하게 잘 익었어요","새까매졌어요"]}};
const foodOf=k=>FOODS[k]?k:"m";
function verdict(k,sec){const f=FOODS[foodOf(k)];return sec<f.t[0]?f.v[0]:sec<f.t[1]?f.v[1]:sec<f.t[2]?f.v[2]:f.v[3]}
const me={name:clean(store.get("fire.name")),hue:+store.get("fire.hue"),logs:[],roast:null,rk:"m",burn:null,dice:null,say:null,emo:null,dust:null,wish:null,typing:false,away:false,fw:null,card:null,pick:null,snow:null};
if(!HUES.includes(me.hue)){me.hue=HUES[Math.floor(Math.random()*HUES.length)];store.set("fire.hue",me.hue)}

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
  flies=[];for(let i=0;i<(W<640?7:14);i++)flies.push({x:Math.random()*W,y:HY()+Math.random()*H*.22,ph:Math.random()*6.28,sp:.3+Math.random()*.5,r:Math.random()*.5+.5});
}
let flies=[];
function drawFlies(t){ctx.save();ctx.globalCompositeOperation="lighter";
  for(const f of flies){const tt=t/1000*f.sp+f.ph;const x=f.x+Math.sin(tt*1.3)*30,y=f.y+Math.cos(tt)*14;const a=Math.max(0,Math.sin(tt*2.2))*.85;
    if(a<.05)continue;const g=ctx.createRadialGradient(x,y,0,x,y,7);g.addColorStop(0,`rgba(214,255,140,${a})`);g.addColorStop(1,"rgba(214,255,140,0)");ctx.fillStyle=g;ctx.fillRect(x-7,y-7,14,14)}
  ctx.restore()}
if(window.visualViewport){const vv=window.visualViewport;const kb=()=>{const k=Math.max(0,innerHeight-vv.height-vv.offsetTop);document.documentElement.style.setProperty("--kb",(k>40?k:0)+"px")};vv.addEventListener("resize",kb);vv.addEventListener("scroll",kb)}
addEventListener("resize",resize);
const mq=window.matchMedia("(prefers-color-scheme: dark)");if(mq.addEventListener)mq.addEventListener("change",readColors);
const HY=()=>W<640?H*.36:H*.4;
function geom(){if(W<640){const rx=W*.34;return {cx:W/2,cy:H*.5,rx,ry:rx*.5}}const cx=W/2,cy=H*.56,rx=clamp(W*.34,130*K,330*K),ry=rx*.34;return {cx,cy,rx,ry}}

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
function selfPerson(){return {id:"SELF",key:myPeer||"~",name:me.name,hue:me.hue,logs:me.logs,roast:me.roast,rk:me.rk,typing:false,away:me.away,isMe:true}}
function people(){
  const out=[];let haveMe=false;
  if(room){for(const p of room.peers()){
    if(p.kind!=="viewer")continue;
    if(p.sameTab){haveMe=true;if(me.name)out.push(selfPerson());continue}
    const pr=p.presence||{};const name=clean(pr.name);if(!name)continue;
    out.push({id:p.peer,key:p.peer,name,hue:HUES.includes(pr.hue)?pr.hue:30,
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
  ctx.fillStyle=mix(hill,gr,.5);drawTrees(treesNear,hy+H*.005);
  const g=ctx.createLinearGradient(0,hy,0,H);g.addColorStop(0,mix(hill,gr,.5));g.addColorStop(1,colors.ground);ctx.fillStyle=g;ctx.fillRect(0,hy,W,H-hy);
}
function drawTrees(arr,base){ctx.beginPath();
  for(const tr of arr){for(let k=0;k<3;k++){const yy=base-tr.h*k*.28,w=tr.w*(1-k*.22);ctx.moveTo(tr.x-w/2,yy);ctx.lineTo(tr.x,yy-tr.h*.55);ctx.lineTo(tr.x+w/2,yy)}}ctx.fill()}
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
function drawPerson(st,I,t){const {p,x,y,s}=st;const {cx,cy,rx}=geom();
  ctx.globalAlpha=p.away?.55:1;
  const lit=clamp(I*1.15-Math.hypot(x-cx,(y-cy)*2.4)/(rx*2.6),.08,1);
  ctx.fillStyle="rgba(0,0,0,.32)";ctx.beginPath();ctx.ellipse(x+(x-cx)*.06,y+2*s,22*s,5*s,0,0,6.283);ctx.fill();
  ctx.fillStyle=mix([18,24,23],[128,86,56],lit*.8);ctx.beginPath();ctx.moveTo(x-18*s,y);ctx.quadraticCurveTo(x-20*s,y-31*s,x,y-35*s);ctx.quadraticCurveTo(x+20*s,y-31*s,x+18*s,y);ctx.closePath();ctx.fill();
  ctx.fillStyle=mix([22,27,26],[160,112,76],lit*.85);ctx.beginPath();ctx.arc(x,y-43*s,10.5*s,0,6.283);ctx.fill();
  ctx.fillStyle=`hsl(${p.hue} 55% ${18+30*lit}%)`;ctx.beginPath();ctx.arc(x,y-45*s,11*s,Math.PI,0);ctx.lineTo(x+11.5*s,y-43*s);ctx.lineTo(x-11.5*s,y-43*s);ctx.closePath();ctx.fill();
  ctx.fillStyle=`hsl(${p.hue} 45% ${30+35*lit}%)`;ctx.beginPath();ctx.arc(x,y-57*s,3.4*s,0,6.283);ctx.fill();
  ctx.font=`500 ${Math.max(12,Math.round(13*K))}px "Pretendard Variable", Pretendard, "Apple SD Gothic Neo", sans-serif`;ctx.textAlign="center";ctx.textBaseline="top";
  ctx.fillStyle=`rgba(243,235,221,${.5+.4*lit})`;ctx.fillText((p.isMe?p.name+" (나)":p.name)+(p.away?" · 자리 비움":""),x,y+9*s);
  ctx.globalAlpha=1;
  if(p.away){ctx.font=`700 ${Math.max(12,Math.round(14*K))}px "Gowun Batang", serif`;ctx.fillStyle="rgba(220,230,255,.75)";ctx.textBaseline="bottom";
    for(let k=0;k<3;k++){const u=((t/1000)*.5+k/3)%1;ctx.globalAlpha=Math.sin(u*Math.PI)*.8;ctx.fillText("z",x+14*s+u*16*s,y-58*s-u*26*s)}ctx.globalAlpha=1}}
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
    if(!b&&st.p.typing){const bx=st.x,by=st.y-72*st.s;ctx.fillStyle="rgba(250,244,232,.85)";ctx.beginPath();
      if(ctx.roundRect)ctx.roundRect(bx-20,by-14,40,22,11);else ctx.rect(bx-20,by-14,40,22);ctx.fill();
      for(let k=0;k<3;k++){ctx.fillStyle=`rgba(36,26,18,${.35+.5*Math.max(0,Math.sin(t/180-k*.8))})`;ctx.beginPath();ctx.arc(bx-9+k*9,by-3,2.6,0,6.283);ctx.fill()}continue}
    if(!b)continue;const age=(t-b.t0)/1000;if(age>9){bubbles.delete(st.p.id);continue}
    ctx.globalAlpha=age<.2?age/.2:age>8?9-age:1;
    const bf=Math.max(14,Math.round(15*K));ctx.font=`500 ${bf}px "Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;const lines=wrap(b.text,Math.max(150,170*K));
    const lh=bf*1.35,pad=Math.max(8,9*K);const w=Math.max(...lines.map(l=>ctx.measureText(l).width))+pad*2,h=lines.length*lh+pad*1.4;
    const bx=clamp(st.x-w/2,6,W-w-6),by=st.y-66*st.s-h;
    ctx.fillStyle="rgba(250,244,232,.93)";ctx.beginPath();
    if(ctx.roundRect)ctx.roundRect(bx,by,w,h,12*K);else ctx.rect(bx,by,w,h);ctx.fill();
    ctx.beginPath();ctx.moveTo(st.x-6*K,by+h-1);ctx.lineTo(st.x,by+h+7*K);ctx.lineTo(st.x+6*K,by+h-1);ctx.fill();
    ctx.fillStyle="#241a12";ctx.textAlign="center";ctx.textBaseline="top";
    lines.forEach((l,i)=>ctx.fillText(l,bx+w/2,by+pad*.7+i*lh))}
  ctx.globalAlpha=1}
function drawFloats(list,t){const byId=new Map(list.map(st=>[st.p.id,st]));ctx.textAlign="center";ctx.textBaseline="bottom";
  for(let i=floats.length-1;i>=0;i--){const f=floats[i];const u=(t-f.t0)/(f.emoji?1800:2600);if(u>=1){floats.splice(i,1);continue}
    const st=byId.get(f.id);if(!st||u<0)continue;ctx.globalAlpha=u<.12?u/.12:1-Math.max(0,(u-.6)/.4);
    if(f.emoji){ctx.font=`${Math.round(30*K)}px sans-serif`;ctx.fillText(f.text,st.x+(f.dx||0)*K+Math.sin(u*6+f.ph)*8*K,st.y-60*st.s-u*90*K)}
    else{ctx.font=`700 ${Math.round(15*K)}px "Gowun Batang", serif`;ctx.fillStyle="#ffe2b0";ctx.fillText(f.text,st.x,st.y-68*st.s-u*24*K)}}
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
  drawBubbles(st,t);drawRoasts(st,now);drawFloats(st,t);drawFireworks(t,dt);drawSnow(t,dt);
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
function addLine(name,hue,text,sys){const d=document.createElement("div");d.className="ln";
  if(sys){const s=document.createElement("span");s.className="sys";s.textContent=text;d.appendChild(s)}
  else{const n=document.createElement("span");n.className="nm";n.style.color=`hsl(${hue} 70% 72%)`;n.textContent=name;d.appendChild(n);d.appendChild(document.createTextNode(text))}
  logEl.appendChild(d);while(logEl.children.length>40)logEl.firstChild.remove();logEl.scrollTop=logEl.scrollHeight;setTimeout(()=>d.classList.add("old"),40000)}
let solo=false;
let enteredAt=0;
function updateWho(){const n=people().length;const m=enteredAt?Math.floor((Date.now()-enteredAt)/60000):0;const tm=m>=1?` · ${m}분째 불멍 중`:"";
  $("#who").textContent=solo?"친구 연결이 안 되고 있어요. 새로고침해 보세요.":n<=1?"혼자 불을 지키는 중"+tm+". 초대 링크를 친구한테 보내 보세요.":`불 앞에 ${n}명`+tm}
setInterval(updateWho,30000);
function pushPresence(){if(!room||!me.name)return;room.presence({name:me.name,hue:me.hue,logs:me.logs,roast:me.roast,say:me.say,emo:me.emo,dust:me.dust,wish:me.wish,typing:me.typing,away:me.away,fw:me.fw,card:me.card,pick:me.pick,snow:me.snow,rk:me.rk,burn:me.burn,dice:me.dice}).catch(()=>{})}
function needName(){if(!me.name){openSit();return true}return false}

const sit=$("#sit"),nameInput=$("#nameInput"),sw=$("#swatches");
HUES.forEach((h,i)=>{const b=document.createElement("button");b.type="button";b.className="sw";b.style.background=`hsl(${h} 55% 45%)`;
  b.setAttribute("aria-label",`모자 색 ${i+1}`);b.dataset.h=h;b.addEventListener("click",()=>{me.hue=h;markSw()});sw.appendChild(b)});
function markSw(){sw.querySelectorAll(".sw").forEach(b=>b.setAttribute("aria-pressed",String(+b.dataset.h===me.hue)))}
function openSit(){nameInput.value=me.name;markSw();sit.hidden=false;setTimeout(()=>nameInput.focus(),50)}
$("#sitForm").addEventListener("submit",e=>{e.preventDefault();const n=clean(nameInput.value);if(!n)return;
  me.name=n;store.set("fire.name",n);store.set("fire.hue",me.hue);sit.hidden=true;pushPresence();updateWho()});
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
function toggleTray(which){const T2={emo:[emotes,emoBtn],fun:[$("#funTray"),$("#funBtn")],roast:[$("#roastTray"),roastBtn]};
  for(const k in T2){const [tr,bt]=T2[k];const show=k===which?tr.hidden:false;tr.hidden=!show;bt.setAttribute("aria-expanded",String(show))}}
emoBtn.addEventListener("click",()=>toggleTray("emo"));
$("#funBtn").addEventListener("click",()=>toggleTray("fun"));
const wishBtn=$("#wishBtn");
wishBtn.addEventListener("click",()=>{const s=starAt(Date.now());if(!s||needName())return;me.wish={s:s.sl,at:Date.now()};
  floats.push({id:"SELF",text:"🌠 소원 빌었어요",t0:performance.now()});wishBtn.hidden=true;pushPresence()});
let lastSay=0;
$("#chatForm").addEventListener("submit",e=>{e.preventDefault();if(needName())return;const inp=$("#chatInput");const text=clean(inp.value,80);if(!text)return;
  const now=Date.now();if(now-lastSay<700)return;lastSay=now;me.say={t:text,at:now};bubbles.set("SELF",{text,t0:performance.now()});
  addLine(me.name,me.hue,text);inp.value="";me.typing=false;pushPresence()});


/* ---------- 놀거리: 폭죽 · 이야기 카드 · 제비뽑기 · 눈 ---------- */
const QUESTIONS=["요즘 제일 자주 듣는 노래는?","지금 당장 떠날 수 있다면 어디로?","살면서 먹은 최고의 야식은?","10년 전 나한테 해주고 싶은 말은?","요즘 빠져 있는 거 하나만","무인도에 딱 세 개 가져간다면?","가장 기억에 남는 여행은?","최근에 제일 크게 웃었던 일은?","인생 영화나 드라마 하나 꼽자면?","어릴 때 꿈은 뭐였어?","하루 동안 다른 사람으로 살 수 있다면 누구?","올해 안에 꼭 해보고 싶은 거 하나","제일 좋아하는 계절이랑 그 이유는?","요즘 고민 하나 털어놓기","나만 아는 맛집 하나 풀기","첫 월급으로 뭐 했어?","가장 무서웠던 경험은?","지금 이 자리에 있는 사람 첫인상 하나","돈 걱정 없으면 뭐 하면서 살래?","최근에 산 것 중 제일 잘 산 거","잠 안 올 때 뭐 해?","내 인생 노래방 18번은?","지금까지 받은 최고의 선물은?","다시 태어나면 뭐로 태어나고 싶어?","요즘 나를 웃게 하는 작은 것","제일 오래된 친구 이야기 하나","자기 전에 꼭 하는 습관은?","한 가지 초능력을 가질 수 있다면?","올해 나에게 점수를 준다면 몇 점?","혼자 있을 때 제일 좋아하는 시간은?","살면서 제일 잘한 선택은?","요즘 제일 듣고 싶은 말은?","라면 끓일 때 나만의 비법은?","가장 최근에 운 건 언제?","10년 뒤 오늘 나는 뭐 하고 있을까?","무조건 추천하는 유튜브 채널 하나","내 MBTI 맞는 것 같아, 아닌 것 같아?","밸런스 게임: 평생 여름 vs 평생 겨울","밸런스 게임: 과거로 가기 vs 미래 보기","밸런스 게임: 평생 라면 금지 vs 평생 치킨 금지"];
const fireworks=[],sparksFw=[],snowflakes=[];let snowUntil=0;
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
  if(now<snowUntil&&snowflakes.length<(reduce?60:160))snowflakes.push({x:Math.random()*W,y:-10,vy:(25+Math.random()*35),r:1+Math.random()*2.2,ph:Math.random()*6});
  ctx.fillStyle="rgba(255,255,255,.85)";
  for(let i=snowflakes.length-1;i>=0;i--){const f=snowflakes[i];f.y+=f.vy*dt;f.x+=Math.sin(t/900+f.ph)*12*dt;
    if(f.y>H+10){if(now<snowUntil){f.y=-10;f.x=Math.random()*W}else{snowflakes.splice(i,1);continue}}
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
  addLine("",0,`${me.name}님이 고민 하나를 불에 태웠어요`,true);pushPresence()});
$("#diceBtn").addEventListener("click",()=>{if(needName())return;const v=1+Math.floor(Math.random()*6);me.dice={v,at:Date.now()};
  floats.push({id:"SELF",text:"🎲 "+v,t0:performance.now()});addLine("",0,`${me.name}님 주사위: ${v}`,true);pushPresence()});

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
  g.fillText(day+" 모닥불",c.width-24*DPR,c.height-24*DPR);
  const fl=document.createElement("div");fl.style.cssText="position:fixed;inset:0;background:#fff;opacity:.8;pointer-events:none;transition:opacity .6s";
  document.body.appendChild(fl);requestAnimationFrame(()=>{fl.style.opacity="0";setTimeout(()=>fl.remove(),700)});
  const blob=await new Promise(r=>c.toBlob(r,"image/png"));if(!blob)return;
  await deliverPhoto(blob,`모닥불_${day.replace(/\./g,"")}_${p2(d.getHours())}${p2(d.getMinutes())}.png`)});
async function deliverPhoto(blob,filename){
  const file=new File([blob],filename,{type:"image/png"});
  if(/Android|iPhone|iPad/i.test(navigator.userAgent)&&navigator.canShare&&navigator.canShare({files:[file]})){
    try{await navigator.share({files:[file],title:"모닥불"});return}catch(e){if(e&&e.name==="AbortError")return}}
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);toast("사진을 저장했어요")}

/* ---------- room ---------- */
function onPeers(ch){const t=performance.now();const early=t-loadedAt<3000;
  for(const p of ch.peers)if(p.sameTab)myPeer=p.peer;
  for(const p of [...ch.joined,...ch.updated]){
    if(p.sameTab||p.kind!=="viewer")continue;const pr=p.presence||{};const name=clean(pr.name);const hue=HUES.includes(pr.hue)?pr.hue:30;
    const logs=Array.isArray(pr.logs)?pr.logs.filter(Number.isFinite):[];const lastLog=logs.length?Math.max(...logs):0;
    const roast=Number.isFinite(pr.roast)?pr.roast:null;
    const sayAt=pr.say&&Number.isFinite(pr.say.at)?pr.say.at:0,emoAt=pr.emo&&Number.isFinite(pr.emo.at)?pr.emo.at:0,
      dustAt=pr.dust&&Number.isFinite(pr.dust.at)?pr.dust.at:0,wishAt=pr.wish&&Number.isFinite(pr.wish.at)?pr.wish.at:0;
    const at=o=>o&&typeof o==="object"&&Number.isFinite(o.at)?o.at:0;const fwAt=at(pr.fw),cardAt=at(pr.card),pickAt=at(pr.pick),snowAt=at(pr.snow),burnAt=at(pr.burn),diceAt=at(pr.dice);const rk=foodOf(pr.rk);
    const prev=known.get(p.peer);const fresh=v=>v&&Math.abs(Date.now()-v)<15000;
    if(prev&&prev.name&&name){
      if(lastLog&&lastLog!==prev.lastLog&&fresh(lastLog))flying.push({id:p.peer,t0:t});
      if(prev.roast!=null&&roast==null)floats.push({id:p.peer,text:FOODS[prev.rk||"m"].e+" "+verdict(prev.rk,(Date.now()-prev.roast)/1000),t0:t});
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
    known.set(p.peer,{lastLog,roast,rk,name,sayAt,emoAt,dustAt,wishAt,fwAt,cardAt,pickAt,snowAt,burnAt,diceAt})}
  for(const p of ch.left){const k=known.get(p.peer);if(k&&k.name){toast(`${k.name}님이 자리를 떴어요`);addLine("",0,`${k.name}님이 자리를 떴어요`,true)}known.delete(p.peer);bubbles.delete(p.peer)}
  updateWho()}
function goSolo(){room=null;solo=true;updateWho()}

/* ---------- P2P 연결 (서버 없이 브라우저끼리) ---------- */
function makeP2PRoom(T,roomId,pw){
  const cfg={appId:"catchmilli-campfire-v1"};if(pw)cfg.password=pw;const r=T.joinRoom(cfg,roomId);
  const pres=r.makeAction("pres");const map=new Map();const subs=[],joinHooks=[];let mine={},timer=null,snap;
  const self={peer:T.selfId,by:null,isMe:true,sameTab:true,kind:"viewer",guest:false,presence:mine,updatedAt:Date.now()};
  const rebuild=()=>{snap=Object.freeze([self,...map.values()])};rebuild();
  const fire=ch=>{const c={peers:snap,joined:ch.joined||[],left:ch.left||[],updated:ch.updated||[]};subs.forEach(f=>{try{f(c)}catch(e){console.error(e)}})};
  const mk=(id,presence)=>({peer:id,by:null,isMe:false,sameTab:false,kind:"viewer",guest:false,presence,updatedAt:Date.now()});
  r.onPeerJoin=id=>{if(!map.has(id)){const p=mk(id,{});map.set(id,p);rebuild();fire({joined:[p]})}pres.send(mine,{target:id});joinHooks.forEach(f=>f(id))};
  r.onPeerLeave=id=>{const p=map.get(id);if(!p)return;map.delete(id);rebuild();fire({left:[p]})};
  pres.onMessage=(data,{peerId})=>{if(!data||typeof data!=="object"||Array.isArray(data))return;let len=0;try{len=JSON.stringify(data).length}catch(e){return}if(len>4096)return;
    const isNew=!map.has(peerId);const p=mk(peerId,data);map.set(peerId,p);rebuild();fire(isNew?{joined:[p]}:{updated:[p]})};
  const iv=setInterval(()=>{if(map.size)pres.send(mine)},20000);
  return {raw:r,leave(){clearInterval(iv);subs.length=0;joinHooks.length=0;try{r.leave()}catch(e){}},onJoin:f=>joinHooks.push(f),peers:()=>snap,
    presence(patch){const n={...mine};for(const k in patch){if(patch[k]===null||patch[k]===undefined)delete n[k];else n[k]=patch[k]}
      mine=n;self.presence=n;rebuild();clearTimeout(timer);timer=setTimeout(()=>pres.send(mine),60);return Promise.resolve()},
    onPeers(fn){subs.push(fn);setTimeout(()=>fn({peers:snap,joined:snap.slice(),left:[],updated:[]}),0);return()=>{}}};
}
/* ---------- 방 목록 · 만들기 · 들어가기 · 비밀번호 · 퇴장 ---------- */
const lobby=$("#lobby"),roomTitleEl=$("#roomTitle"),pwBox=$("#pwBox");
let roomId="",roomName="",roomPw="",roomHidden=false,T=null,lastRoom=null,pending=null;
const cleanId=v=>String(v||"").replace(/[^a-zA-Z0-9-]/g,"").slice(0,40);
async function ensureT(){if(!T)T=await import("https://esm.sh/trystero@0.26.0");return T}
function roomUrl(){const q=new URLSearchParams();q.set("room",roomId);if(roomName)q.set("name",roomName);if(roomPw)q.set("lock","1");if(roomHidden)q.set("hidden","1");return location.pathname+"?"+q.toString()}
function showLobby(left){document.body.classList.add("in-lobby");lobby.hidden=false;sit.hidden=true;pwBox.hidden=true;setMenu(false);
  $("#rejoin").hidden=!left;if(left)$("#rejoinText").textContent=`${left.name?"“"+left.name+"” ":""}불 앞에서 일어났어요.`;renderRooms()}

/* 방 목록: 방에 있는 사람들이 'lobby' 채널에 방 정보를 알려줌 */
let lobbyRoom=null,adAction=null;const ads=new Map();const lobbyStart=Date.now();
function announce(target){if(!adAction||!room||!roomId||roomHidden)return;
  const d={id:roomId,name:roomName,n:people().length,lock:!!roomPw,at:Date.now()};try{adAction.send(d,target?{target}:undefined)}catch(e){}}
function unannounce(id){if(adAction&&id)try{adAction.send({id,gone:true,at:Date.now()})}catch(e){}}
async function initLobby(){try{await ensureT();lobbyRoom=T.joinRoom({appId:"catchmilli-campfire-v1"},"lobby-v1");adAction=lobbyRoom.makeAction("ad");
  adAction.onMessage=(d,{peerId})=>{if(!d||typeof d!=="object")return;const id=cleanId(d.id);if(!id)return;
    if(d.gone){const e=ads.get(id);if(e&&e.peer===peerId)ads.delete(id);renderRooms();return}
    const n=Number.isFinite(d.n)?clamp(Math.round(d.n),1,99):1;ads.set(id,{id,name:clean(d.name,20),n,lock:d.lock===true,seen:Date.now(),peer:peerId});renderRooms()};
  lobbyRoom.onPeerJoin=id=>announce(id);
  lobbyRoom.onPeerLeave=id=>{for(const [k,e] of ads)if(e.peer===id)ads.delete(k);renderRooms()};
  setInterval(()=>announce(),8000);setInterval(renderRooms,5000);announce()}catch(e){console.error(e)}}
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
  try{await ensureT();
    room=makeP2PRoom(T,roomId,roomPw);room.onPeers(onPeers);
    musicAction=room.raw.makeAction("music");musicAction.onMessage=d=>{if(d&&Number.isFinite(d.anchor)&&Number.isFinite(d.at))setAnchor(d.anchor,d.at)};
    room.onJoin(id=>{if(anchorAt)musicAction.send({anchor,at:anchorAt},{target:id})});
    pushPresence();updateWho();announce();
    clearTimeout(pwCheck);if(roomPw)pwCheck=setTimeout(()=>{const e=ads.get(roomId);if(room&&e&&e.n>=1&&people().length<=1)toast("아무도 안 보이면 비밀번호를 다시 확인해 주세요")},15000);
  }catch(e){console.error(e);goSolo()}
}
function leaveRoom(){
  clearTimeout(pwCheck);unannounce(roomId);
  if(room){room.leave();room=null}
  lastRoom={id:roomId,name:roomName,lock:!!roomPw,hidden:roomHidden};musicAction=null;
  known.clear();bubbles.clear();flying.length=0;floats.length=0;myPeer=null;snowUntil=0;$("#qcard").hidden=true;
  if(me.roast!=null){me.roast=null;setRoastLabel()}
  if(listening){listening=false;music.pause();curSrc="";refreshMusicUI()}
  enteredAt=0;logEl.textContent="";roomTitleEl.textContent="";roomId="";roomName="";roomPw="";roomHidden=false;toggleTray("none");
  $("#joinInput").value="";history.replaceState(null,"",location.pathname);showLobby(lastRoom);
}
$("#leaveBtn").addEventListener("click",leaveRoom);
$("#rejoinBtn").addEventListener("click",()=>{if(lastRoom)enterRoom(lastRoom.id,lastRoom.name,{lock:lastRoom.lock,hidden:lastRoom.hidden})});
$("#openCreate").addEventListener("click",()=>{const f=$("#createForm");f.hidden=!f.hidden;$("#openCreate").hidden=!f.hidden;if(!f.hidden)$("#roomNameInput").focus()});
$("#createBtn").addEventListener("click",()=>{const pw=$("#roomPwInput").value;
  enterRoom("fire-"+Math.random().toString(36).slice(2,8),$("#roomNameInput").value,{pw,hidden:$("#hiddenCheck").checked});
  $("#roomPwInput").value="";$("#createForm").hidden=true;$("#openCreate").hidden=false});
$("#joinForm").addEventListener("submit",e=>{e.preventDefault();const v=$("#joinInput").value.trim();if(!v)return;
  let id=v,name="",lock=false,hidden=false;try{const u=new URL(v);id=u.searchParams.get("room")||"";name=u.searchParams.get("name")||"";lock=u.searchParams.get("lock")==="1";hidden=u.searchParams.get("hidden")==="1"}catch(err){}
  id=cleanId(id);if(!id){toast("방 코드를 다시 확인해 주세요");return}const ad=ads.get(id);if(ad&&ad.lock)lock=true;enterRoom(id,name||(ad&&ad.name)||"",{lock,hidden})});
$("#inviteBtn").addEventListener("click",async()=>{const url=location.origin+roomUrl();const msg=roomPw?"링크를 복사했어요. 비밀번호는 따로 알려 주세요":"링크를 복사했어요. 친구한테 보내 주세요";
  try{await navigator.clipboard.writeText(url);toast(msg)}catch(e){window.prompt("이 링크를 친구한테 보내 주세요",url)}});
(async()=>{
  resize();requestAnimationFrame(frame);refreshMusicUI();loadTracks();initLobby();
  const params=new URLSearchParams(location.search);const id=cleanId(params.get("room"));
  if(id)enterRoom(id,params.get("name")||"",{lock:params.get("lock")==="1",hidden:params.get("hidden")==="1"});else showLobby(null);
})();
})();
