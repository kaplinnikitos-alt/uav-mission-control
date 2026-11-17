/* UAV Studio experience layer: scroll reveals, ambient motion and local 3D object viewer. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Reveal content only when it enters the viewport; content remains visible if IO is unavailable.
  const revealTargets = '.panel,.workflow-card,.hero,.page-head,.metric-strip,.model-studio,.grid-2 > article,.section-head,.metric-grid,.metric-row,.map3d-stage';
  const reveal = el => {
    if (el.dataset.revealReady) return;
    el.dataset.revealReady = '1';
    el.classList.add('reveal-item');
    if (reduced || !('IntersectionObserver' in window)) { el.classList.add('is-visible'); return; }
    observer.observe(el);
  };
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, {threshold: .08, rootMargin: '0px 0px -36px 0px'}) : null;
  const scan = root => {
    if (!root || root.nodeType !== 1 && root !== document) return;
    if (root.matches && root.matches(revealTargets)) reveal(root);
    root.querySelectorAll && root.querySelectorAll(revealTargets).forEach(reveal);
  };
  document.addEventListener('DOMContentLoaded', () => scan(document));
  scan(document);
  const domObserver = new MutationObserver(records => records.forEach(r => r.addedNodes.forEach(n => {
    if (n.nodeType === 1) scan(n);
  })));
  domObserver.observe(document.body, {childList:true,subtree:true});

  // A small scroll progress indicator and subtle header response.
  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  progress.innerHTML = '<span></span>';
  document.body.appendChild(progress);
  let scrollQueued = false;
  const onScroll = () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - innerHeight;
      progress.firstElementChild.style.transform = `scaleX(${max > 0 ? scrollY/max : 0})`;
      document.body.classList.toggle('is-scrolling', scrollY > 12);
      scrollQueued = false;
    });
  };
  addEventListener('scroll', onScroll, {passive:true}); onScroll();

  // Procedural low-poly models, rendered locally on a 2D canvas with perspective projection.
  const canvas = $('modelCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const V = (x,y,z) => [x,y,z];
  const box = (out,cx,cy,cz,sx,sy,sz,tag='body') => {
    const x=sx/2,y=sy/2,z=sz/2,vs=[[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z],[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]];
    const fs=[[0,1,2,3],[4,7,6,5],[0,4,5,1],[3,2,6,7],[0,3,7,4],[1,5,6,2]];
    out.push({v:vs.map(p=>V(p[0]+cx,p[1]+cy,p[2]+cz)),f:fs,tag});
  };
  const rod = (out,a,b,r=.12,tag='arm') => {
    const mid=a.map((v,i)=>(v+b[i])/2),d=b.map((v,i)=>v-a[i]),len=Math.hypot(...d);
    box(out,mid[0],mid[1],mid[2],r*2,len,r*2,tag);
  };
  const ring = (out,cx,cy,cz,r,tag='rotor') => {
    const v=[];for(let i=0;i<28;i++){const a=i/28*Math.PI*2;v.push(V(cx+Math.cos(a)*r,cy,cz+Math.sin(a)*r));}
    const f=[];for(let i=0;i<28;i++)f.push([i,(i+1)%28]);out.push({v,f,tag,line:true});
  };
  function drone(){
    const o=[];box(o,0,0,0,1.1,.32,.72,'body');
    const arms=[[.38,0,.25],[.38,0,-.25],[-.38,0,.25],[-.38,0,-.25]];
    arms.forEach(([x,y,z])=>{const signX=Math.sign(x),signZ=Math.sign(z),end=[signX*1.55,.05,signZ*1.15];rod(o,[x,y,z],end,.095,'arm');ring(o,end[0],.13,end[2],.42,'rotor');box(o,end[0],.02,end[2],.24,.08,.24,'motor');});
    box(o,0,-.38,0,.78,.08,.55,'landing');
    rod(o,[-.38,-.32,.25],[-.38,-.55,.25],.045,'landing');rod(o,[.38,-.32,.25],[.38,-.55,.25],.045,'landing');
    box(o,0,.2,.43,.28,.12,.22,'sensor');
    return o;
  }
  function satellite(){
    const o=[];box(o,0,0,0,.85,.8,.85,'body');
    [-1,1].forEach(s=>{
      box(o,s*1.18,0,0,1.45,.07,.82,'panel');
      for(let i=0;i<5;i++)rod(o,[s*.55+i*s*.25,-.045,-.4],[s*.55+i*s*.25,-.045,.4],.012,'grid');
      for(let j=0;j<4;j++)rod(o,[s*.48,-.045,-.4+j*.26],[s*1.9,-.045,-.4+j*.26],.012,'grid');
    });
    ring(o,0,.65,0,.48,'dish');rod(o,[0,.1,0],[0,.65,0],.045,'antenna');
    return o;
  }
  function rover(){
    const o=[];box(o,0,.2,0,1.55,.48,1.12,'body');box(o,0,.58,-.05,.62,.34,.55,'mast');
    rod(o,[0,.72,-.05],[0,1.28,-.05],.045,'mast');box(o,0,1.32,-.05,.45,.08,.35,'sensor');
    [-1,1].forEach(x=>[-1,1].forEach(z=>{
      const cx=x*.92,cz=z*.55,v=[];
      for(let i=0;i<24;i++){const a=i/24*Math.PI*2;v.push(V(cx+Math.cos(a)*.28,.05+Math.sin(a)*.28,cz));}
      const f=[];for(let i=0;i<24;i++)f.push([i,(i+1)%24]);o.push({v,f,tag:'wheel',line:true});
      rod(o,[x*.65,.05,z*.5],[cx,.05,cz],.07,'suspension');
    }));
    return o;
  }
  const models={drone:{name:'UAV / QUADCOPTER',build:drone},satellite:{name:'EARTH OBSERVATION / SAT',build:satellite},rover:{name:'PLANETARY / ROVER',build:rover}};
  let selected='drone',yaw=-.62,pitch=.42,zoom=1,drag=null,auto=true,last=0,raf=0,scale=1;
  const palette={body:'#c7ceca',arm:'#89938d',rotor:'#68746d',motor:'#e0e5df',landing:'#78847c',sensor:'#e6ebe5',panel:'#687b79',grid:'#b4c2ba',dish:'#b8c1ba',antenna:'#69766e',mast:'#929d95',wheel:'#4d5752',suspension:'#9ba69e'};
  function resize(){
    const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
    if(!r.width||!r.height)return;
    canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);draw();
  }
  function transform(p){
    let [x,y,z]=p;x*=scale;y*=scale;z*=scale;
    const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    const x1=x*cy-z*sy,z1=x*sy+z*cy,y1=y;
    const y2=y1*cp-z1*sp,z2=y1*sp+z1*cp;
    const dist=7.2/zoom,depth=dist-z2,f= Math.min(canvas.clientWidth,canvas.clientHeight)*.68/Math.max(.6,depth);
    return {x:canvas.clientWidth/2+x1*f,y:canvas.clientHeight*.49-y2*f,z:depth};
  }
  function draw(){
    const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
    ctx.clearRect(0,0,w,h);
    const bg=ctx.createLinearGradient(0,0,0,h);bg.addColorStop(0,'rgba(32,38,35,.08)');bg.addColorStop(1,'rgba(90,102,93,.12)');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
    // Ground grid.
    ctx.save();ctx.strokeStyle='rgba(132,148,137,.16)';ctx.lineWidth=1;
    for(let i=-5;i<=5;i++){const a=transform([i*.55,-1.05,-3]),b=transform([i*.55,-1.05,3]),c=transform([-3,-1.05,i*.55]),d=transform([3,-1.05,i*.55]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.moveTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.stroke();}ctx.restore();
    // Halo rings.
    const cx=w/2,cy=h*.49;ctx.save();ctx.strokeStyle='rgba(163,177,166,.19)';ctx.setLineDash([3,7]);[.28,.4,.53].forEach(r=>{ctx.beginPath();ctx.ellipse(cx,cy,Math.min(w,h)*r,Math.min(w,h)*r*.28,0,0,Math.PI*2);ctx.stroke();});ctx.restore();
    const meshes=models[selected].build(),faces=[];
    meshes.forEach(mesh=>{
      if(mesh.line){
        mesh.f.forEach(edge=>{const a=transform(mesh.v[edge[0]]),b=transform(mesh.v[edge[1]]);ctx.strokeStyle=palette[mesh.tag]||'#aab5ad';ctx.lineWidth=mesh.tag==='rotor'?2.3:1.1;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();});
      } else mesh.f.forEach(face=>{
        const pts=face.map(i=>transform(mesh.v[i]));faces.push({pts,z:pts.reduce((s,p)=>s+p.z,0)/pts.length,tag:mesh.tag});
      });
    });
    faces.sort((a,b)=>b.z-a.z);
    faces.forEach(face=>{
      ctx.beginPath();face.pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();
      ctx.fillStyle=palette[face.tag]||'#aeb8b1';ctx.globalAlpha=.72;ctx.fill();ctx.globalAlpha=1;
      ctx.strokeStyle='rgba(31,39,34,.55)';ctx.lineWidth=1;ctx.stroke();
    });
    // Viewport reticle.
    ctx.save();ctx.strokeStyle='rgba(160,174,164,.35)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(cx,cy,7,0,Math.PI*2);ctx.moveTo(cx-15,cy);ctx.lineTo(cx-8,cy);ctx.moveTo(cx+8,cy);ctx.lineTo(cx+15,cy);ctx.moveTo(cx,cy-15);ctx.lineTo(cx,cy-8);ctx.moveTo(cx,cy+8);ctx.lineTo(cx,cy+15);ctx.stroke();ctx.restore();
    if($('modelReadout'))$('modelReadout').textContent=`YAW ${Math.round(yaw*180/Math.PI)}° · PITCH ${Math.round(pitch*180/Math.PI)}° · ZOOM ${Math.round(zoom*100)}%`;
  }
  function reset(){yaw=-.62;pitch=.42;zoom=1;scale=1;if($('modelScale'))$('modelScale').value=100;if($('modelScaleOut'))$('modelScaleOut').textContent='100%';draw();}
  function select(id){if(!models[id])return;selected=id;document.querySelectorAll('[data-model]').forEach(b=>b.classList.toggle('active',b.dataset.model===id));if($('modelObjectMeta'))$('modelObjectMeta').textContent=models[id].name;reset();}
  canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;yaw+=(e.clientX-drag.x)*.009;pitch+=(e.clientY-drag.y)*.009;drag={x:e.clientX,y:e.clientY};draw();});
  canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.45,Math.min(3.5,zoom*(e.deltaY>0?.92:1.08)));draw();},{passive:false});
  canvas.addEventListener('dblclick',reset);
  document.querySelectorAll('[data-model]').forEach(b=>b.addEventListener('click',()=>select(b.dataset.model)));
  $('modelReset')?.addEventListener('click',reset);
  $('modelScale')?.addEventListener('input',e=>{scale=Number(e.target.value)/100;$('modelScaleOut').textContent=e.target.value+'%';draw();});
  $('modelAutoRotate')?.addEventListener('click',e=>{auto=!auto;e.currentTarget.textContent=auto?'Ⅱ Автовращение':'▶ Включить вращение';});
  function animate(t){if(!last)last=t;const dt=Math.min(.05,(t-last)/1000);last=t;if(auto&&!drag){yaw+=dt*.18;draw();}raf=requestAnimationFrame(animate);}
  if('ResizeObserver'in window)new ResizeObserver(resize).observe(canvas);
  addEventListener('resize',resize);resize();raf=requestAnimationFrame(animate);
  document.querySelectorAll('.model-choice').forEach(b=>b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(b.dataset.model);}}));
})();
