/* 3D-квадрокоптер на главной (three.js r128, процедурная модель). */
try{
(function(){
const cv=document.getElementById('heroDrone'),hero=document.getElementById('hero3d');
let R;
try{R=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});}catch(e){hero.classList.add('nogl');return;}
R.setPixelRatio(Math.min(devicePixelRatio,2));
R.outputEncoding=THREE.sRGBEncoding;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.15;
const S=new THREE.Scene(),cam=new THREE.PerspectiveCamera(35,1,.1,100);

/* studio environment for reflections */
const es=new THREE.Scene();es.background=new THREE.Color(0x08080a);
function panel(w,h,x,y,z,c,i){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(c).multiplyScalar(i),side:THREE.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);es.add(m);}
panel(14,5,0,9,0,0xffffff,5);panel(3,10,8,2,4,0xffffff,4);panel(3,10,-8,1,-3,0xc6f432,5);panel(12,3,0,-6,2,0x8899ff,1.2);panel(8,4,0,3,-9,0xffffff,2);
S.environment=new THREE.PMREMGenerator(R).fromScene(es,.03).texture;
const key=new THREE.DirectionalLight(0xffffff,1.4);key.position.set(4,7,5);S.add(key);
const rim=new THREE.DirectionalLight(0xc6f432,1.6);rim.position.set(-6,2,-5);S.add(rim);

/* materials */
const M={
 carbon:new THREE.MeshPhysicalMaterial({color:0x15161a,metalness:.65,roughness:.34,clearcoat:1,clearcoatRoughness:.12}),
 shell:new THREE.MeshPhysicalMaterial({color:0xe9eaec,metalness:.1,roughness:.22,clearcoat:1,clearcoatRoughness:.06}),
 metal:new THREE.MeshStandardMaterial({color:0x9aa0aa,metalness:1,roughness:.22}),
 dark:new THREE.MeshStandardMaterial({color:0x0b0b0d,metalness:.3,roughness:.6}),
 lime:new THREE.MeshStandardMaterial({color:0xc6f432,emissive:0xc6f432,emissiveIntensity:1.6,roughness:.4}),
 red:new THREE.MeshStandardMaterial({color:0xff3b2f,emissive:0xff3b2f,emissiveIntensity:1.6}),
 glass:new THREE.MeshPhysicalMaterial({color:0x06080f,metalness:.2,roughness:0,clearcoat:1,envMapIntensity:2.5})
};
/* helpers */
function rr(w,h,r){const s=new THREE.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
function slab(shape,d,b,mat){const g=new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:6,curveSegments:24});g.rotateX(-Math.PI/2);g.center();return new THREE.Mesh(g,mat);}
function strut(a,b,r,m){const d=new THREE.Vector3().subVectors(b,a),g=new THREE.CylinderGeometry(r,r,d.length(),14),o=new THREE.Mesh(g,m);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;}

const root=new THREE.Group(),D=new THREE.Group(),T=new THREE.Group();S.add(root);root.add(D);D.add(T);

/* body */
const hull=slab(rr(1.5,2.7,.55),.5,.14,M.carbon);T.add(hull);
const cover=slab(rr(1.15,2.0,.5),.22,.12,M.shell);cover.position.y=.33;T.add(cover);
const bat=slab(rr(.8,1.1,.2),.16,.05,M.dark);bat.position.set(0,.55,-.2);T.add(bat);
const stripe=slab(rr(.1,1.5,.05),.02,.015,M.lime);stripe.position.set(0,.5,.55);T.add(stripe);
const belly=slab(rr(1.0,1.8,.4),.12,.06,M.shell);belly.position.y=-.34;T.add(belly);
[-.4,.4].forEach(x=>{const a=strut(new THREE.Vector3(x,.4,-1.0),new THREE.Vector3(x*1.4,1.5,-1.5),.025,M.metal);T.add(a);const t=new THREE.Mesh(new THREE.SphereGeometry(.05,12,12),M.lime);t.position.set(x*1.4,1.5,-1.5);T.add(t);});
[-1,1].forEach(s=>{const f=new THREE.Mesh(new THREE.SphereGeometry(.07,16,16),M.lime);f.position.set(s*.55,.02,1.38);T.add(f);const r=new THREE.Mesh(new THREE.SphereGeometry(.07,16,16),M.red);r.position.set(s*.55,.02,-1.38);T.add(r);});

