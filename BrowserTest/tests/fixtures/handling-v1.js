// Frozen physics from browser ZIP commit 7cad805; test fixture only.
const gripTable=[[1.15,.65,.67,.55,.42,.33,.27,.16,.5],[.86,.67,1.03,.94,.8,.65,.48,.24,.72],[.97,1.07,.74,.66,.57,.53,.4,.24,.61],[.73,.7,.72,.7,.65,.62,1.02,.65,.66]];
const longitudinal=[1.2,.8,.9,.76,.62,.5,.4,.18,.62],lateral=[1.15,.74,.8,.64,.52,.42,.35,.16,.55];

let renderer;
function physics(dt){
 const d=cars[activeCar],speed=Math.hypot(state.vx,state.vz),sy=Math.sin(state.yaw),cy=Math.cos(state.yaw),forwardSpeed=state.vx*sy+state.vz*cy;
 const gas=keys.has('KeyJ'),brake=keys.has('KeyK'),hand=keys.has('KeyL');
 if(Math.abs(forwardSpeed)<.4&&gas!==brake){if(brake&&state.gear>0){state.gear=-1;state.shift=.2;}if(gas&&state.gear<0){state.gear=1;state.shift=.2;}}
 const ratios=[3.2,2.1,1.55,1.2,.98,.8];let ratio=state.gear<0?-3.1:ratios[state.gear-1];state.shift=Math.max(0,state.shift-dt);
 state.rpm=mix(state.rpm,clamp(Math.abs(forwardSpeed*ratio)/.33*4.1*30/Math.PI,950,7500),1-Math.exp(-12*dt));
 if(state.gear>0&&state.shift===0){if(state.rpm>6600&&state.gear<6){state.gear++;state.shift=.18;}else if(state.gear>1&&state.rpm<(gas?3200:2300)){state.gear--;state.shift=.18;}}
 state.steer=mix(state.steer,(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0),1-Math.exp(-6*dt));let steerAngle=state.steer*.56*mix(1,.28,clamp(speed/45,0,1));
 let powering=state.gear<0?brake&&!gas:gas&&!brake,braking=(state.gear<0?gas:brake)||gas&&brake;
 let torqueCurve=state.rpm<3750?mix(.5,1,state.rpm/3750):mix(1,.65,(state.rpm-3750)/3750);
 let engine=powering?Math.min(d.torque*torqueCurve,d.power*1000/Math.max(100,state.rpm*Math.PI/30))*ratio*4.1*.88/.33*(state.shift>0?.15:1):0;if(state.rpm>7400)engine=0;
 let fxTotal=0,fzTotal=0,yawTorque=0,grounded=0;
 const road=heightAt(state.x,state.z),groundY=road.dist<95?road.y:-12;
 let air=state.y>groundY+.45;state.air=air;
 for(let i=0;i<4;i++){
  let lx=i%2?.79:-.79,lz=i<2?d.wb/2:-d.wb/2,rx=lx*cy+lz*sy,rz=-lx*sy+lz*cy,x=state.x+rx,z=state.z+rz,h=heightAt(x,z);
  let surface=resolveSurface(h.dist<tracks[activeTrack].width/2?roadSurface(h.index):8);lastSurface=surface;
  grips[i]=mix(grips[i],gripTable[tire][surface],1-Math.exp(-4*dt));
  if(air){trailLast[i]=null;continue;}grounded++;
  let a=state.yaw+(i<2?steerAngle:0),s=Math.sin(a),c=Math.cos(a),vx=state.vx+state.yawRate*rz,vz=state.vz-state.yawRate*rx,vlong=vx*s+vz*c,vside=vx*c-vz*s;
  let load=d.mass*9.81/4,muX=grips[i]*longitudinal[surface],muY=grips[i]*lateral[surface]*(hand&&i>=2?.34:1);
  let fLong=engine*(i<2?d.front:1-d.front)*.5;
  if(braking||hand&&i>=2){fLong-=Math.sign(vlong)*Math.min(Math.abs(vlong)*d.mass/(4*dt),braking?8200:11000);}
  let roll=[.012,.015,.028,.035,.065,.08,.035,.008,.05][surface];fLong-=vlong*d.mass*roll*.2;
  let fSide=-vside*d.mass*.25*(surface<2?8:5.5);
  // Friction ellipse, separately evaluated at the contact of each wheel.
  let usage=Math.sqrt((fLong/(muX*load))**2+(fSide/(muY*load))**2);if(usage>1){fLong/=usage;fSide/=usage;}
  let fx=fLong*s+fSide*c,fz=fLong*c-fSide*s;fxTotal+=fx;fzTotal+=fz;yawTorque+=rz*fx-rx*fz;
  const slip=Math.abs(vside)/Math.max(3,Math.abs(vlong));
  if(speed>3&&(surface!==0||slip>.18)&&Math.random()<dt*45){let color=surface===6?[.95,.98,1]:surface===1?[.7,.85,.95]:surface===5?[.35,.25,.16]:surface===0?[.7,.72,.73]:[.75,.62,.43];emit(x,h.y+.15,z,color,-state.vx*.05,-state.vz*.05);}
  if(speed>2&&slip>.13)skid(i,x,h.y+.04,z,surface);else trailLast[i]=null;
 }
 fxTotal-=state.vx*speed*.43;fzTotal-=state.vz*speed*.43;
 state.vx+=fxTotal/d.mass*dt;state.vz+=fzTotal/d.mass*dt;state.yawRate+=yawTorque/(d.mass*1.35)*dt;state.yawRate*=Math.exp(-(air?.15:.25)*dt);state.yaw+=state.yawRate*dt;
 const previous=new T.Vector3(state.x,state.y,state.z);state.x+=state.vx*dt;state.z+=state.vz*dt;distance+=speed*dt;
 const after=heightAt(state.x,state.z),floor=after.dist<95?after.y:-12;
 // Gravity and spring support follow the spline, allowing crests to launch the car.
 state.vy-=9.81*dt;state.y+=state.vy*dt;
 if(state.y<floor){impact=Math.min(1,Math.abs(state.vy)/12);state.y=floor;state.vy=(floor-groundY)/dt;state.vy=clamp(state.vy,-12,18);}
 if(grounded>0&&speed>1&&Math.random()<dt*15)emit(state.x-sy*2,state.y+.4,state.z-cy*2,[.4,.45,.45]);
 if(started){time+=dt;lapTime+=dt;}
 const gate=gates[nextGate],a=(previous.x-gate.p.x)*gate.dir.x+(previous.z-gate.p.z)*gate.dir.z,b=(state.x-gate.p.x)*gate.dir.x+(state.z-gate.p.z)*gate.dir.z;
 if(a<0&&b>=0){const u=-a/(b-a),px=mix(previous.x,state.x,u)-gate.p.x,pz=mix(previous.z,state.z,u)-gate.p.z,side=px*gate.dir.z-pz*gate.dir.x;
  if(Math.abs(side)<tracks[activeTrack].width*.65&&Math.abs(state.y-gate.p.y)<5){if(!started){started=true;nextGate=1;}
   else if(tracks[activeTrack].circuit){if(nextGate===0){bestLap=Math.min(bestLap,lapTime);lapTime=0;if(lap===3)finish();else{lap++;nextGate=1;}}else nextGate=(nextGate+1)%12;}
   else if(nextGate===11)finish();else nextGate++;
  }
 }
}
function clock() {}
