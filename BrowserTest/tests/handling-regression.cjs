// Executes the real physics function against a flat gravel fixture at 72 km/h.
const fs=require('fs'),vm=require('vm');
function simulate(path,keyList=['KeyD']){const code=fs.readFileSync(path,'utf8');const physics=code.slice(code.indexOf('function physics(dt){'),code.indexOf('\nfunction clock('));
 const arrays=code.slice(code.indexOf('const gripTable='),code.indexOf('let renderer;'));
 const script=`const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;${arrays}
 const cars=[{mass:1230,power:210,torque:360,wb:2.52,front:.5}];let state={x:0,y:0,z:0,vx:0,vy:0,vz:20,yaw:0,yawRate:0,steer:0,gear:2,rpm:3500,shift:0,air:false};
 const contacts=Array.from({length:4},()=>({})),grips=[1,1,1,1],trailLast=[null,null,null,null];let keys=new Set(['KeyD']),activeCar=0,tire=1,weather=0,activeTrack=0,lastSurface=2,distance=0,impact=0,wasAirborne=false,started=false,time=0,lapTime=0,nextGate=0;const tracks=[{width:10}],gates=[{p:{x:1e9,z:1e9,y:0},dir:{x:0,z:1},t:1}];
 const T={Vector3:class{constructor(x,y,z){this.x=x;this.y=y;this.z=z;}}};const audio={event(){},context:null};
 function heightAt(){return {y:0,dist:0,index:0,t:0};}function resolveSurface(s){return s;}function roadSurface(){return 2;}function emit(){}function skid(){}function collideScenery(){}function finish(){}
 ${physics}
 let peak=0;for(let i=0;i<72;i++){physics(1/120);peak=Math.max(peak,Math.abs(state.vx*Math.cos(state.yaw)-state.vz*Math.sin(state.yaw)));}
 keys.clear();for(let i=0;i<120;i++)physics(1/120);return {peakLateral:peak,residualLateral:Math.abs(state.vx*Math.cos(state.yaw)-state.vz*Math.sin(state.yaw)),yaw:state.yaw};`;
 const configured=script.replace("new Set(['KeyD'])",'new Set('+JSON.stringify(keyList)+')');
 return vm.runInNewContext(`(()=>{${configured}})()`,{Math});}
const baseline=simulate(require('path').join(__dirname,'fixtures/handling-v1.js')),current=simulate(require('path').join(__dirname,'../game.js'));console.log({baseline,current});if(!(current.peakLateral<baseline.peakLateral&&current.residualLateral<baseline.residualLateral))throw Error('Grip handling did not improve');if(!(current.yaw<0))throw Error('D is not right');

const path=require('path').join(__dirname,'../game.js');
const left=simulate(path,['KeyA']),handbrake=simulate(path,['KeyD','KeyL']);
if(!(left.yaw>0&&current.yaw<0))throw Error('A/D steering directions are wrong');
if(!(handbrake.peakLateral>current.peakLateral))throw Error('Handbrake should retain intentional drift');
console.log('A left / D right passed; handbrake peak lateral:',handbrake.peakLateral);