/* gimbal camera */
const gim=new THREE.Group();gim.position.set(0,-.38,1.35);T.add(gim);
gim.add(new THREE.Mesh(new THREE.SphereGeometry(.4,32,32),M.carbon));
const lens=new THREE.Mesh(new THREE.CylinderGeometry(.24,.28,.3,40),M.metal);lens.rotation.x=Math.PI/2;lens.position.z=.34;gim.add(lens);
const ring=new THREE.Mesh(new THREE.TorusGeometry(.25,.025,12,48),M.lime);ring.position.z=.5;gim.add(ring);
const gl=new THREE.Mesh(new THREE.CircleGeometry(.2,40),M.glass);gl.position.z=.495;gim.add(gl);
const yoke=new THREE.Mesh(new THREE.TorusGeometry(.5,.035,10,40,Math.PI),M.metal);yoke.rotation.z=Math.PI;yoke.rotation.y=Math.PI/2;yoke.position.y=.02;gim.add(yoke);

/* landing skids */
[-1,1].forEach(s=>{
 const c=new THREE.CatmullRomCurve3([new THREE.Vector3(s*1.05,-1.0,-2.0),new THREE.Vector3(s*1.05,-1.3,-1.65),new THREE.Vector3(s*1.05,-1.3,1.65),new THREE.Vector3(s*1.05,-1.0,2.0)]);
 T.add(new THREE.Mesh(new THREE.TubeGeometry(c,48,.05,12),M.carbon));
 [-1,1].forEach(z=>T.add(strut(new THREE.Vector3(s*.65,-.22,z*.85),new THREE.Vector3(s*1.05,-1.3,z*.85),.045,M.carbon)));
});

/* arms, motors, propellers */
const lathe=new THREE.LatheGeometry([[0,0],[.34,0],[.37,.05],[.35,.3],[.29,.36],[.11,.39],[0,.39]].map(p=>new THREE.Vector2(p[0],p[1])),48);
const bs=new THREE.Shape();bs.moveTo(.05,-.1);bs.bezierCurveTo(.4,-.22,.9,-.22,1.4,-.05);bs.quadraticCurveTo(1.52,0,1.4,.07);bs.bezierCurveTo(.9,.2,.4,.15,.05,.1);bs.closePath();
const bg=new THREE.ExtrudeGeometry(bs,{depth:.025,bevelEnabled:true,bevelThickness:.01,bevelSize:.01,bevelSegments:3,curveSegments:24});bg.rotateX(-Math.PI/2);
const blurG=new THREE.CircleGeometry(1.5,64);blurG.rotateX(-Math.PI/2);
const props=[];
[[1,1],[-1,1],[-1,-1],[1,-1]].forEach((q,i)=>{
 const mx=q[0]*2.0,mz=q[1]*2.0,len=Math.hypot(mx,mz)+.2;
 const arm=slab(rr(len,.34,.17),.1,.06,M.carbon);arm.position.set(mx/2,0,mz/2);arm.rotation.y=-Math.atan2(mz,mx);T.add(arm);
 const mo=new THREE.Mesh(lathe,M.metal);mo.position.set(mx,.04,mz);T.add(mo);
 const base=new THREE.Mesh(new THREE.TorusGeometry(.35,.03,12,48),M.lime);base.rotation.x=Math.PI/2;base.position.set(mx,.1,mz);T.add(base);
 const P=new THREE.Group();P.position.set(mx,.45,mz);T.add(P);
 for(let k=0;k<2;k++){const b=new THREE.Mesh(bg,M.carbon);b.rotation.set(.16,k*Math.PI,0);P.add(b);}
 const hub=new THREE.Mesh(new THREE.CylinderGeometry(.09,.11,.08,20),M.lime);P.add(hub);
 const blur=new THREE.Mesh(blurG,new THREE.MeshBasicMaterial({color:0xc6f432,transparent:true,opacity:.04,depthWrite:false,blending:THREE.AdditiveBlending}));blur.position.y=.02;P.add(blur);
 props.push({P,blur,dir:i%2?1:-1,a:Math.random()*6});
});

