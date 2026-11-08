/* CARTOON RALLY browser prototype. Original game code; Three.js MIT, vendored.
   This is an independent force-integrated browser vehicle, NOT a Unity port. */
'use strict';
(()=>{
const $=id=>document.getElementById(id),T=window.THREE;
if(!T){$('error').hidden=false;$('error').textContent='Three.js를 읽지 못했습니다. ZIP을 전부 압축 해제한 뒤 index.html을 여세요.';return;}
const audio=new window.RallyAudio();
const contacts=Array.from({length:4},()=>({grounded:false,surface:2,slip:0}));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;
const cars=[
{name:'ALPINE 98',mass:1230,power:210,torque:360,wb:2.52,front:.5,color:0x2584ff,length:4.3,roof:1.43,rear:-.65,wing:1.2},
{name:'CRIMSON VI',mass:1260,power:220,torque:385,wb:2.51,front:.45,color:0xff4245,length:4.35,roof:1.4,rear:-.55,wing:1.55},
{name:'BOXER DELTA',mass:1150,power:195,torque:350,wb:2.48,front:.42,color:0xffd44c,length:3.9,roof:1.5,rear:-1.1,wing:1.25},
{name:'COMET GT',mass:1390,power:215,torque:400,wb:2.54,front:.56,color:0x54e5bf,length:4.45,roof:1.3,rear:-.6,wing:1.12},
{name:'NOVA R1',mass:1190,power:280,torque:440,wb:2.63,front:.48,color:0xe4e9ef,length:4,roof:1.48,rear:-1.05,wing:1.55}];
const tracks=[{name:'FINLAND FOREST',surface:2,width:10,ground:0x65834a,road:0xb89b74},
{name:'MONTE CARLO MOUNTAIN',surface:0,width:8,ground:0x777d6a,road:0x414b50},
{name:'PORTUGAL GRAVEL',surface:3,width:11,ground:0xb5a36c,road:0xbf946b},
{name:'KENYA SAFARI',surface:4,width:14,ground:0xc1b467,road:0xc5a273},
{name:'RALLYCROSS CIRCUIT',surface:0,width:12,ground:0x77896a,road:0x4a5557,circuit:true}];
const surfaceNames=['DRY ASPHALT','WET ASPHALT','HARD GRAVEL','LOOSE GRAVEL','SAND','MUD','SNOW','ICE','GRASS'];
const gripTable=[[1.15,.65,.67,.55,.42,.33,.27,.16,.5],[.86,.67,1.03,.94,.8,.65,.48,.24,.72],[.97,1.07,.74,.66,.57,.53,.4,.24,.61],[.73,.7,.72,.7,.65,.62,1.02,.65,.66]];
const longitudinal=[1.2,.8,1.02,.9,.76,.5,.4,.18,.7],lateral=[1.2,.82,1.08,.94,.8,.48,.4,.18,.78];
let renderer;try{renderer=new T.WebGLRenderer({canvas:$('game'),antialias:true,powerPreference:'high-performance'});}catch(e){$('error').hidden=false;$('error').textContent='WebGL 초기화 실패. Chrome 또는 Edge 설정에서 그래픽 가속을 켜세요.\n'+e.message;return;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;let shadowDirty=true;renderer.setClearColor(0xa0c3c2);renderer.outputColorSpace=T.SRGBColorSpace;
const scene=new T.Scene(),camera=new T.PerspectiveCamera(64,innerWidth/innerHeight,.05,4500);
scene.add(new T.HemisphereLight(0xf0f5df,0x475c51,2));
const sun=new T.DirectionalLight(0xfff5d4,2.7);sun.position.set(50,100,-35);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-50,right:50,top:50,bottom:-50,near:1,far:250});sun.shadow.bias=-.001;scene.add(sun);scene.add(sun.target);
const graphics=new window.RallyGraphics(renderer,scene);let graphicsStats={};
function material(color){return new T.MeshStandardMaterial({color,roughness:.83});}
function mesh(geo,mat,parent,position,scale){const o=new T.Mesh(geo,mat);o.castShadow=true;o.receiveShadow=true;if(position)o.position.set(...position);if(scale)o.scale.set(...scale);parent.add(o);return o;}
const cube=new T.BoxGeometry(1,1,1),wheelGeo=new T.CylinderGeometry(.33,.33,.23,32,3),sphere=new T.IcosahedronGeometry(1,2);
let world=new T.Group(),vehicle,body,wheelMeshes=[],steeringWheel,speedNeedle,rpmNeedle,gearCanvas,gearTexture,gearMesh;scene.add(world);
let sceneryColliders=[];
let samples=[],curve,trackLength=0,gates=[],activeTrack=0,activeCar=0,tire=1,weather=0;
let mode='menu',paused=false,countdown=3,time=0,lapTime=0,bestLap=Infinity,lap=1,nextGate=0,started=false,completed=false,cameraMode=0;
let state={x:0,y:0,z:0,vx:0,vy:0,vz:0,yaw:0,yawRate:0,steer:0,gear:1,rpm:950,shift:0,air:false};
let keys=new Set(),trailLast=[null,null,null,null],lastSurface=2,grips=[1,1,1,1],distance=0,impact=0,wasAirborne=false;
const fxCount=700,fxPos=new Float32Array(fxCount*3),fxColor=new Float32Array(fxCount*3),fxLife=new Float32Array(fxCount),fxVel=new Float32Array(fxCount*3);let fxCursor=0;
const fxGeo=new T.BufferGeometry();fxGeo.setAttribute('position',new T.BufferAttribute(fxPos,3));fxGeo.setAttribute('color',new T.BufferAttribute(fxColor,3));const fx=new T.Points(fxGeo,new T.PointsMaterial({size:.5,vertexColors:true,transparent:true,opacity:.55,depthWrite:false}));fx.frustumCulled=false;scene.add(fx);for(let i=0;i<fxCount;i++)fxPos[i*3+1]=-1000;
const markCount=1200,markPos=new Float32Array(markCount*18),markColors=new Float32Array(markCount*18),markLife=new Float32Array(markCount);let markCursor=0;const markGeo=new T.BufferGeometry();markGeo.setAttribute('position',new T.BufferAttribute(markPos,3));markGeo.setAttribute('color',new T.BufferAttribute(markColors,3));const marks=new T.Mesh(markGeo,new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide,transparent:true,opacity:.65,depthWrite:false}));marks.frustumCulled=false;scene.add(marks);
const rainCount=700,rainPos=new Float32Array(rainCount*3);const rainGeo=new T.BufferGeometry();rainGeo.setAttribute('position',new T.BufferAttribute(rainPos,3));const rain=new T.Points(rainGeo,new T.PointsMaterial({color:0xe8f2ff,size:.1,transparent:true,opacity:.7}));rain.frustumCulled=false;scene.add(rain);
function disposeGroup(group){const gs=new Set(),ms=new Set();group.traverse(o=>{if(o.geometry&&! [cube,wheelGeo,sphere].includes(o.geometry))gs.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>ms.add(m));});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());group.clear();}
function roadSurface(i){return tracks[activeTrack].circuit?(i/samples.length<.5?0:3):tracks[activeTrack].surface;}
function resolveSurface(s){if(weather===3)return s===1?7:6;if(weather===2){if(s===0)return 1;if([3,4,8].includes(s))return 5;}return s;}
function sampleAt(t){return curve.getPointAt(clamp(t,0,1));}
function directionAt(t){return curve.getTangentAt(clamp(t,0,1));}
function ribbon(width,yOffset,color,road=false){const points=[],colors=[],indices=[],c=new T.Color(color),white=new T.Color(0xe2e7e5),asphalt=new T.Color(0x414b50);for(let i=0;i<samples.length;i++){let p=samples[i],right=p.right;let col=weather===3?white:road&&tracks[activeTrack].circuit&&i<samples.length/2?asphalt:c;for(const side of [-1,1]){points.push(p.x+right.x*width*side,p.y+yOffset,p.z+right.z*width*side);colors.push(col.r,col.g,col.b);}if(i<samples.length-1){let a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();const m=graphics.detailMaterial(0xffffff,road?'road':'ground',weather);m.vertexColors=true;m.side=T.DoubleSide;return mesh(g,m,world);}
function rebuildWorld(){sceneryColliders=[];disposeGroup(world);let d=tracks[activeTrack],points=[];if(d.circuit)points=[[0,0,0],[0,1,250],[180,0,320],[260,6,180],[130,0,80],[240,0,-80],[60,0,-150]].map(p=>new T.Vector3(...p));else for(let i=0;i<19;i++)points.push(new T.Vector3(Math.sin(i*(activeTrack===1?1.7:.86))*(activeTrack===1?110:activeTrack===3?90:170),activeTrack===1?i*6+Math.sin(i)*6:Math.sin(i*1.1)*(activeTrack===3?3:12),i*150));curve=new T.CatmullRomCurve3(points,!!d.circuit,'centripetal');trackLength=curve.getLength();samples=[];const n=Math.ceil(trackLength/4);for(let i=0;i<=n;i++){let p=curve.getPointAt(i/n),dir=curve.getTangentAt(i/n),right=new T.Vector3(dir.z,0,-dir.x).normalize();samples.push({x:p.x,y:p.y,z:p.z,right,t:i/n});}ribbon(d.width*.5+5,-.12,weather===3?0xdce4e4:d.ground);ribbon(d.width/2,0,d.road,true);
 const lineMat=material(0xe9edcf),darkMat=material(0x123033),flagMat=material(0xd4ff42);
 let randomSeed=1931;const random=()=>{randomSeed=(randomSeed*1664525+1013904223)>>>0;return randomSeed/4294967296;};
 graphicsStats=graphics.buildLandscape(world,samples,d,weather,activeTrack,random,sceneryColliders);
 gates=[];for(let i=0;i<12;i++){const t=.01+.98*i/(d.circuit?12:11),p=sampleAt(t),dir=directionAt(t),right=new T.Vector3(dir.z,0,-dir.x).normalize();gates.push({p,dir,t});for(const side of [-1,1]){let post=mesh(cube,darkMat,world,[p.x+right.x*side*d.width*.52,p.y+2,p.z+right.z*side*d.width*.52],[.22,4,.22]);let flag=mesh(cube,i===0?flagMat:lineMat,world,[post.position.x,p.y+3.3,post.position.z],[.8,1,.12]);sceneryColliders.push({x:post.position.x,z:post.position.z,y:p.y,r:.2});flag.rotation.y=Math.atan2(dir.x,dir.z);}if(i===0||i===11&&!d.circuit){let arch=mesh(cube,flagMat,world,[p.x,p.y+4.1,p.z],[d.width+1,.4,.3]);arch.rotation.y=Math.atan2(dir.x,dir.z);}}
 const sky=weather===2?0x849aa6:weather===3?0xb9c9d2:0xa8c7c5;scene.background=new T.Color(sky);scene.fog=new T.Fog(sky,180,weather===2?1100:2400);sun.intensity=weather===0?2.7:1.4;rain.visible=weather>=2;rain.material.size=weather===3?.15:.06;
 $('location').innerHTML=d.name.replace(' ','<br>');$('spec').textContent=`${cars[activeCar].power} kW  /  ${cars[activeCar].mass} kg  /  AWD  ·  ${(trackLength/1000).toFixed(1)} km`;
 for(let i=0;i<rainCount;i++){rainPos[i*3]=random()*50-25;rainPos[i*3+1]=random()*25;rainPos[i*3+2]=random()*50-25;}
}
function createVehicle(){if(vehicle){scene.remove(vehicle);disposeGroup(vehicle);if(gearTexture)gearTexture.dispose();}vehicle=new T.Group();scene.add(vehicle);wheelMeshes=[];const d=cars[activeCar],paint=graphics.paint(d.color),black=material(0x14232b),glass=new T.MeshPhysicalMaterial({color:0x7fa4ae,metalness:.08,roughness:.12,transparent:true,opacity:.38,side:T.DoubleSide,depthWrite:false,envMapIntensity:.9}),white=material(0xe6eacb),red=material(0xf34c46);body=new T.Group();vehicle.add(body);
 const geo=graphics.bodyGeometry(d);mesh(geo,paint,body);let outline=mesh(geo,new T.MeshBasicMaterial({color:0x162733,side:T.BackSide}),body);outline.scale.set(1.012,1.022,1.01);

 let cabinGeo=new T.BufferGeometry();cabinGeo.setAttribute('position',new T.Float32BufferAttribute([-.79,.84,d.rear-.3,.79,.84,d.rear-.3,-.63,d.roof,d.rear,.63,d.roof,d.rear,-.62,d.roof,.28,.62,d.roof,.28,-.79,.84,.8,.79,.84,.8],3));cabinGeo.setIndex([0,2,1,1,2,3,2,4,3,3,4,5,0,6,2,2,6,4,1,3,7,3,5,7,4,6,5,5,6,7]);cabinGeo.computeVertexNormals();mesh(cabinGeo,glass,body);mesh(graphics.roundedBox(1.29,.09,.4-d.rear,.035),paint,body,[0,d.roof+.025,(d.rear+.28)/2]);
 for(let side of [-1,1]){let a=mesh(cube,paint,body,[side*.69,(d.roof+.84)/2,.54],[.07,d.roof-.7,.07]);a.rotation.x=.5;mesh(cube,black,body,[side*.55,d.wing-.13,-d.length*.4],[.07,.26,.12]);mesh(cube,white,body,[side*.5,.65,d.length*.48],[.4,.14,.1]);mesh(cube,red,body,[side*.53,.65,-d.length*.48],[.35,.12,.1]);mesh(cube,black,body,[side*.93,1.03,.5],[.2,.15,.25]);}mesh(cube,paint,body,[0,d.wing,-d.length*.4],[1.88,.11,.36]);mesh(cube,black,body,[0,.43,d.length*.48],[1.28,.15,.16]);
 for(let i=0;i<4;i++){const pose=new T.Group();pose.position.set(i%2?.79:-.79,.33,i<2?d.wb/2:-d.wb/2);vehicle.add(pose);let w=mesh(wheelGeo,black,pose);w.rotation.z=Math.PI/2;let rim=mesh(new T.CylinderGeometry(.21,.21,.24,20),black,pose);rim.rotation.z=Math.PI/2;wheelMeshes.push(pose);const rimRing=mesh(new T.TorusGeometry(.2,.025,8,32),white,pose,[(i%2?1:-1)*.135,0,0]);rimRing.rotation.y=Math.PI/2;
  const arch=mesh(new T.TorusGeometry(.38,.045,8,24,Math.PI),paint,body,[i%2?.83:-.83,.33,i<2?d.wb/2:-d.wb/2]);arch.rotation.y=Math.PI/2;
  const tread=mesh(new T.TorusGeometry(.282,.052,10,36),black,pose);tread.rotation.y=Math.PI/2;
  for(let j=0;j<6;j++){let a=j/6*Math.PI*2;let spoke=mesh(cube,white,pose,[(i%2?1:-1)*.13,Math.cos(a)*.11,Math.sin(a)*.11],[.025,.18,.035]);spoke.rotation.x=a;}
}
 mesh(graphics.roundedBox(1.42,.14,.16,.035),black,body,[0,.42,d.length*.49]);
 for(let k=0;k<4;k++)mesh(cube,black,body,[0,.47+k*.036,d.length*.495],[1.05,.012,.025]);
 mesh(graphics.roundedBox(.48,.065,.28,.025),black,body,[0,.88,.7]);
 for(let side of [-1,1]){
  mesh(graphics.roundedBox(.06,.055,.22,.018),black,body,[side*.875,.77,-.15]);
  mesh(graphics.roundedBox(.17,.13,.24,.03),paint,body,[side*.96,1.01,.42]);
  const seam=mesh(cube,black,body,[side*.871,.58,-.43],[.004,.25,.008]);
 }
 mesh(cube,black,body,[0,.93,.55],[1.48,.18,.45]);steeringWheel=new T.Group();steeringWheel.position.set(-.35,1.03,.22);body.add(steeringWheel);mesh(new T.TorusGeometry(.14,.018,12,32),black,steeringWheel);mesh(cube,black,steeringWheel,[0,0,0],[.24,.015,.02]);
 function gauge(x){let face=mesh(new T.CircleGeometry(.085,40),white,body,[x,1.075,.313]);face.rotation.y=Math.PI;const pivot=new T.Group();pivot.position.set(x,1.075,.306);body.add(pivot);mesh(cube,red,pivot,[0,.032,0],[.008,.067,.005]);return pivot;}speedNeedle=gauge(-.36);rpmNeedle=gauge(-.14);
 gearCanvas=document.createElement('canvas');gearCanvas.width=64;gearCanvas.height=64;gearTexture=new T.CanvasTexture(gearCanvas);gearMesh=mesh(new T.PlaneGeometry(.11,.11),new T.MeshBasicMaterial({map:gearTexture,side:T.DoubleSide}),body,[.065,1.075,.3]);gearMesh.rotation.y=Math.PI;
}
function nearest(x,z){let best=Infinity,index=0;for(let i=0;i<samples.length;i++){const p=samples[i],d=(p.x-x)**2+(p.z-z)**2;if(d<best){best=d;index=i;}}return {p:samples[index],index,dist:Math.sqrt(best)};}
function heightAt(x,z){const n=nearest(x,z),i=n.index;let best={y:n.p.y,dist:n.dist,t:n.p.t,index:i};for(const k of [i-1,i]){if(k<0||k>=samples.length-1)continue;const a=samples[k],b=samples[k+1],dx=b.x-a.x,dz=b.z-a.z,u=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1),dist=Math.hypot(x-a.x-dx*u,z-a.z-dz*u);if(dist<=best.dist)best={y:mix(a.y,b.y,u),dist,t:mix(a.t,b.t,u),index:k};}best.y=graphics.groundHeight(x,z,best.y,best.dist,tracks[activeTrack].width,activeTrack);return best;}
function spawn(t=.002){shadowDirty=true;const p=sampleAt(t),dir=directionAt(t);Object.assign(state,{x:p.x,y:p.y+.01,z:p.z,vx:0,vy:0,vz:0,yaw:Math.atan2(dir.x,dir.z),yawRate:0,steer:0,gear:1,rpm:950,shift:0,air:false});trailLast.fill(null);cameraMode=0;vehicle.position.set(state.x,state.y,state.z);vehicle.rotation.y=state.yaw;camera.position.set(state.x-Math.sin(state.yaw)*7,state.y+3,state.z-Math.cos(state.yaw)*7);if(mode==='menu'){camera.position.set(state.x+Math.sin(state.yaw+.65)*7.8,state.y+2.8,state.z+Math.cos(state.yaw+.65)*7.8);}camera.lookAt(state.x,state.y+1,state.z);}
function startRace(){audio.reset();audio.unlock().then(ok=>{if(ok)audio.event('start');});mode='race';paused=false;completed=false;started=false;countdown=3;time=lapTime=0;lap=1;bestLap=Infinity;nextGate=0;distance=0;wasAirborne=false;keys.clear();spawn();clearEffects();$('menu').hidden=true;$('worldLabel').hidden=true;$('hud').hidden=false;$('overlay').hidden=true;$('message').hidden=false;renderer.domElement.focus();}
function clearEffects(){fxLife.fill(0);markLife.fill(0);markPos.fill(0);markGeo.attributes.position.needsUpdate=true;trailLast.fill(null);}
function recover(){if(mode!=='race'||paused||completed)return;audio.event('recover');let t=nextGate===0?(tracks[activeTrack].circuit&&started?.9:.002):gates[nextGate-1].t;spawn(Math.max(.001,t-.001));if(started)time+=5;}
function finish(){audio.event('finish');completed=true;showOverlay(true);let best=Infinity;const key=`cartoon-rally-browser-v1:${activeCar}:${activeTrack}:${tire}:${weather}`;try{best=Number(localStorage.getItem(key))||Infinity;if(time<best){best=time;localStorage.setItem(key,String(time));}}catch{}$('result').innerHTML=`TIME ${clock(time)}<br>BEST ${clock(best)}${tracks[activeTrack].circuit?'<br>BEST LAP '+clock(bestLap):''}`;}
function showOverlay(done=false){$('overlay').hidden=false;$('overlayTitle').textContent=done?'STAGE COMPLETE':'PAUSED';$('resume').hidden=done;$('result').textContent=done?'':'잠시 숨을 고르고, 다시 출발하세요.';}
function emit(x,y,z,color,vx=0,vz=0){let i=fxCursor++%fxCount;fxPos.set([x,y,z],i*3);fxColor.set(color,i*3);fxVel.set([vx,.9+Math.random(),vz],i*3);fxLife[i]=.65+Math.random()*.55;}
function skid(i,x,y,z,surface){const p=trailLast[i];if(p&&Math.hypot(x-p.x,z-p.z)>.2){let dx=x-p.x,dz=z-p.z,dist=Math.hypot(dx,dz);if(dist<4){let rx=dz/dist*.12,rz=-dx/dist*.12,k=markCursor++%markCount;markPos.set([p.x-rx,p.y,p.z-rz,p.x+rx,p.y,p.z+rz,x+rx,y,z+rz,p.x-rx,p.y,p.z-rz,x+rx,y,z+rz,x-rx,y,z-rz],k*18);let c=surface===6?[.5,.6,.66]:surface===0?[.08,.09,.09]:[.3,.21,.14];for(let j=0;j<6;j++)markColors.set(c,k*18+j*3);markLife[k]=45;markGeo.attributes.position.needsUpdate=true;markGeo.attributes.color.needsUpdate=true;}trailLast[i]={x,y,z};}else if(!p)trailLast[i]={x,y,z};}
function collideScenery(){
 for(const obstacle of sceneryColliders){
  if(Math.abs(state.y-obstacle.y)>3||Math.abs(state.x-obstacle.x)>4||Math.abs(state.z-obstacle.z)>4)continue;
  for(const offset of [-1.15,0,1.15]){
   const x=state.x+Math.sin(state.yaw)*offset,z=state.z+Math.cos(state.yaw)*offset,dx=x-obstacle.x,dz=z-obstacle.z,dist=Math.hypot(dx,dz),radius=obstacle.r+.65;
   if(dist>=radius)continue;
   const nx=dist>.001?dx/dist:1,nz=dist>.001?dz/dist:0,closing=state.vx*nx+state.vz*nz;
   state.x+=nx*(radius-dist+.005);state.z+=nz*(radius-dist+.005);
   if(closing<0){state.vx-=nx*closing*1.15;state.vz-=nz*closing*1.15;state.yawRate*=.7;
    if(closing<-1&&audio.context&&audio.context.currentTime>audio.nextImpact){audio.event('collision',clamp(-closing/10,.2,1));audio.nextImpact=audio.context.currentTime+.25;}
   }
  }
 }
}
function physics(dt){
 const d=cars[activeCar],speed=Math.hypot(state.vx,state.vz),sy=Math.sin(state.yaw),cy=Math.cos(state.yaw),forwardSpeed=state.vx*sy+state.vz*cy;
 const gas=keys.has('KeyJ'),brake=keys.has('KeyK'),hand=keys.has('KeyL');
 if(Math.abs(forwardSpeed)<.4&&gas!==brake){if(brake&&state.gear>0){state.gear=-1;state.shift=.2;}if(gas&&state.gear<0){state.gear=1;state.shift=.2;}}
 const ratios=[3.2,2.1,1.55,1.2,.98,.8];let ratio=state.gear<0?-3.1:ratios[state.gear-1];state.shift=Math.max(0,state.shift-dt);
 state.rpm=mix(state.rpm,clamp(Math.abs(forwardSpeed*ratio)/.33*4.1*30/Math.PI,950,7500),1-Math.exp(-12*dt));
 if(state.gear>0&&state.shift===0){if(state.rpm>6600&&state.gear<6){state.gear++;state.shift=.18;}else if(state.gear>1&&state.rpm<(gas?3200:2300)){state.gear--;state.shift=.18;}}
 state.steer=mix(state.steer,(keys.has('KeyA')?1:0)-(keys.has('KeyD')?1:0),1-Math.exp(-10*dt));let steerAngle=state.steer*.43*mix(1,.2,clamp(speed/32,0,1));
 let powering=state.gear<0?brake&&!gas:gas&&!brake,braking=(state.gear<0?gas:brake)||gas&&brake;
 let torqueCurve=state.rpm<3750?mix(.5,1,state.rpm/3750):mix(1,.65,(state.rpm-3750)/3750);
 let engine=powering?Math.min(d.torque*torqueCurve,d.power*1000/Math.max(100,state.rpm*Math.PI/30))*ratio*4.1*.88/.33*(state.shift>0?.15:1):0;if(state.rpm>7400)engine=0;
 let fxTotal=0,fzTotal=0,yawTorque=0,grounded=0;
 const road=heightAt(state.x,state.z),groundY=road.dist<400?road.y:-12;
 let air=state.y>groundY+.45;state.air=air;if(air)wasAirborne=true;
 for(let i=0;i<4;i++){
  let lx=i%2?.79:-.79,lz=i<2?d.wb/2:-d.wb/2,rx=lx*cy+lz*sy,rz=-lx*sy+lz*cy,x=state.x+rx,z=state.z+rz,h=heightAt(x,z);
  let surface=resolveSurface(h.dist<tracks[activeTrack].width/2?roadSurface(h.index):8);lastSurface=surface;
  grips[i]=mix(grips[i],gripTable[tire][surface],1-Math.exp(-4*dt));
  contacts[i].surface=surface;contacts[i].grounded=!air;contacts[i].slip=0;
  if(air){trailLast[i]=null;continue;}grounded++;
  let a=state.yaw+(i<2?steerAngle:0),s=Math.sin(a),c=Math.cos(a),vx=state.vx+state.yawRate*rz,vz=state.vz-state.yawRate*rx,vlong=vx*s+vz*c,vside=vx*c-vz*s;
  let load=d.mass*9.81/4,muX=grips[i]*longitudinal[surface],muY=grips[i]*lateral[surface]*(hand&&i>=2?.40:i>=2?1.1:1);
  let fLong=engine*(i<2?d.front:1-d.front)*.5;
  if(braking||hand&&i>=2){fLong-=Math.sign(vlong)*Math.min(Math.abs(vlong)*d.mass/(4*dt),braking?8200:11000);}
  let roll=[.012,.015,.028,.035,.065,.08,.035,.008,.05][surface];fLong-=vlong*d.mass*roll*.2;
  let fSide=-vside*d.mass*.25*(surface<2?11:9);
  // Friction ellipse, separately evaluated at the contact of each wheel.
  let usage=Math.sqrt((fLong/(muX*load))**2+(fSide/(muY*load))**2);if(usage>1){fLong/=usage;fSide/=usage;}
  let fx=fLong*s+fSide*c,fz=fLong*c-fSide*s;fxTotal+=fx;fzTotal+=fz;yawTorque+=rz*fx-rx*fz;
  const slip=Math.abs(vside)/Math.max(3,Math.abs(vlong));contacts[i].slip=slip+(powering?Math.min(.4,Math.max(0,usage-1)*.18):0);
  if(speed>3&&(surface!==0||slip>.18)&&Math.random()<dt*45){let color=surface===6?[.95,.98,1]:surface===1?[.7,.85,.95]:surface===5?[.35,.25,.16]:surface===0?[.7,.72,.73]:[.75,.62,.43];emit(x,h.y+.15,z,color,-state.vx*.05,-state.vz*.05);}
  if(speed>2&&slip>.13)skid(i,x,h.y+.04,z,surface);else trailLast[i]=null;
 }
 fxTotal-=state.vx*speed*.43;fzTotal-=state.vz*speed*.43;
 state.vx+=fxTotal/d.mass*dt;state.vz+=fzTotal/d.mass*dt;state.yawRate+=yawTorque/(d.mass*1.35)*dt;state.yawRate*=Math.exp(-(air?.15:.25)*dt);state.yaw+=state.yawRate*dt;
 const previous=new T.Vector3(state.x,state.y,state.z);state.x+=state.vx*dt;state.z+=state.vz*dt;distance+=speed*dt;
 collideScenery();
 const after=heightAt(state.x,state.z),floor=after.dist<400?after.y:-12;
 // Gravity and spring support follow the spline, allowing crests to launch the car.
 state.vy-=9.81*dt;state.y+=state.vy*dt;
 if(state.y<floor){if(wasAirborne){audio.event('landing',clamp(Math.abs(state.vy)/8,.25,1));wasAirborne=false;}impact=Math.min(1,Math.abs(state.vy)/12);state.y=floor;state.vy=(floor-groundY)/dt;state.vy=clamp(state.vy,-12,18);}
 if(grounded>0&&speed>1&&Math.random()<dt*15)emit(state.x-sy*2,state.y+.4,state.z-cy*2,[.4,.45,.45]);
 if(started){time+=dt;lapTime+=dt;}
 const gate=gates[nextGate],a=(previous.x-gate.p.x)*gate.dir.x+(previous.z-gate.p.z)*gate.dir.z,b=(state.x-gate.p.x)*gate.dir.x+(state.z-gate.p.z)*gate.dir.z;
 if(a<0&&b>=0){const u=-a/(b-a),px=mix(previous.x,state.x,u)-gate.p.x,pz=mix(previous.z,state.z,u)-gate.p.z,side=px*gate.dir.z-pz*gate.dir.x;
  if(Math.abs(side)<tracks[activeTrack].width*.65&&Math.abs(state.y-gate.p.y)<5){if(!started){audio.event('checkpoint');started=true;nextGate=1;}
   else if(tracks[activeTrack].circuit){if(nextGate===0){audio.event('lap');bestLap=Math.min(bestLap,lapTime);lapTime=0;if(lap===3)finish();else{lap++;nextGate=1;}}else {audio.event('checkpoint');nextGate=(nextGate+1)%12;}}
   else if(nextGate===11)finish();else {audio.event('checkpoint');nextGate++;}
  }
 }
}
function clock(t){return !Number.isFinite(t)?'--:--.---':`${String(Math.floor(t/60)).padStart(2,'0')}:${(t%60).toFixed(3).padStart(6,'0')}`;}
let lastGear='';function visual(dt,elapsed){
 vehicle.position.set(state.x,state.y,state.z);vehicle.rotation.y=state.yaw;
 const speed=Math.hypot(state.vx,state.vz),surface=heightAt(state.x,state.z),tangent=directionAt(surface.t);
 body.rotation.x=mix(body.rotation.x,-Math.atan2(tangent.y,Math.hypot(tangent.x,tangent.z)),1-Math.exp(-7*dt));body.rotation.z=mix(body.rotation.z,-state.steer*clamp(speed*.003,0,.07),1-Math.exp(-5*dt));
 for(let i=0;i<4;i++){wheelMeshes[i].rotation.y=i<2?state.steer*.45:0;wheelMeshes[i].children.forEach(o=>{o.rotation.x+=speed/.33*dt;});}
 steeringWheel.rotation.z=-state.steer*2.7;speedNeedle.rotation.z=2.3-speed*3.6/240*4.6;rpmNeedle.rotation.z=2.3-state.rpm/7500*4.6;
 const gear=state.gear<0?'R':String(state.gear);if(lastGear!==gear){let ctx=gearCanvas.getContext('2d');ctx.fillStyle='#13282d';ctx.fillRect(0,0,64,64);ctx.fillStyle='#d4ff42';ctx.font='bold 48px sans-serif';ctx.textAlign='center';ctx.fillText(gear,32,50);gearTexture.needsUpdate=true;lastGear=gear;}
 let local=cameraMode===0?new T.Vector3(0,3,-7-speed*.025):cameraMode===1?new T.Vector3(0,4.8,-11-speed*.025):cameraMode===2?new T.Vector3(0,.85,cars[activeCar].length*.52):new T.Vector3(-.35,1.19,-.05);
 let target,look;if(mode==='menu'){let a=state.yaw+.65+Math.sin(elapsed*.12)*.22;target=new T.Vector3(state.x+Math.sin(a)*7.8,state.y+2.8,state.z+Math.cos(a)*7.8);look=vehicle.position.clone().add(new T.Vector3(-Math.cos(a)*2.4,.75,Math.sin(a)*2.4));}
 else {target=vehicle.localToWorld(local);look=cameraMode<2?vehicle.localToWorld(new T.Vector3(0,1.1,4)):vehicle.localToWorld(new T.Vector3(local.x,local.y,30));const h=heightAt(target.x,target.z);if(cameraMode<2)target.y=Math.max(target.y,h.y+.6);}
 camera.position.lerp(target,cameraMode>=2&&mode==='race'?1:1-Math.exp(-7*dt));camera.lookAt(look);camera.fov=mix(camera.fov,(cameraMode===1?76:64)+clamp(speed*.1,0,8),1-Math.exp(-4*dt));camera.updateProjectionMatrix();
 sun.position.set(state.x+50,state.y+100,state.z-35);sun.target.position.set(state.x,state.y,state.z);
 for(let i=0;i<fxCount;i++){if(fxLife[i]>0){fxLife[i]-=dt;for(let k=0;k<3;k++)fxPos[i*3+k]+=fxVel[i*3+k]*dt;}else fxPos[i*3+1]=-1000;}fxGeo.attributes.position.needsUpdate=true;fxGeo.attributes.color.needsUpdate=true;
 let expired=false;for(let i=0;i<markCount;i++)if(markLife[i]>0){markLife[i]-=dt;if(markLife[i]<=0){markPos.fill(0,i*18,i*18+18);expired=true;}}if(expired)markGeo.attributes.position.needsUpdate=true;
 if(rain.visible){rain.position.set(state.x,state.y,state.z);for(let i=0;i<rainCount;i++){rainPos[i*3+1]-=dt*(weather===3?3:24);if(rainPos[i*3+1]<0)rainPos[i*3+1]=25;}rainGeo.attributes.position.needsUpdate=true;}
 $('speed').textContent=String(Math.round(speed*3.6)).padStart(3,'0');$('gear').textContent=gear;$('timer').textContent=clock(time);$('rpm').textContent=`${Math.round(state.rpm)} RPM`;$('rpmBar').style.width=(state.rpm/7500*100)+'%';$('surface').textContent=state.air?'AIRBORNE':surfaceNames[lastSurface];$('progress').textContent=tracks[activeTrack].circuit?`LAP ${lap} / 3  ·  GATE ${nextGate+1} / 12  ·  ${clock(lapTime)}`:`GATE ${nextGate+1} / 12${started?'':' · CROSS START TO BEGIN'}`;
 $('cameraLabel').textContent=['01 / CHASE','02 / WIDE CHASE','03 / BUMPER','04 / COCKPIT'][cameraMode];
}
function choose(){activeCar=+$('carSelect').value;activeTrack=+$('trackSelect').value;tire=+$('tireSelect').value;weather=+$('weatherSelect').value;rebuildWorld();createVehicle();lastGear='';spawn(.08);}
cars.forEach((d,i)=>$('carSelect').add(new Option(d.name,i)));tracks.forEach((d,i)=>$('trackSelect').add(new Option(d.name,i)));for(const id of ['carSelect','trackSelect','tireSelect','weatherSelect'])$(id).addEventListener('change',choose);
$('start').onclick=startRace;$('restart').onclick=startRace;$('resume').onclick=()=>{audio.event('resume');paused=false;$('overlay').hidden=true;};$('mainMenu').onclick=()=>{mode='menu';audio.hush();paused=false;keys.clear();$('menu').hidden=false;$('worldLabel').hidden=false;$('hud').hidden=true;$('message').hidden=true;$('overlay').hidden=true;spawn(.08);};
window.addEventListener('keydown',e=>{if(e.target.tagName==='SELECT')return;if(['KeyA','KeyD','KeyJ','KeyK','KeyL','KeyC','KeyR','Escape'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.repeat)return;if(e.code==='KeyC'&&mode==='race'&&!paused){cameraMode=(cameraMode+1)%4;audio.event('camera');}if(e.code==='KeyR')recover();if(e.code==='Escape'&&mode==='race'&&!completed){paused=!paused;audio.event(paused?'pause':'resume');if(paused){audio.hush();showOverlay();}else $('overlay').hidden=true;}});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();audio.hush();if(mode==='race'&&!completed){paused=true;showOverlay();}});document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();audio.hush();if(mode==='race'&&!completed){paused=true;showOverlay();}}});
window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});
function soundToggle(){audio.setMuted(!audio.muted);$('mute').textContent=audio.muted?'SOUND OFF':'SOUND ON';$('mute').setAttribute('aria-pressed',String(audio.muted));}
$('mute').onclick=soundToggle;$('volume').addEventListener('input',e=>audio.setVolume(+e.target.value/100));
document.addEventListener('pointerdown',()=>{audio.unlock();},{capture:true});
document.addEventListener('keydown',e=>{if(e.code==='KeyM'&&!e.repeat)soundToggle();audio.unlock();});
document.addEventListener('click',e=>{if(e.target.closest('button')&&!e.target.closest('#mute'))audio.event('menu');});
for(const id of ['carSelect','trackSelect','tireSelect','weatherSelect'])$(id).addEventListener('change',()=>audio.event('menu'));
choose();let previous=performance.now(),accumulator=0,elapsed=0,frames=0;
function animate(now){requestAnimationFrame(animate);let wallDT=clamp((now-previous)/1000,0,.5),dt=Math.min(wallDT,.05);previous=now;elapsed+=dt;
 if(mode==='race'&&!paused&&!completed){if(countdown>0){countdown-=wallDT;let beat=Math.max(0,Math.ceil(countdown));if(beat!==audio.lastCountdown){audio.event(beat===0?'go':'countdown');audio.lastCountdown=beat;}$('message').textContent=Math.ceil(countdown)>0?Math.ceil(countdown):'GO';if(countdown<=0)$('message').hidden=true;}else{accumulator+=dt;let steps=0;while(accumulator>=1/120&&steps++<8){physics(1/120);accumulator-=1/120;if(completed)break;}}}
 else accumulator=0;
 audio.update({racing:mode==='race',paused,finished:completed,rpm:state.rpm,speed:Math.hypot(state.vx,state.vz),gear:state.gear,shifting:state.shift>0,throttle:keys.has(state.gear<0?'KeyK':'KeyJ')&&countdown<=0,handbrake:keys.has('KeyL'),camera:cameraMode,car:activeCar,weather,contacts});
 graphics.update(vehicle.position,weather);if(graphics.grassShader)graphics.grassShader.uniforms.rallyTime.value=elapsed;
 visual(paused?0:dt,elapsed);renderer.shadowMap.needsUpdate=shadowDirty||(mode==='race'&&!paused);shadowDirty=false;renderer.render(scene,camera);frames++;
}
requestAnimationFrame(animate);
function geoTriangleCount(){let count=0;vehicle.traverse(o=>{if(o.geometry)count+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;});return count;}
// Read-only state for smoke tests and bug reports; no automation can complete a race.
window.RallyTest={snapshot:()=>({mode,paused,countdown,time,lap,nextGate,started,completed,cameraMode,speed:Math.hypot(state.vx,state.vz)*3.6,signedSpeed:(state.vx*Math.sin(state.yaw)+state.vz*Math.cos(state.yaw))*3.6,lateralSpeed:state.vx*Math.cos(state.yaw)-state.vz*Math.sin(state.yaw),slip:contacts.reduce((sum,c)=>sum+c.slip,0)/4,yaw:state.yaw,steer:state.steer,gear:state.gear,rpm:state.rpm,x:state.x,y:state.y,z:state.z,air:state.air,frames,trackLength,car:activeCar,track:activeTrack,tire,weather,cameraDistance:camera.position.distanceTo(vehicle.position),cameraPosition:camera.position.toArray(),vehiclePosition:vehicle.position.toArray(),graphics:graphicsStats,vehicleTriangles:geoTriangleCount(),audio:audio.snapshot(),webgl:!!renderer.getContext(),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles}),grip:(t,s,w)=>{let old=weather;weather=w;let resolved=resolveSurface(s);weather=old;return gripTable[t][resolved]*longitudinal[resolved];}};
})();
