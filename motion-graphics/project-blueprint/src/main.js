(function(){
'use strict';
/* ============================================================
   مخطط المشروع — deterministic motion-graphics engine
   One paused GSAP timeline + renderAll(t) = every frame is a
   pure function of time, so the same code drives the live
   player and the frame-exact video render.
   ============================================================ */
const NS='http://www.w3.org/2000/svg';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const AD='٠١٢٣٤٥٦٧٨٩';
const ar=s=>String(s).replace(/\d/g,d=>AD[+d]);
const pad=n=>String(n).padStart(2,'0');
function fmt(n,dec=0){const neg=n<0;let [i,f]=Math.abs(n).toFixed(dec).split('.');i=i.replace(/\B(?=(\d{3})+(?!\d))/g,',');return (neg?'−':'')+ar(i).replace(/,/g,'٬')+(f?'٫'+ar(f):'');}
function el(tag,cls,parent,html){const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;if(parent)parent.appendChild(e);return e;}
function at(e,x,y,w,h){e.style.left=x+'px';e.style.top=y+'px';if(w!=null)e.style.width=w+'px';if(h!=null)e.style.height=h+'px';return e;}
function sv(tag,attrs,parent){const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(parent)parent.appendChild(e);return e;}
const words=txt=>txt.trim().split(/\s+/).map(w=>`<span class="w">${w}</span>`).join(' ');
const C={ink:'#0A1E33',line:'#E6EFF8',dim:'#8FA9C4',faint:'#56769A',amber:'#FFB547',coral:'#FF6B5E',mint:'#4FD6A4',sky:'#6CC2FF'};
const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
const RENDER=/render/.test(location.search);
if(RENDER)document.documentElement.classList.add('render');

const stage=$('#stage'),world=$('#world'),shared=$('#shared'),caps=$('#caps'),grid=$('#grid'),grain=$('#grain');
const DUR=150;
const CH=[
  {t:0,n:'',title:'الغلاف',sec:'الغلاف'},
  {t:9,n:'١',title:'ما هو المشروع؟',sec:'الأساسيات'},
  {t:20,n:'٢',title:'المثلث الذهبي',sec:'الأساسيات'},
  {t:33,n:'٣',title:'دورة حياة المشروع',sec:'الأساسيات'},
  {t:45,n:'٤',title:'البدء: الميثاق وأصحاب المصلحة',sec:'مرحلة البدء'},
  {t:57,n:'٥',title:'تجزئة العمل WBS',sec:'مرحلة التخطيط'},
  {t:68.3,n:'٦',title:'الجدول والمسار الحرج',sec:'مرحلة التخطيط'},
  {t:82,n:'٧',title:'التنفيذ ولوحة كانبان',sec:'مرحلة التنفيذ'},
  {t:93,n:'٨',title:'المراقبة والتحكم',sec:'المراقبة والتحكم'},
  {t:118,n:'٩',title:'الإغلاق والدروس المستفادة',sec:'مرحلة الإغلاق'},
  {t:128,n:'١٠',title:'المنهجيات: الشلال والرشيقة',sec:'المنهجيات'},
  {t:139,n:'',title:'الخاتمة',sec:'الخاتمة'}
];
const tl=gsap.timeline({paused:true,defaults:{ease:'power3.out'}});
const CUES=[];const cue=(type,t,v=1)=>{CUES.push({type,t:Math.round(t*1000)/1000,v});};
const R={};

/* ---------------- helpers ---------------- */
function scene(id,t0,t1,pushEnd){const sc=el('div','scene',world);sc.id=id;tl.set(sc,{visibility:'visible'},t0);tl.set(sc,{visibility:'hidden'},t1);if(pushEnd&&!RM)tl.fromTo(sc,{scale:1},{scale:1.022,duration:pushEnd-t0,ease:'none'},t0);return sc;}
function sceneOut(sc,t,d=.65){tl.to(sc,{opacity:0,filter:'blur(12px)',scale:'+=0.035',duration:d,ease:'power2.in'},t);}
function svgIn(parent){return sv('svg',{class:'full',viewBox:'0 0 1920 1080'},parent);}
function path(parent,d,stroke=C.line,w=2,extra={}){return sv('path',Object.assign({d,fill:'none',stroke,'stroke-width':w,'stroke-linecap':'butt','stroke-linejoin':'round'},extra),parent);}
function prep(p){p.setAttribute('pathLength','1');p.setAttribute('stroke-dasharray','1 1');p.setAttribute('stroke-dashoffset','1');p.setAttribute('opacity','0');return p;}
function draw(ps,t,d=.8,ease='power2.inOut',stagger=0){ps=Array.isArray(ps)?ps:[ps];ps.forEach((p,i)=>tl.set(p,{opacity:1},t+i*stagger));tl.to(ps,{attr:{'stroke-dashoffset':0},duration:d,ease,stagger},t);}
function ah(parent,x,y,deg,color=C.line,w=2){const g=sv('g',{transform:`translate(${x} ${y}) rotate(${deg})`,opacity:0},parent);sv('path',{d:'M-13 -7 L0 0 L-13 7',fill:'none',stroke:color,'stroke-width':w,'stroke-linecap':'round','stroke-linejoin':'round'},g);return g;}
function show(els,t,d=.25){tl.to(els,{opacity:1,duration:d,ease:'power1.out'},t);}
function ring(parent,cx,cy,t,color=C.amber,r0=9,r1=52,d=1.1){const c=sv('circle',{cx,cy,r:r0,fill:'none',stroke:color,'stroke-width':2,opacity:0},parent);tl.set(c,{opacity:1},t);tl.to(c,{attr:{r:r1},opacity:0,duration:d,ease:'power2.out'},t);return c;}
function popIn(els,t,o={}){tl.fromTo(els,{opacity:0,scale:o.from??0,transformOrigin:'50% 50%'},{opacity:1,scale:1,duration:o.d??.6,ease:o.ease??'back.out(2)',stagger:o.s??0},t);}
function fadeUp(els,t,o={}){tl.fromTo(els,{opacity:0,y:o.y??24,filter:`blur(${o.b??6}px)`},{opacity:1,y:0,filter:'blur(0px)',duration:o.d??.7,stagger:o.s??0,ease:o.ease??'power3.out'},t);}
function wordsIn(ws,t,o={}){tl.fromTo(ws,{opacity:0,y:o.y??28,filter:`blur(${o.b??10}px)`},{opacity:1,y:0,filter:'blur(0px)',duration:o.d??.7,stagger:o.s??.06,ease:o.ease??'power3.out'},t);}
function shake(t,a=9){if(RM)return;tl.to(world,{keyframes:{x:[0,-a,a*.8,-a*.5,a*.3,0],y:[0,a*.4,-a*.3,a*.2,0,0]},duration:.42,ease:'none'},t);}
let clipN=0;
function clipRTL(svg,els,xR,xL,t,d){const id='mgc'+(clipN++);const cp=sv('clipPath',{id},svg);const r=sv('rect',{x:xR,y:0,width:0,height:1080},cp);els.forEach(e=>e.setAttribute('clip-path',`url(#${id})`));tl.to(r,{attr:{x:xL,width:xR-xL},duration:d,ease:'power2.inOut'},t);}
function smooth(P){let d=`M${P[0][0].toFixed(1)} ${P[0][1].toFixed(1)}`;for(let i=0;i<P.length-1;i++){const p0=P[i-1]||P[i],p1=P[i],p2=P[i+1],p3=P[i+2]||p2;d+=` C${(p1[0]+(p2[0]-p0[0])/6).toFixed(1)} ${(p1[1]+(p2[1]-p0[1])/6).toFixed(1)} ${(p2[0]-(p3[0]-p1[0])/6).toFixed(1)} ${(p2[1]-(p3[1]-p1[1])/6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;}return d;}
const invQuad=p=>p<.5?Math.sqrt(p/2):1-Math.sqrt((1-p)/2);

function heading(sc,t,num,title,sub){
  const h=el('div','hd',sc);
  h.innerHTML=`<div class="hd-num">${num}</div><div><div class="hd-t">${words(title)}</div><div class="hd-s">${sub}</div></div>`;
  tl.fromTo(h.querySelector('.hd-num'),{clipPath:'inset(100% 0% 0% 0%)',y:30},{clipPath:'inset(0% 0% 0% 0%)',y:0,duration:.9,ease:'expo.out'},t);
  wordsIn($$('.hd-t .w',h),t+.15,{y:26,b:8,s:.07});
  tl.fromTo(h.querySelector('.hd-s'),{opacity:0,x:30},{opacity:1,x:0,duration:.7},t+.45);
  cue('tick',t,.55);
  return h;
}
function caption(text,t,dur){
  const c=el('div','cap',caps);
  c.innerHTML=`<div class="cap-t">${words(text)}</div><div class="cap-bar"></div>`;
  tl.set(c,{visibility:'visible'},t);
  tl.fromTo($$('.w',c),{opacity:0,y:14,filter:'blur(6px)'},{opacity:1,y:0,filter:'blur(0px)',duration:.5,stagger:.035,ease:'power2.out'},t);
  tl.fromTo(c.querySelector('.cap-bar'),{scaleX:0},{scaleX:1,duration:dur,ease:'none'},t);
  tl.to(c,{opacity:0,y:-10,duration:.35,ease:'power2.in'},t+dur-.35);
  tl.set(c,{visibility:'hidden'},t+dur);
}
const sweepEl=$('#sweep');gsap.set(sweepEl,{x:1960});
function sweep(t){tl.fromTo(sweepEl,{x:1960},{x:-480,duration:.95,ease:'power2.inOut',immediateRender:false},t);cue('whoosh',t);}

/* ---------------- chrome: progress, tracker ---------------- */
const progEl=$('#prog');
const segI=CH.map((c,i)=>{const end=i<CH.length-1?CH[i+1].t:DUR;const s=el('div','seg',progEl,'<i></i>');s.style.flex=`${end-c.t} 1 0`;return s.firstChild;});
const TRK=[720,580,440,300,160],TRKY=118,TKN=['البدء','التخطيط','التنفيذ','المراقبة','الإغلاق'];
const trk=$('#trk');
const tcs=TRK.slice(0,4).map((x,i)=>{const c=at(el('div','tk-c',trk),TRK[i+1]+16,117,x-TRK[i+1]-32);c.innerHTML='<i></i>';return c;});
const tks=TRK.map((x,i)=>{const d=at(el('div','tk',trk),x-12,106);d.innerHTML=`<i class="tk-d"></i><i class="tk-r"></i><svg class="tk-ok" style="width:100%;height:100%" viewBox="0 0 24 24"><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#0A1E33" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="tk-l">${TKN[i]}</span>`;return d;});
function phCur(i,t){const n=tks[i],r=n.querySelector('.tk-r');tl.to(n.querySelector('.tk-d'),{borderColor:C.amber,backgroundColor:'rgba(255,181,71,.22)',duration:.4},t);tl.to(n.querySelector('.tk-l'),{color:C.line,duration:.4},t);tl.set(r,{scale:1,opacity:.95},t);tl.to(r,{scale:2.4,opacity:0,duration:1.1,ease:'power2.out'},t);}
function phDone(i,t){const n=tks[i];tl.to(n.querySelector('.tk-d'),{borderColor:C.mint,backgroundColor:C.mint,duration:.35},t);tl.to(n.querySelector('.tk-ok'),{opacity:1,duration:.3},t+.1);tl.to(n.querySelector('.tk-l'),{color:C.dim,duration:.35},t);if(tcs[i])tl.to(tcs[i].firstChild,{scaleX:1,duration:.6,ease:'power2.inOut'},t);}

/* ============ S0 · الغلاف (0 – 9) ============ */
{
  tl.fromTo(grid,{'--gr':0},{'--gr':1700,duration:2.8,ease:'power2.inOut'},.05);
  const s=svgIn(shared);
  const line=prep(path(s,'M1560 540 H360',C.line,2));
  draw(line,.45,1.35);
  const nA=sv('circle',{cx:1560,cy:540,r:9,fill:C.amber},s),nB=sv('circle',{cx:360,cy:540,r:9,fill:C.amber},s);
  popIn(nA,.3,{ease:'back.out(3)'});ring(s,1560,540,.35);cue('pop',.3,.8);
  const ms=[1320,1080,840,600].map(x=>{const d=sv('path',{d:`M${x} 531 L${x+9} 540 L${x} 549 L${x-9} 540Z`,fill:'#0B2139',stroke:C.line,'stroke-width':1.6},s);const tt=.45+1.35*invQuad((1560-x)/1200);popIn(d,tt-.05,{d:.45});cue('blip',tt,.5);return d;});
  popIn(nB,1.75,{ease:'back.out(3)'});ring(s,360,540,1.8);cue('pop',1.75,.8);
  const la=at(el('div','a nlab',shared,'الفكرة'),1460,570,200),lb=at(el('div','a nlab',shared,'التسليم'),260,570,200);
  fadeUp(la,.7,{y:10});fadeUp(lb,1.95,{y:10});

  const sc=scene('s0',0,9.4);
  const eb=at(el('div','a intro-eb',sc,'دليل مرئي في عشر لوحات'),0,196,1920);
  const ti=at(el('div','a intro-t',sc,words('إدارة المشاريع')),0,236,1920);
  const meas=at(el('div','a intro-t',sc,words('إدارة المشاريع')),0,236,1920);meas.style.fontWeight='800';meas.style.visibility='hidden';
  const sub=at(el('div','a intro-s',sc,words('من الفكرة إلى التسليم، خطوةً بخطوة')),0,618,1920);
  const tw=$$('.w',ti);
  tl.fromTo(tw,{opacity:0,y:70,filter:'blur(22px)',fontWeight:100},{opacity:1,y:0,filter:'blur(0px)',fontWeight:800,duration:1.7,stagger:.22,ease:'expo.out'},2.0);
  cue('boom',2.0);
  const fs=svgIn(sc);
  const br=[0,1,2,3].map(()=>prep(path(fs,'M0 0',C.amber,2)));
  const rv=el('div','a rev',sc,'الإصدار ١٫٠ · مقياس ١:١');
  R.frame=()=>{let l=1e9,r=-1e9,tp=1e9,b=-1e9;$$('.w',meas).forEach(w=>{l=Math.min(l,w.offsetLeft);r=Math.max(r,w.offsetLeft+w.offsetWidth);tp=Math.min(tp,w.offsetTop);b=Math.max(b,w.offsetTop+w.offsetHeight);});
    const x0=l-50,x1=r+50,y0=236+tp+16,y1=236+b-2,a=44;
    br[0].setAttribute('d',`M${x0} ${y0+a} V${y0} H${x0+a}`);br[1].setAttribute('d',`M${x1-a} ${y0} H${x1} V${y0+a}`);
    br[2].setAttribute('d',`M${x1} ${y1-a} V${y1} H${x1-a}`);br[3].setAttribute('d',`M${x0+a} ${y1} H${x0} V${y1-a}`);
    rv.style.left=x0+'px';rv.style.top=(y1+14)+'px';};
  draw(br,2.9,.7,'power2.out');cue('swipe',2.9,.4);
  fadeUp(eb,3.1,{y:12});
  wordsIn($$('.w',sub),3.5,{y:18,b:6,s:.05});
  fadeUp(rv,3.8,{y:6});
  tl.to(tw,{opacity:0,y:-60,filter:'blur(18px)',duration:.6,stagger:.08,ease:'power2.in'},8.0);
  tl.to([eb,sub,rv,fs],{opacity:0,duration:.45,ease:'power2.in'},8.0);
  tl.to(ms,{scale:0,duration:.35,stagger:.05,ease:'back.in(2)'},8.1);
  sweep(8.35);
}

/* ============ S1 · ما هو المشروع؟ (9 – 20) ============ */
{
  const sc=scene('s1',9.0,20.0,19.2);
  heading(sc,9.3,'١','ما هو المشروع؟','التعريف، وثلاث خصائص أساسية');
  const def=at(el('div','a def',sc),0,266,1920);
  def.innerHTML='<span class="w">«جهدٌ</span> <span class="w mk"><i></i><b>مؤقت</b></span> <span class="w">يُبذل</span> <span class="w">لإنتاج</span> <span class="w">منتج</span> <span class="w">أو</span> <span class="w">خدمة</span> <span class="w">أو</span> <span class="w">نتيجة</span> <span class="w mk"><i></i><b>فريدة»</b></span>';
  wordsIn($$('.w',def),10.0,{y:22,b:8,s:.07});
  $$('.mk',def).forEach((m,i)=>{const t=11.5+i*.8;tl.fromTo(m.firstChild,{scaleX:0},{scaleX:1,duration:.45,ease:'power2.inOut'},t);tl.to(m.lastChild,{color:C.ink,duration:.2},t+.15);cue('swipe',t,.6);});
  const src=at(el('div','a src',sc,'دليل PMBOK · معهد إدارة المشاريع PMI'),0,366,1920);
  fadeUp(src,12.7,{y:8});
  const s=svgIn(sc);
  const d1=prep(path(s,'M960 498 H1560',C.amber,1.5)),d2=prep(path(s,'M960 498 H360',C.amber,1.5));
  const e1=prep(path(s,'M1560 486 V510',C.amber,1.5)),e2=prep(path(s,'M360 486 V510',C.amber,1.5));
  draw([d1,d2],11.7,.8,'power2.out');draw([e1,e2],12.45,.2);
  const dlw=at(el('div','a ctr',sc,`<span class="chip" style="color:${C.amber};font-size:20px;padding:5px 14px">مدة محددة: بداية ونهاية</span>`),660,479,600);
  popIn(dlw,11.9,{from:.6});
  const CARDS=[
    {x:1450,t:'مؤقت',d:'له بداية ونهاية محددتان، وينتهي بتحقيق هدفه.',ic:'<path d="M15 6h26M15 50h26"/><path d="M18 6c0 13 20 15 20 22s-20 9-20 22M38 6c0 13-20 15-20 22s20 9 20 22"/><path class="acc" d="M22 46h12l-6-7z"/>'},
    {x:960,t:'فريد',d:'ناتجه جديد، حتى لو تشابهت خطواته مع مشاريع سابقة.',ic:'<path d="M28 5 49 28 28 51 7 28z"/><path class="acc" d="M28 19 37 28 28 37 19 28z"/>'},
    {x:470,t:'تدريجي التفصيل',d:'تتضح تفاصيله أكثر كلما تقدّم العمل وتوفرت المعلومات.',ic:'<path d="M8 46h40M8 35h32M8 24h22M8 13h12"/><circle class="acc" cx="48" cy="13" r="4"/>'}
  ];
  CARDS.forEach((c,i)=>{
    const t=13.55+i*.45;
    const lead=prep(path(s,`M${c.x} 552 V640`,C.faint,1.5));draw(lead,t-.25,.3,'power1.out');
    const dot=sv('circle',{cx:c.x,cy:540,r:6,fill:C.amber},s);popIn(dot,t-.35,{ease:'back.out(3)'});
    const card=at(el('div','a card brk',sc,`<div class="card-h"><svg viewBox="0 0 56 56" fill="none" stroke="#E6EFF8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${c.ic}</svg><div class="card-t">${c.t}</div></div><div class="card-d">${c.d}</div>`),c.x-220,640,440,200);
    fadeUp(card,t,{y:36,b:8});cue('pop',t,.7);
    const ps=$$('path:not(.acc)',card).map(prep);draw(ps,t+.25,.9,'power2.inOut');
    const acc=$$('.acc',card);acc.forEach(a=>{a.setAttribute('fill',C.amber);a.setAttribute('stroke','none');});popIn(acc,t+.95,{ease:'back.out(3)'});
  });
  caption('كل مشروع يبدأ بفكرة، وينتهي بنتيجة يمكن تسليمها وقياسها.',10.3,4.6);
  caption('ويتميّز عن العمل اليومي المتكرر بثلاث خصائص: مؤقت، وفريد، ويتضح تدريجياً.',15.1,3.9);
  sceneOut(sc,19.2);tl.to(shared,{opacity:0,duration:.5,ease:'power2.in'},19.2);sweep(19.45);
}

/* ============ S2 · المثلث الذهبي (20 – 33) ============ */
{
  const sc=scene('s2',20.0,33.0,32.3);
  heading(sc,20.3,'٢','المثلث الذهبي','ثلاثة قيود مترابطة تحكم كل مشروع');
  const s=svgIn(sc);
  const B={sx:960,sy:330,tx:1250,ty:800,cx:670,cy:800},T=Object.assign({},B);
  const ghost=path(s,`M${B.sx} ${B.sy} L${B.tx} ${B.ty} L${B.cx} ${B.cy}Z`,C.dim,1.5,{'stroke-dasharray':'7 9',opacity:0});
  const fill=sv('path',{fill:'rgba(108,194,255,.07)',opacity:0},s);
  const edge=prep(path(s,'M0 0',C.line,2.5));
  const dots=[0,1,2].map(()=>sv('circle',{r:10,fill:C.amber},s));
  const lab=[['النطاق','ماذا سننجز؟','center',340],['الوقت','متى سننتهي؟','left',320],['التكلفة','كم سننفق؟','right',320]].map(([a,b,al,w])=>{const d=el('div','a vl',sc,`<b>${a}</b><span>${b}</span>`);d.style.textAlign=al;d.style.width=w+'px';return d;});
  const q=el('div','a qual',sc,'<i class="qring"></i><b>الجودة</b><span>تتأثر أيضاً</span>');
  R.tri=()=>{const d=`M${T.sx} ${T.sy} L${T.tx} ${T.ty} L${T.cx} ${T.cy}Z`;edge.setAttribute('d',d);fill.setAttribute('d',d);
    [[T.sx,T.sy],[T.tx,T.ty],[T.cx,T.cy]].forEach(([x,y],i)=>{dots[i].setAttribute('cx',x);dots[i].setAttribute('cy',y);});
    at(lab[0],T.sx-170,T.sy-118);at(lab[1],T.tx+36,T.ty-42);at(lab[2],T.cx-356,T.cy-42);
    at(q,(T.sx+T.tx+T.cx)/3-78,(T.sy+T.ty+T.cy)/3-60);};
  R.tri();
  draw(edge,21.0,1.5,'power2.inOut');
  [[20.95,B.sx,B.sy],[21.45,B.tx,B.ty],[21.95,B.cx,B.cy]].forEach(([t,x,y],i)=>{popIn(dots[i],t,{ease:'back.out(3)'});ring(s,x,y,t+.05);cue('pop',t,.7);fadeUp(lab[i],t+.08,{y:14});});
  tl.to(fill,{opacity:1,duration:.8},22.3);
  popIn(q,22.5,{from:.5,ease:'back.out(1.6)'});cue('pop',22.5,.5);
  // change request
  const chg=at(el('div','a',sc,`<span class="chip" style="color:${C.amber}">طلب تغيير: إضافة تطبيق جوال</span>`),450,248);
  popIn(chg,25.9,{from:.7});cue('alert',25.9,.8);
  const lead=prep(path(s,'M806 272 L944 240',C.amber,1.5));draw(lead,26.15,.3);
  tl.to(ghost,{opacity:.75,duration:.5},26.1);
  const gl=at(el('div','a lbl ctr',sc,'خط الأساس'),860,766,200);gl.style.fontSize='18px';fadeUp(gl,26.6,{y:6});
  tl.to(T,{sy:232,tx:1352,ty:852,cx:568,cy:852,duration:1.6,ease:'power3.inOut'},26.4);cue('stretch',26.4,1);
  const dT=at(el('div','a',sc,`<span class="chip" style="color:${C.coral}">+٣ أسابيع</span>`),1388,890,320);dT.style.textAlign='left';
  const dC=at(el('div','a',sc,`<span class="chip" style="color:${C.coral}">+٦٠ ألف ر.س</span>`),212,890,320);dC.style.textAlign='right';
  popIn([dT,dC],27.7,{from:.6,s:.15});cue('pop',27.7,.6);cue('pop',27.85,.6);
  const qr=q.querySelector('.qring'),qs=q.querySelector('span');
  [27.9,29.3].forEach(t=>{tl.set(qr,{opacity:1,scale:1},t);tl.to(qr,{scale:1.55,opacity:0,duration:1.2,ease:'power2.out'},t);});
  tl.to(qs,{opacity:1,duration:.4},28.0);tl.to(q,{borderColor:'rgba(255,107,94,.75)',duration:.4},28.0);
  caption('النطاق والوقت والتكلفة قيود مترابطة، والجودة في قلبها تتأثر بها جميعاً.',21.0,4.9);
  caption('فإذا اتّسع النطاق امتد الوقت وزادت التكلفة، لذلك يمر كل تغيير بتقييم أثره قبل اعتماده.',26.3,5.6);
  sceneOut(sc,32.3);sweep(32.5);
}

/* ============ S3 · دورة حياة المشروع (33 – 45) ============ */
{
  const sc=scene('s3',33.0,45.0,43.4);
  const hd=heading(sc,33.3,'٣','دورة حياة المشروع','خمس مجموعات عمليات، من البداية إلى النهاية');
  const s=svgIn(sc);
  const N=[{x:1540,y:440,n:'١',t:'البدء',d:'تحديد الهدف واعتماد المشروع'},{x:1150,y:440,n:'٢',t:'التخطيط',d:'كيف سننجز العمل؟'},{x:770,y:440,n:'٣',t:'التنفيذ',d:'تحويل الخطة إلى واقع'},{x:960,y:740,n:'٤',t:'المراقبة والتحكم',d:'قياس الأداء وتصحيح المسار'},{x:380,y:440,n:'٥',t:'الإغلاق',d:'التسليم والتوثيق'}];
  const A=[['M1448 440 H1246',1246,440],['M1058 440 H866',866,440],['M678 440 H486',486,440]].map(([d,x,y])=>({p:prep(path(s,d,C.line,2)),h:ah(s,x,y,180)}));
  const L1={p:prep(path(s,'M815 518 C830 610 845 680 877 709',C.dim,2)),h:ah(s,877,709,42,C.dim)};
  const L2={p:prep(path(s,'M1045 709 C1075 680 1090 610 1105 518',C.dim,2)),h:ah(s,1105,518,-81,C.dim)};
  const tp=sv('path',{d:'M1540 440 L1150 440 L770 440 C790 560 860 740 960 740 C1060 740 1130 560 1150 440 L770 440 L380 440',fill:'none',stroke:'none'},s);
  const tg=sv('g',{opacity:0},s);sv('circle',{r:28,fill:'rgba(255,181,71,.2)'},tg);sv('circle',{r:11,fill:C.amber},tg);
  const nodes=N.map(o=>{const d=at(el('div','a node',sc),o.x-80,o.y-80);d.innerHTML=`<div class="nd-g"></div><div class="nd-c"><span class="nd-n">${o.n}</span></div><div class="nd-l"><b>${o.t}</b><span>${o.d}</span></div>`;return d;});
  const ll1=at(el('div','a lbl',sc,'قياس الأداء'),640,600,160);ll1.style.textAlign='right';
  const ll2=at(el('div','a lbl',sc,'تصحيح المسار'),1122,600,180);ll2.style.textAlign='left';
  const tt=[34.0,34.55,35.1,36.3,35.65];
  nodes.forEach((n,i)=>{tl.fromTo(n,{opacity:0,scale:.4},{opacity:1,scale:1,duration:.7,ease:'back.out(1.8)'},tt[i]);cue('pop',tt[i],.7);});
  A.forEach((a,k)=>{draw(a.p,34.3+k*.55,.35,'power2.out');show(a.h,34.62+k*.55,.12);});
  draw(L1.p,36.6,.5);show(L1.h,37.05,.12);draw(L2.p,36.85,.5);show(L2.h,37.3,.12);
  fadeUp([ll1,ll2],37.1,{y:8,s:.15});
  const P3={p:0},tlen=tp.getTotalLength();
  tl.to(tg,{opacity:1,duration:.3},37.5);tl.fromTo(P3,{p:0},{p:1,duration:5.3,ease:'power1.inOut'},37.6);tl.to(tg,{opacity:0,duration:.3},42.9);
  // node pass cues
  {const passes=[];let last=-1;for(let i=0;i<=400;i++){const p=i/400,pt=tp.getPointAtLength(p*tlen);N.forEach((o,k)=>{if(Math.hypot(pt.x-o.x,pt.y-o.y)<6&&!(passes.length&&passes[passes.length-1].k===k)){passes.push({k,p});}});}
   passes.forEach(o=>{if(o.p>.01)cue('blip',37.6+5.3*invQuad(o.p),.7);});}
  R.tok=t=>{const vis=t>=37.5&&t<=43.2;const pt=tp.getPointAtLength(P3.p*tlen);tg.setAttribute('transform',`translate(${pt.x} ${pt.y})`);nodes.forEach((n,i)=>{const d=Math.hypot(pt.x-N[i].x,pt.y-N[i].y);n.firstChild.style.opacity=vis?clamp(1-(d-30)/130,0,1):0;});};
  R.tok(0);
  caption('يمرّ كل مشروع بخمس مجموعات من العمليات، تبدأ بالبدء وتنتهي بالإغلاق.',34.2,5.0);
  caption('والمراقبة والتحكم تعمل طوال الطريق: تقيس التنفيذ، وتعيد ضبط الخطة كلما انحرف المسار.',39.4,4.2);
  // morph → phase tracker
  tl.to(hd,{opacity:0,y:-18,duration:.4,ease:'power2.in'},43.3);
  tl.to([s,ll1,ll2],{opacity:0,duration:.35},43.4);
  tl.to(nodes.map(n=>n.querySelector('.nd-l')),{opacity:0,duration:.3},43.4);
  tl.to(nodes.map(n=>n.querySelector('.nd-n')),{opacity:0,duration:.3},43.4);
  if(!RM)tl.to(sc,{scale:1,duration:1.1,ease:'power3.inOut'},43.6);
  nodes.forEach((n,i)=>tl.to(n,{left:TRK[i]-80,top:TRKY-80,scale:24/160,duration:1.1,ease:'power3.inOut'},43.6+i*.04));
  tl.to(nodes.map(n=>n.querySelector('.nd-c')),{borderColor:C.faint,borderWidth:13,duration:.9},43.7);
  tl.to(trk,{opacity:1,duration:.25},44.75);
  tl.to(nodes,{opacity:0,duration:.25},44.8);
  cue('whoosh',43.6,.55);
}
phCur(0,45.2);phDone(0,57.2);phCur(1,57.2);phDone(1,82.2);phCur(2,82.2);phDone(2,93.2);phCur(3,93.2);phDone(3,118.2);phCur(4,118.2);phDone(4,125.9);
tl.to(trk,{opacity:0,duration:.5},127.3);

/* ============ S4 · البدء (45 – 57) ============ */
{
  const sc=scene('s4',45.0,57.0,56.3);
  heading(sc,45.3,'٤','البدء','لماذا نبدأ هذا المشروع؟ ومن يهمّه أمره؟');
  const rows=[['اسم المشروع','إطلاق متجر إلكتروني'],['الهدف','رفع المبيعات الرقمية ٣٠٪ خلال عام'],['الراعي','المدير التنفيذي'],['الميزانية','٤٨٠٬٠٠٠ ر.س'],['المدة','١٣ أسبوعاً'],['معيار النجاح','١٬٠٠٠ طلب في الشهر الأول']];
  const ch=at(el('div','a charter brk',sc),1010,250,770,640);
  ch.innerHTML=`<div class="ch-h"><b>ميثاق المشروع</b><span>PC-001 · REV 1.0</span></div><div class="ch-rule"></div>${rows.map(r=>`<div class="ch-r"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('')}<div class="ch-sig"><span>اعتماد الراعي</span><svg width="270" height="70" viewBox="0 0 270 70"><path class="sig" d="M10 52 C28 8 50 6 44 38 C40 60 18 60 30 42 C46 20 70 28 72 46 C74 60 88 40 98 30 C108 20 110 52 122 46 C134 40 138 18 154 24 C172 32 150 60 176 50 C200 40 212 22 226 30 C238 38 230 50 246 42 L264 34" fill="none" stroke="#E6EFF8" stroke-width="2.4" stroke-linecap="round"/></svg></div>`;
  const stamp=el('div','a stamp',ch,'<b>معتمد</b><small>مكتب إدارة المشاريع</small>');stamp.style.left='64px';stamp.style.bottom='40px';
  tl.fromTo(ch,{opacity:0,y:50,rotation:1.2},{opacity:1,y:0,rotation:0,duration:.9},45.8);cue('swish',45.8,.7);
  tl.fromTo(ch.querySelector('.ch-rule'),{scaleX:0},{scaleX:1,duration:.6,ease:'power2.inOut'},46.3);
  $$('.ch-r',ch).forEach((r,i)=>{const t=46.6+i*.42;tl.fromTo(r,{opacity:0,x:24},{opacity:1,x:0,duration:.35},t);tl.fromTo(r.lastChild,{clipPath:'inset(0% 0% 0% 100%)'},{clipPath:'inset(0% 0% 0% 0%)',duration:.55,ease:'power2.out'},t+.1);cue('type',t+.1,.55);});
  const sig=prep(ch.querySelector('.sig'));
  fadeUp(ch.querySelector('.ch-sig span'),49.3,{y:6});draw(sig,49.5,1.0,'power2.inOut');cue('scribble',49.5,1);
  tl.fromTo(stamp,{opacity:0,scale:2.5,rotation:-34},{opacity:.93,scale:1,rotation:-14,duration:.3,ease:'power4.in'},50.65);cue('stamp',50.95);shake(50.95);
  // stakeholder grid
  const s=svgIn(sc);
  const ax1=prep(path(s,'M790 810 V292',C.line,2)),ax2=prep(path(s,'M790 810 H152',C.line,2));
  const h1=ah(s,790,288,-90),h2=ah(s,148,810,180);
  const q1=path(s,'M470 300 V800',C.faint,1.2,{'stroke-dasharray':'6 8',opacity:0}),q2=path(s,'M160 550 H780',C.faint,1.2,{'stroke-dasharray':'6 8',opacity:0});
  draw([ax1,ax2],51.2,.7,'power2.out');show([h1,h2],51.85,.2);tl.to([q1,q2],{opacity:1,duration:.5},51.7);
  const axl1=at(el('div','a lbl',sc,'قوة التأثير'),806,276,190);axl1.style.textAlign='left';
  const axl2=at(el('div','a lbl',sc,'الاهتمام'),150,826,200);axl2.style.textAlign='left';
  const QL=[['إدارة عن قرب',168,312,'left',C.amber],['إبقاء راضين',572,312,'right'],['إبقاء مطّلعين',168,766,'left'],['مراقبة فقط',572,766,'right']].map(([t,x,y,al,col])=>{const d=at(el('div','a ql',sc,t),x,y,200);d.style.textAlign=al;if(col)d.style.color=col;return d;});
  fadeUp(QL,51.9,{y:8,s:.1});fadeUp([axl1,axl2],52.0,{y:6});
  [['الراعي',300,372,C.amber],['فريق التطوير',318,470,C.sky],['الإدارة المالية',640,420,C.sky],['العملاء',300,680,C.sky],['مزوّد الدفع',640,690,C.faint]].forEach(([n,x,y,col],i)=>{
    const c=at(el('div','a sh',sc,`<i style="background:${col}"></i>${n}`),x,y);gsap.set(c,{xPercent:-50,yPercent:-50});
    tl.fromTo(c,{opacity:0,x:-160,y:30,scale:.8},{opacity:1,x:0,y:0,scale:1,duration:.75,ease:'back.out(1.5)'},52.4+i*.32);cue('pop',52.5+i*.32,.55);});
  caption('في البدء نجيب عن سؤال «لماذا؟»، ونوثّق الهدف والميزانية والمدة في ميثاق يعتمده الراعي.',45.9,5.1);
  caption('ثم نرسم خريطة أصحاب المصلحة حسب تأثيرهم واهتمامهم، لنعرف كيف نتواصل مع كل طرف.',51.3,4.8);
  sceneOut(sc,56.3);sweep(56.5);
}

/* ============ S5 · التخطيط: WBS (57 – 68.3) ============ */
const WP=[['١٫١','جمع المتطلبات',0,2,1],['١٫٢','دراسة المنافسين',0,1,0],['٢٫١','تجربة المستخدم',2,3,1],['٢٫٢','الهوية البصرية',2,2,0],['٣٫١','الواجهة الأمامية',5,4,1],['٣٫٢','الأنظمة الخلفية',2,4,0],['٣٫٣','بوابات الدفع',6,2,0],['٤٫١','الاختبار والجودة',9,2,1],['٤٫٢','الحملة التسويقية',11,2,1]];
const RY=i=>300+i*58,GX=w=>1460-w*95;
const wpHTML=w=>`<span class="c">${w[0]}</span><b>${w[1]}</b>`;
{
  const sc=scene('s5',57.0,68.35,66.9);
  const hd=heading(sc,57.3,'٥','التخطيط: تجزئة العمل','هيكل تجزئة العمل WBS يحوّل النطاق إلى حزم قابلة للإدارة');
  const s=svgIn(sc);
  const root=at(el('div','a wb wb-root',sc,'<span class="c">٠</span>المتجر الإلكتروني'),770,262,380,72);
  const L1X=[1500,1140,780,420],L1N=[['١','التحليل'],['٢','التصميم'],['٣','التطوير'],['٤','الإطلاق']];
  const l1=L1X.map((x,k)=>at(el('div','a wb wb-l1',sc,`<span class="c">${L1N[k][0]}</span>${L1N[k][1]}`),x-150,400,300,62));
  const c0=prep(path(s,'M960 334 V366',C.line,1.6));
  const bR=prep(path(s,'M960 366 H1500',C.line,1.6)),bL=prep(path(s,'M960 366 H420',C.line,1.6));
  const drops=L1X.map(x=>prep(path(s,`M${x} 366 V400`,C.line,1.6)));
  const groups=[[0,1],[2,3],[4,5,6],[7,8]],LY=[520,584,648];
  const spines=[],ticks=[],leaves=[];
  groups.forEach((g,k)=>{const x=L1X[k];spines.push(prep(path(s,`M${x+120} 462 V${LY[g.length-1]}`,C.dim,1.4)));g.forEach((wi,j)=>{ticks.push(prep(path(s,`M${x+120} ${LY[j]} H${x+100}`,C.dim,1.4)));leaves[wi]=at(el('div','a wp',sc,wpHTML(WP[wi])),x-180,LY[j]-25,280,50);});});
  popIn(root,58.0,{from:.6,ease:'back.out(1.7)'});cue('pop',58.0,.7);
  draw(c0,58.35,.25,'power1.in');draw([bR,bL],58.6,.5,'power2.out');draw(drops,59.05,.2,'power1.out');
  l1.forEach((b,k)=>{popIn(b,59.2+k*.12,{from:.6,ease:'back.out(1.7)'});cue('blip',59.2+k*.12,.6);});
  draw(spines,59.8,.35,'power1.inOut');draw(ticks,60.1,.15,'none',.05);
  leaves.forEach((lf,i)=>{fadeUp(lf,60.1+i*.1,{y:12,b:4,d:.45});cue('blip',60.1+i*.1,.35);});
  const brk=prep(path(s,'M1600 694 V708 H240 V694',C.amber,1.5));draw(brk,63.1,.8,'power2.inOut');
  const rl=at(el('div','a ctr',sc,`<span style="color:${C.amber};font-weight:600">٩ حزم عمل</span> · قاعدة ١٠٠٪: مجموع الحزم يساوي نطاق المشروع كاملاً`),0,726,1920);rl.style.font='400 24px/1.3 var(--fb)';
  fadeUp(rl,63.6,{y:10});
  tl.to(leaves,{borderColor:'rgba(255,181,71,.9)',duration:.18,stagger:.06},62.3);tl.to(leaves,{borderColor:'rgba(150,192,235,.32)',duration:.4,stagger:.06},63.2);
  caption('نبدأ التخطيط بتفكيك النطاق إلى أجزاء أصغر، حتى نصل إلى حزم عمل يمكن تقديرها وإسنادها.',58.0,4.7);
  caption('ومجموع هذه الحزم يغطي نطاق المشروع كاملاً، دون زيادة أو نقص.',62.9,3.9);
  // morph → Gantt rows
  tl.to(hd,{opacity:0,y:-18,duration:.35,ease:'power2.in'},66.8);
  tl.to([root,...l1,s,rl],{opacity:0,duration:.35},66.8);
  if(!RM)tl.to(sc,{scale:1,duration:1.0,ease:'power3.inOut'},66.95);
  leaves.forEach((lf,i)=>tl.to(lf,{left:1510,top:RY(i)-22,width:330,height:44,duration:1.0,ease:'power3.inOut'},66.95+i*.025));
  cue('whoosh',66.95,.5);
}

/* ============ S6 · الجدول والمسار الحرج (68.3 – 82) ============ */
{
  const sc=scene('s6',68.3,82.0,81.3);
  heading(sc,68.4,'٦','التخطيط: الجدول الزمني','مخطط جانت، والاعتماديات، والمسار الحرج');
  const labels=WP.map((w,i)=>at(el('div','a wp',sc,wpHTML(w)),1510,RY(i)-22,330,44));
  const s=svgIn(sc);
  const gl=[];for(let w=0;w<=13;w++)gl.push(path(s,`M${GX(w)} 264 V792`,'rgba(150,192,235,.13)',1,{opacity:0}));
  const hl=path(s,'M1840 264 H225','rgba(150,192,235,.35)',1,{opacity:0});
  const hdr=at(el('div','a lbl',sc,'حزمة العمل'),1510,234,330);hdr.style.cssText+=';text-align:right;font-size:18px;padding-right:16px';
  const wks=[];for(let w=1;w<=13;w++)wks.push(at(el('div','a wk',sc,ar(w)),GX(w),238,95));
  const wkl=at(el('div','a lbl',sc,'الأسبوع'),96,236,120);wkl.style.cssText+=';text-align:right;font-size:18px';
  tl.to([...gl,hl],{opacity:1,duration:.6,stagger:.02},68.6);fadeUp([hdr,...wks,wkl],68.7,{y:8,s:.03,d:.4});
  const order=WP.map((w,i)=>i).sort((a,b)=>WP[a][2]-WP[b][2]||a-b);
  const bars=WP.map((w,i)=>at(el('div','a bar',sc),GX(w[2]+w[3]),RY(i)-13,w[3]*95,26));
  order.forEach((i,k)=>{tl.fromTo(bars[i],{scaleX:0},{scaleX:1,duration:.55,ease:'power3.out'},69.3+k*.27);cue('blip',69.3+k*.27,.45);});
  const DEP=[[0,2],[2,4],[4,7],[7,8],[5,6],[6,7]],CRIT=new Set(['0-2','2-4','4-7','7-8']);
  const deps=DEP.map(([a,b])=>{const wa=WP[a],wb=WP[b];const xe=GX(wa[2]+wa[3]),ya=RY(a),xs=GX(wb[2]),yb=RY(b);let d,hx,hy,ang;
    if(Math.abs(xe-xs)<1){d=`M${xe} ${ya+13} V${yb-15}`;hx=xe;hy=yb-15;ang=90;}else{d=`M${xe} ${ya+13} V${yb} H${xs+4}`;hx=xs+4;hy=yb;ang=180;}
    return {p:prep(path(s,d,C.dim,1.6)),h:ah(s,hx,hy,ang,C.dim,1.6),crit:CRIT.has(a+'-'+b)};});
  deps.forEach((o,k)=>{draw(o.p,72.0+k*.18,.4,'power2.inOut');show(o.h,72.38+k*.18,.12);});
  [[5,'اعتماد التصميم'],[13,'الإطلاق']].forEach(([w,t],k)=>{const x=GX(w);
    const ml=path(s,`M${x} 270 V812`,'rgba(255,181,71,.55)',1.2,{'stroke-dasharray':'4 6',opacity:0});
    const dm=sv('path',{d:`M${x} 818 L${x+11} 829 L${x} 840 L${x-11} 829Z`,fill:C.amber},s);
    const lb=at(el('div','a ms',sc,t),x-100,850,200);
    tl.to(ml,{opacity:1,duration:.4},73.3+k*.25);popIn(dm,73.3+k*.25,{ease:'back.out(3)'});fadeUp(lb,73.4+k*.25,{y:6});cue('pop',73.3+k*.25,.6);});
  // critical path
  const nonc=bars.filter((b,i)=>!WP[i][4]),cb=bars.filter((b,i)=>WP[i][4]);
  tl.to(nonc,{opacity:.32,duration:.5},74.3);
  tl.to(cb,{backgroundColor:'rgba(255,107,94,.82)',borderColor:C.coral,duration:.5},74.3);
  deps.forEach(o=>{if(o.crit){tl.to([o.p,o.h.firstChild],{stroke:C.coral,duration:.4},74.3);}else tl.to([o.p,o.h],{opacity:.35,duration:.4},74.4);});
  tl.to(labels.filter((l,i)=>WP[i][4]).map(l=>l.firstChild),{color:C.coral,duration:.4},74.3);
  const cp=prep(path(s,`M${GX(0)} ${RY(0)} H${GX(2)} V${RY(2)} H${GX(5)} V${RY(4)} H${GX(9)} V${RY(7)} H${GX(11)} V${RY(8)} H${GX(13)}`,'#FFD9D3',3));
  cp.style.filter='drop-shadow(0 0 6px rgba(255,107,94,.95))';
  const pd=sv('g',{opacity:0},s);sv('circle',{r:16,fill:'rgba(255,107,94,.35)'},pd);sv('circle',{r:7,fill:'#fff'},pd);
  const P6={p:0},cpl=cp.getTotalLength();
  draw(cp,75.0,3.0,'power1.inOut');tl.fromTo(P6,{p:0},{p:1,duration:3.0,ease:'power1.inOut'},75.0);
  tl.to(pd,{opacity:1,duration:.2},74.9);tl.to(pd,{opacity:0,duration:.4},78.1);cue('shimmer',75.0,1);
  R.crit=()=>{const pt=cp.getPointAtLength(P6.p*cpl);pd.setAttribute('transform',`translate(${pt.x} ${pt.y})`);};R.crit();
  const dmn=prep(path(s,`M${GX(0)} 905 H${GX(13)}`,C.coral,1.5)),dt1=prep(path(s,`M${GX(0)} 893 V917`,C.coral,1.5)),dt2=prep(path(s,`M${GX(13)} 893 V917`,C.coral,1.5));
  draw(dmn,78.0,.6,'power2.out');draw([dt1,dt2],78.0,.2);
  const dml=at(el('div','a ctr',sc,`<span class="chip" style="color:${C.coral};font-size:20px;padding:5px 14px">المسار الحرج = ١٣ أسبوعاً</span>`),(GX(0)+GX(13))/2-220,887,440);
  popIn(dml,78.3,{from:.6});cue('pop',78.3,.6);
  const flts=WP.map((w,i)=>w[4]?null:at(el('div','a flt',sc,'فائض'),GX(w[2]+w[3]+1),RY(i)-13,95,26)).filter(Boolean);
  tl.to(flts,{opacity:1,duration:.4,stagger:.08},78.7);cue('blip',78.7,.4);
  caption('نرتّب حزم العمل على محور الزمن، ونربط كل مهمة بالمهمة التي تعتمد عليها.',69.0,5.0);
  caption('أطول سلسلة من المهام المترابطة هي «المسار الحرج»، وأي تأخير فيها يؤخّر الإطلاق.',74.2,4.2);
  caption('أما بقية المهام فلديها فائض زمني يمنح الخطة مرونة.',78.5,2.8);
  sceneOut(sc,81.3);sweep(81.5);
}

/* ============ S7 · التنفيذ: كانبان (82 – 93) ============ */
{
  const sc=scene('s7',82.0,93.0,92.3);
  heading(sc,82.3,'٧','التنفيذ','الفريق يعمل، ولوحة كانبان تُظهر حالة كل مهمة');
  const COLS=[{n:'للتنفيذ',r:1720},{n:'قيد العمل',r:1340,wip:1},{n:'مراجعة',r:960},{n:'منجز',r:580}];
  const colEl=COLS.map(c=>{const d=at(el('div','a kcol',sc),c.r-360,250,360,580);d.innerHTML=`<div class="kh"><b>${c.n}</b><span class="cnt">٠</span>${c.wip?'<span class="wip">الحد ٣</span>':''}</div>`;return d;});
  const cnts=colEl.map(d=>d.querySelector('.cnt')),wipEl=colEl[1].querySelector('.wip');
  const CARDS=[['صفحة المنتج','٣٫١','ر',C.sky],['سلة المشتريات','٣٫١','م',C.sky],['واجهة الطلبات','٣٫٢','س',C.amber],['ربط بوابة الدفع','٣٫٣','ع',C.coral],['لوحة تحكم التاجر','٣٫٢','ن',C.amber],['إشعارات الطلب','٣٫٢','س',C.amber],['اختبار الأداء','٤٫١','ل',C.mint]];
  const cpos=(ci,k)=>({left:COLS[ci].r-340,top:330+k*96});
  const state=[[2,3,4,5,6],[0,1],[],[]];
  const cardEl=CARDS.map(c=>el('div','a kc',sc,`<div class="tx"><div class="c"><i style="background:${c[3]}"></i>${c[1]}</div><b>${c[0]}</b></div><div class="av" style="background:#C9D8E8">${c[2]}</div><div class="ok"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="#0A1E33" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`));
  state.forEach((col,ci)=>col.forEach((id,k)=>{const p=cpos(ci,k);at(cardEl[id],p.left,p.top);}));
  colEl.forEach((d,i)=>fadeUp(d,82.6+i*.1,{y:20,b:4,d:.55}));
  tl.fromTo([...state[1],...state[0]].map(i=>cardEl[i]),{opacity:0,y:-40},{opacity:1,y:0,duration:.5,stagger:.07,ease:'back.out(1.4)'},83.1);
  for(let k=0;k<7;k++)cue('blip',83.15+k*.07,.3);
  const kp=at(el('div','a kprog',sc,'<span>المنجز: ٠ من ٧</span><div class="tr"><i></i></div>'),220,852,1500,26);
  const prog=kp.querySelector('.tr i'),kpl=kp.querySelector('span');fadeUp(kp,83.6,{y:10});
  const SNAP=[{t:0,c:[5,2,0,0],d:0}];let doneN=0;
  [[84.6,0,2],[85.4,2,1],[86.2,0,3],[87.0,1,2],[87.8,3,1],[88.6,1,3],[89.4,4,1],[90.2,2,2],[90.9,2,3]].forEach(([t,id,to])=>{
    const from=state.findIndex(c=>c.includes(id));state[from].splice(state[from].indexOf(id),1);state[to].push(id);
    const p=cpos(to,state[to].length-1),c=cardEl[id];
    tl.set(c,{zIndex:20},t);
    tl.to(c,{scale:1.06,rotation:-2.5,boxShadow:'0 26px 44px rgba(0,0,0,.5)',duration:.16,ease:'power2.out'},t);
    tl.to(c,{left:p.left,top:p.top,duration:.5,ease:'power3.inOut'},t+.1);
    tl.to(c,{scale:1,rotation:0,boxShadow:'0 4px 10px rgba(0,0,0,.25)',duration:.2,ease:'power2.out'},t+.58);
    tl.set(c,{zIndex:1},t+.8);
    state[from].forEach((oid,k)=>{tl.to(cardEl[oid],{top:cpos(from,k).top,duration:.35,ease:'power2.inOut'},t+.3);});
    cue('swish',t,.45);cue('drop',t+.58,.5);
    if(to===3){doneN++;tl.to(c.querySelector('.ok'),{opacity:1,duration:.25},t+.62);tl.to(c,{backgroundColor:'#0D2842',duration:.3},t+.62);tl.to(prog,{scaleX:doneN/7,duration:.5,ease:'power2.out'},t+.62);cue('tick',t+.64,.75);}
    SNAP.push({t:t+.58,c:state.map(x=>x.length),d:doneN});
  });
  tl.to(wipEl,{borderColor:C.amber,color:C.amber,backgroundColor:'rgba(255,181,71,.14)',duration:.25},89.95);cue('alert',89.95,.5);
  tl.to(wipEl,{borderColor:'rgba(150,192,235,.45)',color:C.dim,backgroundColor:'rgba(0,0,0,0)',duration:.3},90.75);
  R.kan=t=>{let s=SNAP[0];for(const x of SNAP)if(x.t<=t)s=x;cnts.forEach((e,i)=>{const v=ar(s.c[i]);if(e.textContent!==v)e.textContent=v;});const tx=`المنجز: ${ar(s.d)} من ٧`;if(kpl.textContent!==tx)kpl.textContent=tx;};
  R.kan(0);
  caption('في التنفيذ يتحول الجدول إلى عمل يومي، وتُظهر لوحة كانبان حالة كل مهمة لحظة بلحظة.',83.0,5.0);
  caption('وحدّ العمل الجاري يمنع تكدّس المهام، فيبقى تركيز الفريق على الإنجاز.',88.2,4.0);
  sceneOut(sc,92.3);sweep(92.5);
}

/* ============ S8 · المراقبة والتحكم (93 – 118) ============ */
{
  const sc=scene('s8',93.0,118.0,117.3);
  heading(sc,93.3,'٨','المراقبة والتحكم','القيمة المكتسبة، وإدارة المخاطر');
  const A=el('div','layer',sc),Bl=el('div','layer',sc);
  const s=svgIn(A);
  const CX=w=>1760-w*(860/14),CY=v=>800-v;
  const ay=prep(path(s,'M1760 800 V290',C.line,1.6)),ax=prep(path(s,'M1760 800 H896',C.line,1.6));
  draw([ay,ax],93.9,.7,'power2.out');
  const gls=[100,200,300,400,500].map(v=>path(s,`M1760 ${CY(v)} H900`,'rgba(150,192,235,.12)',1,{opacity:0}));
  tl.to(gls,{opacity:1,duration:.5,stagger:.05},94.2);
  const yl=[100,200,300,400,500].map(v=>{const e=at(el('div','a ax',A,ar(v)),1772,CY(v)-9,70);e.style.textAlign='left';return e;});
  const yu=at(el('div','a ax',A,'ألف ر.س'),1772,256,120);yu.style.textAlign='left';
  const xl=[0,2,4,6,8,10,12,14].map(w=>at(el('div','a ax ctr',A,ar(w)),CX(w)-30,814,60));
  const xu=at(el('div','a ax',A,'الأسبوع'),800,814,86);xu.style.textAlign='right';
  fadeUp([...yl,yu,...xl,xu],94.3,{y:6,s:.02,d:.4});
  const bac=path(s,`M1760 ${CY(480)} H900`,C.amber,1.5,{'stroke-dasharray':'8 7'});
  clipRTL(s,[bac],1780,880,94.7,.8);
  const bacl=at(el('div','a',A,'الميزانية المعتمدة BAC · ٤٨٠ ألف'),900,286,420);bacl.style.cssText+=`;text-align:left;font:500 18px/1 var(--fb);color:${C.amber}`;
  fadeUp(bacl,95.2,{y:6});
  const PV=[0,15,35,65,105,150,200,255,310,360,405,440,465,480],EV=[0,14,32,58,95,138,180],AC=[0,16,38,68,110,160,210];
  const pts=a=>a.map((v,w)=>[CX(w),CY(v)]);
  const pvA=sv('path',{d:smooth(pts(PV))+` L${CX(13)} 800 L${CX(0)} 800Z`,fill:'rgba(108,194,255,.08)',opacity:0},s);
  const pvP=prep(path(s,smooth(pts(PV)),C.sky,3)),evP=prep(path(s,smooth(pts(EV)),C.mint,3)),acP=prep(path(s,smooth(pts(AC)),C.coral,3));
  draw(pvP,95.0,1.6,'power2.inOut');tl.to(pvA,{opacity:1,duration:.8},95.9);cue('swipe',95.0,.5);
  const tx=CX(6);
  const today=path(s,`M${tx} 800 V296`,C.line,1.2,{'stroke-dasharray':'3 5',opacity:0});tl.to(today,{opacity:.8,duration:.4},96.4);
  const tdl=at(el('div','a ctr',A,'<span class="chip" style="font-size:18px;padding:5px 12px;color:#E6EFF8">اليوم · الأسبوع ٦</span>'),tx-130,252,260);
  popIn(tdl,96.4,{from:.7});cue('blip',96.4,.5);
  draw([evP,acP],96.8,1.3,'power2.inOut');cue('swipe',96.8,.5);
  const vd=[[PV[6],C.sky],[EV[6],C.mint],[AC[6],C.coral]].map(([v,c])=>sv('circle',{cx:tx,cy:CY(v),r:7,fill:c,stroke:'#0A1E33','stroke-width':2},s));
  popIn(vd,98.0,{s:.1,ease:'back.out(3)'});
  const cbx=at(el('div','a cbox brk',A,`<b>في الأسبوع ٦</b>${[['المخطط','PV','٢٠٠',C.sky],['المنجز','EV','١٨٠',C.mint],['المصروف','AC','٢١٠',C.coral]].map(r=>`<div class="cr"><i style="background:${r[3]}"></i><span>${r[0]}</span><em>${r[1]}</em><strong>${r[2]} ألف</strong></div>`).join('')}`),1086,622,276);
  fadeUp(cbx,98.2,{y:14});cue('pop',98.2,.5);
  const lg=at(el('div','a leg',A,`<span><i style="background:${C.sky}"></i>القيمة المخططة PV</span><span><i style="background:${C.mint}"></i>القيمة المكتسبة EV</span><span><i style="background:${C.coral}"></i>التكلفة الفعلية AC</span>`),900,858,860);
  fadeUp(lg,98.4,{y:8});
  const K={spi:0,cpi:0,eac:0};
  const KP=[['مؤشر أداء الجدول','SPI = EV ÷ PV',C.amber,'متأخر ١٠٪ عن الخطة',C.amber],['مؤشر أداء التكلفة','CPI = EV ÷ AC',C.coral,'كل ريال يحقق ٠٫٨٦ من القيمة',C.coral],['التكلفة المتوقعة عند الإنجاز','EAC = BAC ÷ CPI',C.line,'+٨٠ ألف فوق الميزانية',C.amber]];
  const tiles=KP.map((k,i)=>at(el('div','a kpi brk',A,`<div><div class="nm">${k[0]}</div><div class="st" style="color:${k[4]};margin-top:10px">${k[3]}</div></div><div class="v" style="color:${k[2]}">٠</div><div class="fx">${k[1]}</div>`),140,280+i*168,620,150));
  const kv=tiles.map(d=>d.querySelector('.v'));
  tiles.forEach((d,i)=>{fadeUp(d,99.3+i*.35,{y:24,b:6});cue('pop',99.3+i*.35,.5);});
  tl.to(K,{spi:.9,duration:1.2,ease:'power2.out'},99.5);tl.to(K,{cpi:.857,duration:1.2,ease:'power2.out'},99.85);tl.to(K,{eac:560,duration:1.3,ease:'power2.out'},100.2);
  cue('count',99.5,1.2);
  R.kpi=()=>{kv[0].textContent=fmt(K.spi,2);kv[1].textContent=fmt(K.cpi,2);kv[2].innerHTML=fmt(K.eac,0)+'<small style="font-size:26px;font-weight:500;margin-right:10px">ألف</small>';};R.kpi();
  const cc=at(el('div','a',A,`<span class="chip" style="color:${C.mint};font-size:20px">إجراء تصحيحي: تنفيذ متوازٍ للاختبار، ومراجعة أسبوعية للتكلفة</span>`),140,796,760);
  popIn(cc,102.6,{from:.8});cue('alert',102.6,.6);
  const FC=[[6,180],[8,262],[10,345],[12,425],[14,480]];
  const fcP=path(s,smooth(FC.map(([w,v])=>[CX(w),CY(v)])),C.mint,2.5,{'stroke-dasharray':'9 8'});
  clipRTL(s,[fcP],1400,880,102.9,1.6);cue('swipe',102.9,.5);
  const fcl=at(el('div','a',A,'بعد التصحيح: الإنجاز في الأسبوع ١٤'),906,496,380);fcl.style.cssText+=`;text-align:left;font:500 18px/1 var(--fb);color:${C.mint}`;
  fadeUp(fcl,104.2,{y:6});
  caption('نقيس الأداء بمقارنة ثلاث قيم: ما خططنا لإنجازه، وما أنجزناه فعلاً، وما صرفناه.',94.0,5.0);
  caption('مؤشر الجدول ٠٫٩٠ ومؤشر التكلفة ٠٫٨٦: المشروع متأخر، ويتجاوز ميزانيته.',99.2,4.3);
  caption('فنتخذ إجراءً تصحيحياً مبكراً، قبل أن تتسع الفجوة.',103.7,2.7);
  tl.to(A,{opacity:0,x:-60,filter:'blur(10px)',duration:.5,ease:'power2.in'},106.5);tl.set(A,{visibility:'hidden'},107.0);cue('whoosh',106.5,.5);
  // ---- risk matrix
  const mR=760,mB=840;
  const band=v=>v>=15?['rgba(255,107,94,.34)','rgba(255,107,94,.65)']:v>=8?['rgba(255,181,71,.22)','rgba(255,181,71,.5)']:v>=4?['rgba(108,194,255,.12)','rgba(108,194,255,.3)']:['rgba(79,214,164,.1)','rgba(79,214,164,.28)'];
  for(let p=1;p<=5;p++)for(let i=1;i<=5;i++){const [bg,bd]=band(p*i);const c=at(el('div','a cell',Bl,ar(p*i)),mR-p*110,mB-i*110,104,104);c.style.background=bg;c.style.borderColor=bd;tl.fromTo(c,{opacity:0,scale:.6},{opacity:1,scale:1,duration:.45,ease:'back.out(1.7)'},107.1+(p+i)*.045);}
  cue('cascade',107.1,.7);
  const axs=[];
  for(let p=1;p<=5;p++)axs.push(at(el('div','a ax ctr',Bl,ar(p)),mR-p*110,852,104));
  for(let i=1;i<=5;i++){const e=at(el('div','a ax',Bl,ar(i)),772,mB-i*110+42,30);e.style.textAlign='left';axs.push(e);}
  const pl=at(el('div','a lbl ctr',Bl,'الاحتمال ←'),210,882,550);const il=at(el('div','a lbl',Bl,'الأثر ↑'),772,256,120);il.style.textAlign='left';
  fadeUp([...axs,pl,il],107.6,{y:6,s:.02,d:.35});
  const RS=[['ر١','تأخر ربط بوابة الدفع',4,4,'تخفيف · مزوّد احتياطي'],['ر٢','تغيّر المتطلبات أثناء التنفيذ',4,3,'تخفيف · ضبط التغيير'],['ر٣','توقف الخوادم وقت الإطلاق',2,5,'نقل · استضافة بضمان خدمة'],['ر٤','تجاوز الميزانية',3,3,'تخفيف · مراجعة أسبوعية'],['ر٥','تأخر تصوير المنتجات',2,2,'قبول · متابعة دورية']];
  const sev=v=>v>=15?C.coral:v>=8?C.amber:v>=4?C.sky:C.mint;
  let r1dot=null;
  RS.forEach((r,k)=>{const v=r[2]*r[3];
    const row=at(el('div','a rr',Bl,`<span class="bd" style="background:${sev(v)}">${r[0]}</span><div><b>${r[1]}</b><small>الاحتمال ${ar(r[2])} × الأثر ${ar(r[3])} = ${ar(v)}</small></div><span class="sg">${r[4]}</span>`),900,290+k*92,880,78);
    fadeUp(row,108.7+k*.38,{y:16,b:4,d:.5});
    const dot=at(el('div','a rk',Bl,r[0]),mR-r[2]*110+25,mB-r[3]*110+25);dot.style.borderColor=sev(v);if(!k)r1dot=dot;
    tl.fromTo(dot,{opacity:0,x:520,y:-40,scale:.5},{opacity:1,x:0,y:0,scale:1,duration:.75,ease:'power3.out'},108.9+k*.38);cue('pop',109.5+k*.38,.55);});
  const rg=el('div','a',r1dot);rg.style.cssText='inset:-4px;border-radius:50%;border:2px solid #FF6B5E;opacity:0';
  [111.4,112.6].forEach(t=>{tl.set(rg,{opacity:1,scale:1},t);tl.to(rg,{scale:2.2,opacity:0,duration:1.1,ease:'power2.out'},t);});cue('alert',111.4,.5);
  const ST=[['تجنّب','إزالة سبب الخطر'],['نقل','تحميله لطرف آخر'],['تخفيف','تقليل احتماله أو أثره'],['قبول','تحمّله بوعي ومراقبته']];
  const stg=ST.map(([a,b],k)=>{const e=at(el('div','a stg',Bl,`<b>${a}:</b> ${b}`),k%2?900:1340,772+Math.floor(k/2)*40,440);e.style.textAlign='right';return e;});
  fadeUp(stg,112.6,{y:8,s:.15});
  caption('ونراقب المخاطر أيضاً: نقيّم كل خطر باحتماله وأثره، فتتضح الأولويات.',107.6,4.9);
  caption('ولكل خطر استجابة مخططة مسبقاً: تجنّب، أو نقل، أو تخفيف، أو قبول.',112.7,4.4);
  sceneOut(sc,117.3);sweep(117.5);
}

/* ============ S9 · الإغلاق (118 – 128) ============ */
{
  const sc=scene('s9',118.0,128.0,127.3);
  heading(sc,118.3,'٩','الإغلاق','نسلّم، ونوثّق، ونتعلّم');
  const IT=['تسليم المتجر وقبوله رسمياً من العميل','تسوية العقود والمدفوعات مع الموردين','توثيق الدروس المستفادة','أرشفة وثائق المشروع','شكر الفريق وتحرير الموارد'];
  IT.forEach((txt,k)=>{const d=at(el('div','a chk',sc,`<svg viewBox="0 0 46 46"><rect x="1.5" y="1.5" width="43" height="43" fill="none" stroke="#8FA9C4" stroke-width="2"/><path d="M11 24 L19.5 32.5 L35 14" fill="none" stroke="#4FD6A4" stroke-width="4" stroke-linejoin="round"/></svg><span>${txt}</span>`),1000,300+k*92,780,64);
    fadeUp(d,118.9+k*.16,{y:14,b:4,d:.5});
    const tk=prep(d.querySelector('path')),t=120.2+k*.5;draw(tk,t,.32,'power2.out');
    tl.to(d.querySelector('rect'),{stroke:C.mint,duration:.2},t);tl.to(d.querySelector('span'),{color:C.dim,duration:.3},t+.2);cue('tick',t+.05,.8);});
  const MET=[['المدة','+ أسبوع',C.amber,13,14,14,'١٣ أسبوعاً','١٤ أسبوعاً'],['التكلفة','+٣٫٨٪',C.amber,480,498,498,'٤٨٠ ألف ر.س','٤٩٨ ألف ر.س'],['الطلبات في الشهر الأول','+٣٤٪',C.mint,1000,1340,1340,'١٬٠٠٠ طلب','١٬٣٤٠ طلب']];
  const res=at(el('div','a res brk',sc,'<h3>النتائج النهائية</h3>'+MET.map(m=>`<div class="met"><div class="mh"><span>${m[0]}</span><em style="color:${m[2]}">${m[1]}</em></div><div class="mb"><span>المخطط</span><i class="b p" style="width:${Math.round(440*m[3]/m[5])}px"></i><span class="v">${m[6]}</span></div><div class="mb"><span>الفعلي</span><i class="b" style="width:${Math.round(440*m[4]/m[5])}px;background:${m[2]}"></i><span class="v">${m[7]}</span></div></div>`).join('')),140,290,760,520);
  fadeUp(res,119.0,{y:30,b:6});
  $$('.met',res).forEach((m,k)=>{tl.fromTo($$('.b',m),{scaleX:0},{scaleX:1,duration:.7,stagger:.18,ease:'power3.out'},119.9+k*.55);fadeUp($$('.v',m),120.3+k*.55,{y:6,s:.18,d:.35});popIn(m.querySelector('em'),120.6+k*.55,{from:.6});cue('blip',119.9+k*.55,.4);});
  const st=at(el('div','a stamp',sc,'<b style="font-size:25px;white-space:nowrap">تم التسليم</b><small style="font-size:12px">مكتب إدارة المشاريع</small>'),152,744,156,156);
  tl.fromTo(st,{opacity:0,scale:2.4,rotation:-30},{opacity:.93,scale:1,rotation:-10,duration:.3,ease:'power4.in'},124.75);cue('stamp',125.05);shake(125.05,7);
  caption('في الإغلاق نسلّم الناتج، ونحصل على القبول الرسمي، ونسوّي كل الالتزامات.',118.8,4.8);
  caption('ونوثّق الدروس المستفادة، لتبدأ مشاريعنا القادمة من حيث انتهينا.',123.8,3.4);
  sceneOut(sc,127.3);sweep(127.5);
}

/* ============ S10 · المنهجيات (128 – 139) ============ */
{
  const sc=scene('s10',128.0,139.0,138.3);
  heading(sc,128.3,'١٠','المنهجيات','الشلال أم الرشيقة؟');
  const s=svgIn(sc);
  const dv=prep(path(s,'M960 300 V840','rgba(150,192,235,.4)',1.5));draw(dv,128.9,.7,'power2.inOut');
  const orr=at(el('div','a',sc,'أو'),920,520,80,80);orr.style.cssText+=';border-radius:50%;border:1.5px solid rgba(150,192,235,.5);background:#0B2139;display:grid;place-items:center;font:600 26px/1 var(--fd);color:#FFB547';
  popIn(orr,129.4,{from:.5});
  // waterfall
  const wT=at(el('div','a mt-t',sc,'الشلال<small>Waterfall</small>'),1000,236,790);wT.style.textAlign='right';fadeUp(wT,128.8,{y:14});
  const WFS=['المتطلبات','التصميم','التنفيذ','الاختبار','التسليم'];
  const wb=WFS.map((t,k)=>{const r=1790-k*105,top=318+k*92;return {d:at(el('div','a wf',sc,`<i></i><span>${t}</span>`),r-260,top,260,62),r,top};});
  wb.forEach((o,k)=>{fadeUp(o.d,129.2+k*.3,{y:-16,b:4,d:.45});cue('drip',129.2+k*.3,.5);
    if(k<4){const x0=o.r-260,y0=o.top+31,x1=x0-50,y1=wb[k+1].top-2;const p=prep(path(s,`M${x0} ${y0} H${x1} V${y1}`,C.dim,1.6));const h=ah(s,x1,y1,90,C.dim,1.6);draw(p,129.45+k*.3,.25);show(h,129.7+k*.3,.1);}
    tl.to(o.d.querySelector('i'),{scaleX:1,duration:.6,ease:'power2.inOut'},130.9+k*.55);});
  const wD=at(el('div','a mt-d',sc,'مراحل متتابعة، تناسب المتطلبات الثابتة والواضحة'),1000,786,790);wD.style.textAlign='right';fadeUp(wD,131.4,{y:10});
  // agile
  const aT=at(el('div','a mt-t',sc,'الرشيقة<small>Agile · Scrum</small>'),140,236,760);aT.style.textAlign='right';fadeUp(aT,129.5,{y:14});
  const arc=(cx,cy,r,a0,a1)=>{const p=a=>[cx+r*Math.cos(a*Math.PI/180),cy+r*Math.sin(a*Math.PI/180)];const [x0,y0]=p(a0),[x1,y1]=p(a1);return {d:`M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${(a1-a0)>180?1:0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`,end:[x1,y1]};};
  const bigG=sv('g',{},s),smG=sv('g',{},s);
  const a1=arc(520,560,150,-70,245),a2=arc(668,392,34,-60,230);
  const bp=prep(path(bigG,a1.d,C.amber,3)),bh=ah(bigG,a1.end[0],a1.end[1],335,C.amber,3);
  const sp=prep(path(smG,a2.d,C.sky,2)),sh=ah(smG,a2.end[0],a2.end[1],320,C.sky,2);
  draw(bp,130.3,.8,'power2.inOut');show(bh,131.05,.12);draw(sp,130.8,.5);show(sh,131.25,.12);
  tl.fromTo(bigG,{rotation:0,svgOrigin:'520 560'},{rotation:1080,duration:6.6,ease:'none'},131.0);
  tl.fromTo(smG,{rotation:0,svgOrigin:'668 392'},{rotation:2160,duration:6.6,ease:'none'},131.0);
  const spr=at(el('div','a ctr',sc,'<b style="display:block;font:700 38px/1.2 var(--fd)">سبرنت</b><span style="font:400 21px/1.4 var(--fb);color:#8FA9C4">٢–٤ أسابيع</span>'),420,508,200);fadeUp(spr,130.6,{y:10});
  const dl=at(el('div','a lbl ctr',sc,'يومياً'),618,322,100);dl.style.fontSize='17px';fadeUp(dl,131.0,{y:6});
  const bls=[0,1,2].map(k=>at(el('div','a bl',sc),744+k*7,516+k*9,130,70));
  const bll=at(el('div','a lbl ctr',sc,'سجل المنتج'),722,608,180);bll.style.fontSize='18px';
  fadeUp(bls,130.0,{y:-14,b:3,s:.1,d:.4});fadeUp(bll,130.3,{y:6});
  const ai=prep(path(s,'M738 560 H688',C.dim,1.6)),aih=ah(s,688,560,180,C.dim,1.6);draw(ai,131.2,.25);show(aih,131.42,.1);
  const ao=prep(path(s,'M362 560 H322',C.mint,1.6)),aoh=ah(s,322,560,180,C.mint,1.6);draw(ao,131.5,.25);show(aoh,131.72,.1);
  const incs=[1,2,3].map((n,k)=>at(el('div','a inc',sc,`<svg width="18" height="18" viewBox="0 0 18 18"><path d="M3 9.5l4 4 8-9" fill="none" stroke="#4FD6A4" stroke-width="2.4" stroke-linecap="round"/></svg>إصدار ${ar(n)}`),146,480+k*66,170,52));
  incs.forEach((e,k)=>{const t=133.2+k*2.2;tl.fromTo(e,{opacity:0,x:40,scale:.85},{opacity:1,x:0,scale:1,duration:.5,ease:'back.out(1.8)'},t);cue('chime',t,k);});
  const aD=at(el('div','a mt-d',sc,'دورات قصيرة، تسلّم قيمة مبكرة وتتقبّل التغيير'),140,786,760);aD.style.textAlign='right';fadeUp(aD,132.0,{y:10});
  const hy=at(el('div','a lbl ctr',sc,'وكثير من الفرق تجمع بينهما في نهج هجين'),0,866,1920);hy.style.fontSize='21px';fadeUp(hy,135.8,{y:8});
  caption('المنهجية تحدد طريقة تنظيم العمل: «الشلال» ينجز المراحل بالتتابع، مرحلةً بعد مرحلة.',128.9,4.8);
  caption('أما «الرشيقة» فتعمل في دورات قصيرة، وتسلّم جزءاً جاهزاً في نهاية كل دورة.',133.9,4.3);
  sceneOut(sc,138.3);sweep(138.5);cue('riser',136.6,2.3);
}

/* ============ S11 · الخاتمة (139 – 150) ============ */
{
  const sc=scene('s11',139.0,150.0);
  const s=svgIn(sc),lg=sv('g',{},s);
  const ln=prep(path(lg,'M1560 560 H360',C.line,2));draw(ln,139.2,1.0,'power2.inOut');
  const NX=k=>1560-k*1200/9,nd=[],nl=[];
  for(let k=0;k<10;k++){nd.push(sv('circle',{cx:NX(k),cy:560,r:9,fill:'#0B2139',stroke:C.line,'stroke-width':2},lg));nl.push(at(el('div','a ax ctr',sc,ar(k+1)),NX(k)-30,586,60));}
  nd.forEach((c,k)=>popIn(c,139.3+k*.09,{d:.4,ease:'back.out(3)'}));fadeUp(nl,139.5,{y:6,s:.05,d:.3});
  nd.forEach((c,k)=>{const t=140.5+k*.14;tl.to(c,{fill:C.mint,stroke:C.mint,duration:.15},t);ring(lg,NX(k),560,t,C.mint,9,30,.7);cue('tick',t,.4+k*.03);});
  const tg=at(el('div','a tag',sc,['خطّط بذكاء','نفّذ بانضباط','سلّم بثقة'].map(p=>`<span class="ph">${words(p)}</span>`).join('<span class="sep">·</span>')),0,356,1920);
  $$('.ph',tg).forEach((p,k)=>{const t=142.0+k*.75;tl.fromTo($$('.w',p),{opacity:0,y:40,filter:'blur(14px)',fontWeight:100},{opacity:1,y:0,filter:'blur(0px)',fontWeight:700,duration:1.0,stagger:.1,ease:'expo.out'},t);cue('chime',t,k+3);});
  popIn($$('.sep',tg),142.5,{s:.75,from:.3});
  tl.to([tg,...nl],{opacity:0,filter:'blur(10px)',y:-20,duration:.6,ease:'power2.in'},144.5);tl.to(lg,{opacity:0,duration:.5,ease:'power2.in'},144.5);
  const em=svgIn(sc);
  const eL=prep(path(em,'M1010 318 H910',C.line,2));
  const eC=[[1010,C.amber],[960,C.line],[910,C.line]].map(([x,c])=>sv('circle',{cx:x,cy:318,r:7,fill:c},em));
  const fT=at(el('div','a fin-t',sc,words('مخطط المشروع')),0,370,1920);
  const fS=at(el('div','a fin-s',sc,'دليل مرئي لإدارة المشاريع'),0,560,1920);
  const fC=at(el('div','a fin-c',sc,'تصميم وتحريك: Claude'),0,650,1920);
  draw(eL,145.1,.5);popIn(eC,145.2,{s:.1,ease:'back.out(3)'});
  tl.fromTo($$('.w',fT),{opacity:0,y:60,filter:'blur(20px)',fontWeight:100},{opacity:1,y:0,filter:'blur(0px)',fontWeight:800,duration:1.6,stagger:.18,ease:'expo.out'},145.2);cue('impact',145.2);
  fadeUp(fS,146.0,{y:12});fadeUp(fC,146.5,{y:8});
  tl.to(['#tblock','#tc'],{opacity:0,duration:.6},144.6);
  tl.to('#fade',{opacity:1,duration:1.1,ease:'power2.in'},148.8);
}
tl.set({},{},DUR);

/* ---------------- per-frame renderer ---------------- */
const tbSheet=$('#tbSheet'),tbSec=$('#tbSec'),tcEl=$('#tc');
function chapterAt(t){let i=0;for(let k=0;k<CH.length;k++)if(t>=CH[k].t-1e-6)i=k;return i;}
function tcode(t){const f=Math.floor(t*30+1e-6);return `${pad(Math.floor(f/1800))}:${pad(Math.floor(f/30)%60)}:${pad(f%30)}`;}
let lastCi=-1;
function renderAll(t){
  for(let i=0;i<CH.length;i++){const a=CH[i].t,b=i<CH.length-1?CH[i+1].t:DUR;segI[i].style.transform=`scaleX(${clamp((t-a)/(b-a),0,1)})`;}
  const ci=chapterAt(t);
  if(ci!==lastCi){lastCi=ci;tbSheet.textContent=CH[ci].n?`${CH[ci].n} من ١٠`:'—';tbSec.textContent=CH[ci].sec;}
  tcEl.textContent=tcode(t);
  grid.style.transform=`translate(${-((t*9)%200).toFixed(2)}px,${((t*4)%200).toFixed(2)}px)`;
  if(!RM){const f=Math.floor(t*24);grain.style.backgroundPosition=`${(f*73)%256}px ${(f*151)%256}px`;}
  if(t>=19&&t<=34)R.tri();
  if(t>=33&&t<=45.2)R.tok(t);
  if(t>=68&&t<=82.2)R.crit();
  if(t>=82&&t<=93.2)R.kan(t);
  if(t>=93&&t<=118.2)R.kpi();
}

/* grain texture — seeded so every render worker gets identical noise */
(function(){const cv=document.createElement('canvas');cv.width=cv.height=256;const x=cv.getContext('2d');const id=x.createImageData(256,256);let a=1337;const rnd=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};for(let i=0;i<id.data.length;i+=4){const v=rnd()*255;id.data[i]=id.data[i+1]=id.data[i+2]=v;id.data[i+3]=255;}x.putImageData(id,0,0);grain.style.backgroundImage=`url(${cv.toDataURL()})`;})();

/* ---------------- player ---------------- */
const vp=$('#viewport'),player=$('#player'),bigplay=$('#bigplay'),playBtn=$('#playBtn'),muteBtn=$('#muteBtn'),fsBtn=$('#fsBtn'),scrub=$('#scrub'),timeLbl=$('#timeLbl'),snd=$('#snd'),ticksEl=$('#ticks'),chList=$('#chList');
const ICON={play:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5v14l12-7z" fill="currentColor"/></svg>',pause:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>',snd:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',mute:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',fs:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>'};
const mmss=t=>`${Math.floor(t/60)}:${pad(Math.floor(t%60))}`;
const srcAttr=snd.getAttribute('src')||'';
let audioOK=!!srcAttr&&srcAttr.indexOf('__AUDIO')<0;
snd.addEventListener('error',()=>{audioOK=false;});
let cur=0,playing=false,t0=0,c0=0,raf=0,muted=false,fresh=true,uiState='';
CH.slice(1).forEach(c=>{const i=el('i','',ticksEl);i.style.right=`${(c.t/DUR*100).toFixed(3)}%`;});
const chBtns=CH.map(c=>{const li=el('li','',chList);const b=el('button','chb',li,`<span class="n">${c.n||'·'}</span><span class="tt">${c.title}</span><span class="tm">${mmss(c.t)}</span>`);b.type='button';b.addEventListener('click',()=>{fresh=false;bigplay.hidden=true;seek(c.t+.001);if(playing)resync();else play();});return b;});
muteBtn.innerHTML=ICON.snd;fsBtn.innerHTML=ICON.fs;
function ui(){
  scrub.value=cur;scrub.style.setProperty('--p',(cur/DUR*100).toFixed(3)+'%');
  timeLbl.textContent=`${mmss(cur)} / ${mmss(DUR)}`;
  const st=(playing?'1':'0')+(muted?'1':'0')+chapterAt(cur);
  if(st!==uiState){uiState=st;playBtn.innerHTML=playing?ICON.pause:ICON.play;playBtn.setAttribute('aria-label',playing?'إيقاف مؤقت':'تشغيل');muteBtn.innerHTML=muted?ICON.mute:ICON.snd;muteBtn.setAttribute('aria-label',muted?'تشغيل الصوت':'كتم الصوت');const ci=chapterAt(cur);chBtns.forEach((b,i)=>b.setAttribute('aria-current',i===ci?'true':'false'));}
}
function seek(t){cur=clamp(t,0,DUR);tl.seek(cur,true);renderAll(cur);ui();}
function resync(){t0=cur;c0=performance.now();if(playing&&audioOK){try{snd.currentTime=cur;}catch(e){}}}
function frame(now){if(!playing)return;let t=t0+(now-c0)/1000;
  if(audioOK&&!snd.paused&&snd.readyState>=2){const d=snd.currentTime-t;if(Math.abs(d)>.15){t0=snd.currentTime;c0=now;t=t0;}}
  if(t>=DUR){seek(DUR);pause();return;}seek(t);raf=requestAnimationFrame(frame);}
function play(){if(cur>=DUR-.05)seek(0);playing=true;bigplay.hidden=true;t0=cur;c0=performance.now();
  if(audioOK){try{snd.currentTime=cur;snd.muted=muted;const p=snd.play();if(p&&p.catch)p.catch(()=>{});}catch(e){}}
  cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);ui();}
function pause(){playing=false;cancelAnimationFrame(raf);try{snd.pause();}catch(e){}ui();}
function toggle(){if(playing){pause();return;}if(fresh){fresh=false;seek(0);}play();}
bigplay.addEventListener('click',e=>{e.stopPropagation();toggle();});
vp.addEventListener('click',()=>{if(!RENDER)toggle();});
playBtn.addEventListener('click',toggle);
scrub.addEventListener('input',()=>{fresh=false;bigplay.hidden=true;seek(+scrub.value);resync();});
muteBtn.addEventListener('click',()=>{muted=!muted;try{snd.muted=muted;}catch(e){}ui();});
fsBtn.addEventListener('click',()=>{if(document.fullscreenElement){document.exitFullscreen&&document.exitFullscreen();}else if(player.requestFullscreen){player.requestFullscreen().catch(()=>{});}});
document.addEventListener('keydown',e=>{const tag=e.target&&e.target.tagName||'';
  if(e.code==='Space'){if(tag==='BUTTON')return;e.preventDefault();toggle();}
  else if(e.code==='KeyM'){muteBtn.click();}else if(e.code==='KeyF'){fsBtn.click();}});
function fit(){const w=vp.clientWidth,h=vp.clientHeight;if(!w||!h)return;const s=Math.min(w/1920,h/1080);stage.style.transform=`translate(${((w-1920*s)/2).toFixed(2)}px,${((h-1080*s)/2).toFixed(2)}px) scale(${s})`;}
if(window.ResizeObserver)new ResizeObserver(fit).observe(vp);else window.addEventListener('resize',fit);
fit();
R.frame();
const POSTER=6.6;
seek(RENDER?0:POSTER);
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{R.frame();seek(cur);});

window.__mg={dur:DUR,cues:CUES,chapters:CH,seek:t=>{tl.seek(t,true);renderAll(t);},frame:()=>R.frame()};
})();
