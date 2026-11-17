/* Stage 5 — автономная интерактивная 3D-карта.
   Canvas 2D renderer с перспективной проекцией: не требует CDN, WebGL или внешних библиотек.
   Все элементы управления привязаны здесь и работают независимо от порядка открытия этапов. */
'use strict';

const MAP5 = {
  canvas:null, ctx:null, host:null, width:0, height:0, dpr:1,
  progress:0, running:false, mode:'3d', terrainScale:1.35,
  showPoints:true, showRoute:true, showObstacles:true,
  camera:{yaw:-0.62,pitch:0.58,zoom:1,panX:0,panY:0},
  drag:null, raf:0, lastTick:0, points:[], resizeObserver:null, initialized:false
};

function map5Height(x,z){
  const base=2.8*Math.sin(x*.075)*Math.cos(z*.058)
    +1.25*Math.sin(z*.14+x*.025)
    +.65*Math.cos(x*.17-z*.09)
    +.35*Math.sin((x+z)*.23);
  return base*(MAP5.terrainScale||1);
}
function map5Route(){
  let raw = (typeof T2!=='undefined' && T2.path && T2.path.length>2) ? T2.path :
    (state.routeComputed && state.routeComputed.length>2 ? state.routeComputed : null);
  if(raw) return raw.map(p=>({x:(p[0]-320)/6,z:(p[1]-180)/6,y:map5Height((p[0]-320)/6,(p[1]-180)/6)+3.1}));
  return Array.from({length:160},(_,i)=>{
    const t=i/159*Math.PI*2,x=28*Math.cos(t),z=18*Math.sin(t);
    return {x,z,y:map5Height(x,z)+3.1};
  });
}
function map5Obstacles(){
  return (state.obstacles||[]).map((o,i)=>({x:(o.x-320)/6,z:(o.y-180)/6,r:Math.max(1.7,(o.r||18)/7),h:5+(i%3)*1.8}));
}
function map5Project(x,y,z){
  const c=MAP5.camera;
  if(MAP5.mode==='2d'){
    const cy=Math.cos(c.yaw),sy=Math.sin(c.yaw),rx=x*cy-z*sy,rz=x*sy+z*cy;
    const scale=Math.min(MAP5.width/112,MAP5.height/72)*c.zoom;
    return {x:MAP5.width/2+c.panX+rx*scale,y:MAP5.height/2+c.panY+rz*scale*.62,d:100,k:scale};
  }
  // Orbit camera: pitch is elevation above the horizon. Positive elevation always
  // moves the camera ABOVE the terrain, avoiding the former below-ground view.
  const target={x:0,y:1.2,z:0},distance=94/c.zoom,elev=c.pitch;
  const cp=Math.cos(elev),sp=Math.sin(elev),sy=Math.sin(c.yaw),cy=Math.cos(c.yaw);
  const cam={x:target.x+sy*cp*distance,y:target.y+sp*distance,z:target.z+cy*cp*distance};
  let fx=target.x-cam.x,fy=target.y-cam.y,fz=target.z-cam.z;
  const fl=Math.hypot(fx,fy,fz)||1;fx/=fl;fy/=fl;fz/=fl;
  // Stable camera basis: right is derived from azimuth, not from the
  // horizontal forward vector. This avoids a singularity at straight-up/down.
  const rx=cy,ry=0,rz=-sy;
  const ux=ry*fz-rz*fy,uy=rz*fx-rx*fz,uz=rx*fy-ry*fx;
  const dx=x-cam.x,dy=y-cam.y,dz=z-cam.z,depth=dx*fx+dy*fy+dz*fz;
  const focal=Math.min(MAP5.width,MAP5.height)*1.18,k=focal/Math.max(8,depth);
  return {x:MAP5.width/2+c.panX+(dx*rx+dy*ry+dz*rz)*k,
    y:MAP5.height*.52+c.panY-(dx*ux+dy*uy+dz*uz)*k,d:depth,k};
}
function map5Line(points,color,width=1,dash=[]){
  const g=MAP5.ctx;if(!points.length)return;
  g.save();g.beginPath();points.forEach((p,i)=>{const q=map5Project(p.x,p.y,p.z);i?g.lineTo(q.x,q.y):g.moveTo(q.x,q.y);});
  g.strokeStyle=color;g.lineWidth=width;g.setLineDash(dash);g.lineJoin='round';g.lineCap='round';g.stroke();g.restore();
}
function map5Terrain(){
  const g=MAP5.ctx,nx=42,nz=30,tiles=[];
  for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){
    const x=-48+ix*96/nx,z=-30+iz*60/nz,dx=96/nx,dz=60/nz;
    const pts=[[x,z],[x+dx,z],[x+dx,z+dz],[x,z+dz]].map(([a,b])=>map5Project(a,map5Height(a,b),b));
    tiles.push({pts,depth:pts.reduce((s,p)=>s+p.d,0)/4,h:map5Height(x+dx/2,z+dz/2)});
  }
  tiles.sort((a,b)=>b.depth-a.depth);
  tiles.forEach(t=>{
    const shade=Math.max(0,Math.min(1,(t.h+5)/12)),v=Math.round(111+shade*47);
    g.beginPath();g.moveTo(t.pts[0].x,t.pts[0].y);t.pts.slice(1).forEach(p=>g.lineTo(p.x,p.y));g.closePath();
    g.fillStyle=`rgb(${v-8},${v+1},${v-9})`;g.fill();
    g.strokeStyle='rgba(226,231,222,.12)';g.lineWidth=.55;g.stroke();
  });
  // Границы района и координатная сетка.
  g.save();g.strokeStyle='rgba(61,75,64,.22)';g.lineWidth=1;
  for(let x=-50;x<=50;x+=10){const a=map5Project(x,map5Height(x,-32),-32),b=map5Project(x,map5Height(x,32),32);g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();}
  for(let z=-30;z<=30;z+=10){const a=map5Project(-50,map5Height(-50,z),z),b=map5Project(50,map5Height(50,z),z);g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();}
  g.restore();
}
function map5PointCloud(){
  const g=MAP5.ctx,visible=Math.floor(MAP5.points.length*MAP5.progress);
  g.save();g.fillStyle='rgba(54,72,58,.62)';
  for(let i=0;i<visible;i++){const p=MAP5.points[i],q=map5Project(p.x,p.y,p.z);if(q.x<0||q.y<0||q.x>MAP5.width||q.y>MAP5.height)continue;g.globalAlpha=.28+(i%5)*.1;g.fillRect(q.x,q.y,1.6,1.6);}
  g.restore();
}
function map5DrawObstacles(){
  const g=MAP5.ctx;
  map5Obstacles().forEach((o,i)=>{
    const n=12,base=[],top=[];
    for(let k=0;k<n;k++){const a=k/n*Math.PI*2,x=o.x+Math.cos(a)*o.r,z=o.z+Math.sin(a)*o.r;base.push(map5Project(x,map5Height(x,z)+.2,z));top.push(map5Project(x,map5Height(x,z)+o.h,z));}
    const center=map5Project(o.x,map5Height(o.x,o.z)+o.h,o.z);
    for(let k=0;k<n;k++){const j=(k+1)%n;g.beginPath();g.moveTo(base[k].x,base[k].y);g.lineTo(base[j].x,base[j].y);g.lineTo(top[j].x,top[j].y);g.lineTo(top[k].x,top[k].y);g.closePath();g.fillStyle=k%3===0?'rgba(91,104,91,.82)':'rgba(113,124,111,.76)';g.fill();g.strokeStyle='rgba(47,59,49,.4)';g.stroke();}
    g.beginPath();top.forEach((p,k)=>k?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));g.closePath();g.fillStyle='rgba(143,153,139,.94)';g.fill();g.strokeStyle='rgba(57,68,57,.55)';g.stroke();
    g.save();g.fillStyle='rgba(35,45,37,.8)';g.font='10px sans-serif';g.textAlign='center';g.fillText(`P${i+1}`,center.x,center.y-8);g.restore();
  });
}
function map5DrawDrone(){
  const route=map5Route(),idx=Math.min(route.length-1,Math.floor(MAP5.progress*(route.length-1))),p=route[idx],q=map5Project(p.x,p.y,p.z),g=MAP5.ctx;
  g.save();g.translate(q.x,q.y);g.rotate(-MAP5.camera.yaw);
  g.strokeStyle='#303a32';g.lineWidth=3;g.lineCap='round';
  [[-10,-8,10,8],[-10,8,10,-8]].forEach(a=>{g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(a[2],a[3]);g.stroke();});
  g.fillStyle='#f2f3ec';g.strokeStyle='#3d493f';g.lineWidth=1.5;g.beginPath();g.roundRect(-5,-4,10,8,2);g.fill();g.stroke();
  [[-11,-9],[11,-9],[-11,9],[11,9]].forEach(([x,y])=>{g.beginPath();g.arc(x,y,3.3,0,Math.PI*2);g.fillStyle='#89958a';g.fill();g.stroke();});
  g.restore();
}
function map5Draw(){
  if(!MAP5.ctx||!MAP5.width||!MAP5.height)return;
  const g=MAP5.ctx,w=MAP5.width,h=MAP5.height;
  const bg=g.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#e9ece6');bg.addColorStop(1,'#d8ded5');g.fillStyle=bg;g.fillRect(0,0,w,h);
  map5Terrain();
  if(MAP5.showPoints)map5PointCloud();
  if(MAP5.showRoute){
    const r=map5Route();map5Line(r,'rgba(255,255,255,.92)',6);map5Line(r,'#526a58',2.4);
    const end=map5Project(r[r.length-1].x,r[r.length-1].y,r[r.length-1].z);g.beginPath();g.arc(end.x,end.y,5,0,Math.PI*2);g.fillStyle='#526a58';g.fill();
  }
  if(MAP5.showObstacles)map5DrawObstacles();
  map5DrawDrone();
  // Лаконичная шкала и подписи карты.
  g.save();g.fillStyle='rgba(38,50,40,.76)';g.font='11px ui-monospace,monospace';g.fillText(MAP5.mode==='2d'?'ORTHOGRAPHIC MAP':'3D TERRAIN MODEL',16,22);
  g.fillStyle='rgba(38,50,40,.55)';g.font='10px ui-monospace,monospace';g.fillText('AREA 640 × 360 M  ·  SIMULATED SLAM',16,h-16);
  g.restore();
  map5UpdateMetrics();
}
function map5UpdateMetrics(){
  const r=map5Route(),p=r[Math.min(r.length-1,Math.floor(MAP5.progress*(r.length-1)))];
  if($('pointCount'))$('pointCount').textContent=Math.floor(MAP5.points.length*MAP5.progress).toLocaleString('ru-RU');
  if($('mapCoverage'))$('mapCoverage').textContent=(MAP5.progress*100).toFixed(0)+'%';
  if($('mapPose'))$('mapPose').textContent=`${p.x.toFixed(1)} / ${p.z.toFixed(1)}`;
}
function map5Resize(){
  if(!MAP5.host||!MAP5.canvas)return;
  const r=MAP5.host.getBoundingClientRect();MAP5.dpr=Math.min(window.devicePixelRatio||1,2);
  MAP5.width=Math.max(320,Math.floor(r.width));MAP5.height=Math.max(300,Math.floor(r.height));
  MAP5.canvas.width=Math.floor(MAP5.width*MAP5.dpr);MAP5.canvas.height=Math.floor(MAP5.height*MAP5.dpr);
  MAP5.ctx.setTransform(MAP5.dpr,0,0,MAP5.dpr,0,0);map5Draw();
}
function map5SetMode(mode){
  MAP5.mode=mode==='2d'?'2d':'3d';state.mapMode=MAP5.mode;
  document.querySelectorAll('[data-mapmode]').forEach(b=>{const active=b.dataset.mapmode===MAP5.mode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  map5Draw();
}
function map5SetView(view){
  document.querySelectorAll('[data-mapview]').forEach(b=>b.classList.toggle('active',b.dataset.mapview===view));
  if(view==='top'){MAP5.camera.pitch=Math.PI/2;MAP5.camera.yaw=0;}
  else if(view==='side'){MAP5.camera.pitch=0;}
  else if(view==='iso'){MAP5.camera.pitch=.62;MAP5.camera.yaw=-.62;}
  map5SyncElevation();map5Draw();
}
function map5SyncElevation(){
  const slider=$('mapElevation'),out=$('mapElevationOut');
  if(slider){const deg=MAP5.camera.pitch*180/Math.PI;slider.value=((Math.round(deg)+360)%720)-360;}
  if(out)out.textContent=`${Math.round(MAP5.camera.pitch*180/Math.PI)}°`;
}
function map5ResetCamera(){
  MAP5.camera={yaw:-0.62,pitch:0.62,zoom:1,panX:0,panY:0};map5SetView('iso');map5SyncElevation();map5Draw();
}
function map5SetLayer(key){
  const map={points:'showPoints',route:'showRoute',obstacles:'showObstacles'},prop=map[key];if(!prop)return;
  MAP5[prop]=!MAP5[prop];const id={points:'mapPointsToggle',route:'mapRouteToggle',obstacles:'mapObstaclesToggle'}[key],b=$(id);
  if(b){b.classList.toggle('active',MAP5[prop]);b.setAttribute('aria-pressed',String(MAP5[prop]));}
  map5Draw();
}
function map5Start(){
  if(MAP5.running)return;if(MAP5.progress>=1)MAP5.progress=0;
  MAP5.running=true;if($('slamStart'))$('slamStart').textContent='Ⅱ Приостановить';if($('slamState'))$('slamState').textContent='SLAM: сканирование местности';
  const tick=now=>{if(!MAP5.running)return;if(!MAP5.lastTick||now-MAP5.lastTick>28){MAP5.progress=Math.min(1,MAP5.progress+.0028);MAP5.lastTick=now;map5Draw();}
    if(MAP5.progress>=1){MAP5.running=false;if($('slamStart'))$('slamStart').textContent='↻ Повторить сканирование';if($('slamState'))$('slamState').textContent='Карта построена · реконструкция завершена';return;}
    MAP5.raf=requestAnimationFrame(tick);};
  MAP5.raf=requestAnimationFrame(tick);
}
function map5ToggleRun(){
  if(MAP5.running){MAP5.running=false;cancelAnimationFrame(MAP5.raf);if($('slamStart'))$('slamStart').textContent='▶ Продолжить';if($('slamState'))$('slamState').textContent='Сканирование приостановлено';}
  else map5Start();
}
function map5Reset(){
  MAP5.running=false;cancelAnimationFrame(MAP5.raf);MAP5.progress=0;MAP5.lastTick=0;
  if($('slamStart'))$('slamStart').textContent='▶ Начать картирование';
  if($('slamState'))$('slamState').textContent='Ожидание сканирования';map5Draw();
}
function map5Bind(){
  document.querySelectorAll('[data-mapmode]').forEach(b=>b.onclick=()=>map5SetMode(b.dataset.mapmode));
  const bind=(id,fn)=>{const el=$(id);if(el)el.onclick=fn;};
  bind('mapPointsToggle',()=>map5SetLayer('points'));bind('mapRouteToggle',()=>map5SetLayer('route'));bind('mapObstaclesToggle',()=>map5SetLayer('obstacles'));
  bind('mapResetView',map5ResetCamera);bind('slamStart',map5ToggleRun);bind('slamReset',map5Reset);
  document.querySelectorAll('[data-mapview]').forEach(b=>b.onclick=()=>map5SetView(b.dataset.mapview));
  const elevation=$('mapElevation');if(elevation)elevation.oninput=()=>{MAP5.camera.pitch=Number(elevation.value)*Math.PI/180;map5SyncElevation();map5Draw();};
  const relief=$('mapRelief');if(relief)relief.oninput=()=>{MAP5.terrainScale=Number(relief.value)/100;if($('mapReliefOut'))$('mapReliefOut').textContent=MAP5.terrainScale.toFixed(1)+'×';map5Draw();};
  const c=MAP5.canvas;
  c.oncontextmenu=e=>e.preventDefault();
  c.onpointerdown=e=>{MAP5.drag={x:e.clientX,y:e.clientY,button:e.button};c.setPointerCapture(e.pointerId);};
  c.onpointermove=e=>{if(!MAP5.drag)return;const dx=e.clientX-MAP5.drag.x,dy=e.clientY-MAP5.drag.y;
    if(MAP5.drag.button===2||MAP5.drag.button===1||e.shiftKey){MAP5.camera.panX+=dx;MAP5.camera.panY+=dy;}
    else if(MAP5.mode==='3d'){MAP5.camera.yaw+=dx*.006;MAP5.camera.pitch+=dy*.008;map5SyncElevation();}
    else{MAP5.camera.panX+=dx;MAP5.camera.panY+=dy;}
    MAP5.drag.x=e.clientX;MAP5.drag.y=e.clientY;map5Draw();};
  c.onpointerup=c.onpointercancel=()=>MAP5.drag=null;
  c.onwheel=e=>{e.preventDefault();MAP5.camera.zoom=Math.max(.08,Math.min(18,MAP5.camera.zoom*(e.deltaY>0?.90:1.11)));map5Draw();};
  c.addEventListener('keydown',e=>{
    const step=.08;
    if(e.key==='ArrowLeft')MAP5.camera.yaw-=step;
    else if(e.key==='ArrowRight')MAP5.camera.yaw+=step;
    else if(e.key==='ArrowUp')MAP5.camera.pitch+=step;
    else if(e.key==='ArrowDown')MAP5.camera.pitch-=step;
    else if(e.key==='+'||e.key==='=')MAP5.camera.zoom=Math.min(18,MAP5.camera.zoom*1.12);
    else if(e.key==='-')MAP5.camera.zoom=Math.max(.08,MAP5.camera.zoom/1.12);
    else return;
    e.preventDefault();map5SyncElevation();map5Draw();
  });
}
function initMap5(){
  const host=$('map3d');if(!host)return;
  if(!MAP5.initialized){
    MAP5.host=host;host.innerHTML='';const canvas=document.createElement('canvas');canvas.className='offline-map-canvas';canvas.setAttribute('aria-label','Интерактивная карта рельефа');canvas.tabIndex=0;host.appendChild(canvas);
    MAP5.canvas=canvas;MAP5.ctx=canvas.getContext('2d');MAP5.points=[];const random=rng(20261116);
    for(let i=0;i<5200;i++){const x=(random()-.5)*96,z=(random()-.5)*60;MAP5.points.push({x,y:map5Height(x,z)+.25+random()*.45,z});}
    MAP5.initialized=true;map5Bind();
    if('ResizeObserver'in window){MAP5.resizeObserver=new ResizeObserver(map5Resize);MAP5.resizeObserver.observe(host);}
    window.addEventListener('resize',map5Resize);
  }
  MAP5.host=host;map5Resize();map5SetMode(state.mapMode||'3d');map5SyncElevation();map5Draw();
}
init.s5=initMap5;