/* orbit rings with glowing nodes + dust */
const rings=[];
[[3.2,.5,.2,.5],[4.1,-.6,.7,-.35],[5.0,.2,-.4,.25]].forEach(r=>{
 const pts=[];for(let i=0;i<=128;i++){const a=i/128*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(a)*r[0],0,Math.sin(a)*r[0]*.8));}
 const g=new THREE.Group();g.rotation.set(r[1],0,r[2]);
 g.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.07})));
 const n=[];for(let k=0;k<2;k++){const m=new THREE.Mesh(new THREE.SphereGeometry(.06,12,12),new THREE.MeshBasicMaterial({color:k?0xffffff:0xc6f432}));g.add(m);n.push(m);}
 rings.push({g,n,r:r[0],sp:r[3],ph:Math.random()*6});root.add(g);
});
const dp=new Float32Array(900);for(let i=0;i<dp.length;i++)dp[i]=(Math.random()-.5)*(i%3==1?10:18);
const dg=new THREE.BufferGeometry();dg.setAttribute('position',new THREE.BufferAttribute(dp,3));
const dust=new THREE.Points(dg,new THREE.PointsMaterial({size:.035,color:0x9b9ba2,transparent:true,opacity:.6,depthWrite:false}));S.add(dust);

function resize(){const w=hero.clientWidth,h=hero.clientHeight;if(!w||!h)return;R.setSize(w,h,false);cam.aspect=w/h;root.scale.setScalar(Math.min(.62,.7*cam.aspect));cam.updateProjectionMatrix();}
new ResizeObserver(resize).observe(hero);resize();

/* input */
let pcx=-999,pcy=-999,mx=0,my=0,sx=0,sy=0,yaw=0,vyaw=0,drag=false,lx=0,boost=0,moved=0;
addEventListener('pointermove',e=>{mx=(e.clientX/innerWidth)*2-1;my=-((e.clientY/innerHeight)*2-1);pcx=e.clientX;pcy=e.clientY;
 if(drag){const dx=e.clientX-lx;lx=e.clientX;yaw+=dx*.012;vyaw=dx*.012;moved+=Math.abs(dx);}});
cv.addEventListener('pointerdown',e=>{drag=true;lx=e.clientX;moved=0;cv.classList.add('drag');cv.setPointerCapture(e.pointerId);});
addEventListener('pointerup',()=>{if(!drag)return;drag=false;cv.classList.remove('drag');if(moved<6)boost=1;});
addEventListener('pointerleave',()=>{mx=0;my=0;});

/* loop */
const clk=new THREE.Clock(),v3=new THREE.Vector3();let speed=28;
function tick(){
 if(!hero.offsetParent||document.hidden){clk.getDelta();requestAnimationFrame(tick);return;}
 const dt=Math.min(clk.getDelta(),.05),t=clk.elapsedTime;
 sx+=(mx-sx)*.07;sy+=(my-sy)*.07;
 if(!drag){yaw+=vyaw;vyaw*=.94;}
 boost=Math.max(0,boost-dt*.6);
 const rc=hero.getBoundingClientRect();const prox=Math.max(0,1-Math.hypot(pcx-(rc.left+rc.width/2),pcy-(rc.top+rc.height/2))/Math.max(420,rc.width));
 const target=26+prox*34+boost*70;speed+=(target-speed)*.06;
 T.rotation.x=.06+(-sy)*.32*0+sy*-.38+Math.sin(t*1.3)*.015;
 T.rotation.z=-sx*.4+Math.sin(t*1.1)*.02;
 D.rotation.y=yaw+sx*.5+Math.sin(t*.4)*.12;
 D.position.y=Math.sin(t*1.6)*.12+boost*.5+sy*.25;
 D.position.x=sx*.3;
 const k=(speed-26)/80;
 props.forEach(p=>{p.a+=p.dir*speed*dt;p.P.rotation.y=p.a;p.blur.material.opacity=.04+k*.22;});
 rings.forEach((r,i)=>{r.n.forEach((m,j)=>{const a=t*r.sp+r.ph+j*Math.PI;m.position.set(Math.cos(a)*r.r,0,Math.sin(a)*r.r*.8);});r.g.rotation.y=sx*.2*(i+1);});
 dust.rotation.y=t*.01+sx*.08;dust.rotation.x=-sy*.05;
 M.lime.emissiveIntensity=1.4+prox*1.2+boost*1.5;
 gim.rotation.y=sx*.6;gim.rotation.x=-sy*.4;
 cam.position.set(sx*.9,2.3+sy*.5,9);cam.lookAt(0,0,0);
 R.render(S,cam);requestAnimationFrame(tick);
}
tick();
})();
}catch(e){console.error(e)}
