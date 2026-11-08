/* Original procedural sound synthesis. No samples, music, downloads or microphone. */
'use strict';
class RallyAudio {
 constructor(){this.context=null;this.volume=.65;this.muted=false;this.events={};this.wheels=[];this.lastGear=null;this.lastHand=false;this.lastCountdown=null;this.nextImpact=0;this.activeVoices=0;}
 async unlock(){
  try {
   if(!this.context)this.build();
   if(this.context.state!=='running')await this.context.resume();
   return this.context.state==='running';
  }catch(e){this.error=e.message;return false;}
 }
 build(){
  const Context=window.AudioContext||window.webkitAudioContext;if(!Context)throw Error('Web Audio not supported');
  const c=this.context=new Context();this.master=c.createGain();this.master.gain.value=this.volume;
  this.compressor=c.createDynamicsCompressor();this.compressor.threshold.value=-16;this.compressor.ratio.value=5;this.compressor.connect(this.master);this.master.connect(c.destination);
  this.analyser=c.createAnalyser();this.analyser.fftSize=1024;this.master.connect(this.analyser);this.meter=new Float32Array(1024);
  this.noise=c.createBuffer(1,c.sampleRate*2,c.sampleRate);const data=this.noise.getChannelData(0);let seed=713;for(let i=0;i<data.length;i++){seed=(seed*1664525+1013904223)>>>0;data[i]=seed/2147483648-1;}
  this.motor=this.toneLoop('sawtooth',70);this.harmonic=this.toneLoop('triangle',140);this.exhaust=this.noiseLoop('lowpass',190);this.turbo=this.noiseLoop('bandpass',1800);this.gearWhine=this.toneLoop('sine',250);this.wind=this.noiseLoop('lowpass',900);this.rain=this.noiseLoop('highpass',1400);this.snow=this.noiseLoop('lowpass',500);
  for(let i=0;i<4;i++)this.wheels.push({roll:this.noiseLoop('lowpass',650,i%2?-.5:.5),slip:this.noiseLoop('bandpass',1600,i%2?-.65:.65),squeal:this.toneLoop('triangle',850,i%2?-.6:.6)});
 }
 output(gain,pan=0){const c=this.context,g=c.createGain();g.gain.value=gain;const p=c.createStereoPanner();p.pan.value=pan;g.connect(p);p.connect(this.compressor);return {gain:g,panner:p};}
 toneLoop(type,freq,pan=0){const c=this.context,o=c.createOscillator(),out=this.output(0,pan);o.type=type;o.frequency.value=freq;o.connect(out.gain);o.start();return {...out,source:o};}
 noiseLoop(type,freq,pan=0){const c=this.context,o=c.createBufferSource(),f=c.createBiquadFilter(),out=this.output(0,pan);o.buffer=this.noise;o.loop=true;f.type=type;f.frequency.value=freq;f.Q.value=.7;o.connect(f);f.connect(out.gain);o.start();return {...out,source:o,filter:f};}
 smooth(param,value,seconds=.055){param.setTargetAtTime(Number.isFinite(value)?value:0,this.context.currentTime,seconds);}
 setVolume(value){this.volume=Math.max(0,Math.min(1,value));if(this.context)this.smooth(this.master.gain,this.muted?0:this.volume,.015);}
 setMuted(muted){this.muted=muted;this.setVolume(this.volume);}
 event(name,intensity=1){
  const c=this.context;if(!c||c.state!=='running'||this.muted)return;
  // Bound short voices even under repeated key presses.
  if(this.activeVoices>=24)return;
  this.events[name]=(this.events[name]||0)+1;
  const tone=(frequency,duration=.1,delay=0,type='sine',level=.12,end=frequency)=>{
   if(this.activeVoices>=24)return;
   const o=c.createOscillator(),g=c.createGain(),t=c.currentTime+delay;
   o.type=type;o.frequency.setValueAtTime(frequency,t);o.frequency.exponentialRampToValueAtTime(Math.max(25,end),t+duration);
   g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(level*intensity,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
   o.connect(g);g.connect(this.compressor);o.start(t);o.stop(t+duration+.02);this.activeVoices++;o.onended=()=>{o.disconnect();g.disconnect();this.activeVoices--;};
  };
  const burst=(frequency,duration,level,type='lowpass')=>{
   if(this.activeVoices>=24)return;
   const o=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain(),t=c.currentTime;o.buffer=this.noise;f.type=type;f.frequency.value=frequency;g.gain.setValueAtTime(level*intensity,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(f);f.connect(g);g.connect(this.compressor);o.start(t);o.stop(t+duration);this.activeVoices++;o.onended=()=>{o.disconnect();f.disconnect();g.disconnect();this.activeVoices--;};
  };
  switch(name){
   case 'menu':tone(760,.055,0,'sine',.065,1020);break;
   case 'start':tone(65,.42,0,'sawtooth',.13,140);burst(260,.35,.13);break;
   case 'countdown':tone(680,.13,0,'sine',.16);break;
   case 'go':tone(1360,.42,0,'sine',.19);break;
   case 'shift':burst(1100,.095,.13);tone(130,.08,0,'triangle',.1,70);break;
   case 'reverse':tone(900,.12,0,'sine',.09);tone(900,.12,.24,'sine',.09);break;
   case 'handbrake':burst(1900,.16,.12,'bandpass');break;
   case 'turboRelease':burst(2800,.26,.1,'bandpass');break;
   case 'landing':case 'collision':tone(85,.24,0,'triangle',.25,30);burst(name==='landing'?650:1800,.22,.24);break;
   case 'checkpoint':tone(880,.12,0,'sine',.09);tone(1175,.17,.1,'sine',.09);break;
   case 'lap':tone(660,.14,0,'sine',.1);tone(880,.14,.12,'sine',.1);tone(1320,.22,.24,'sine',.1);break;
   case 'finish':[660,880,1100,1320].forEach((f,i)=>tone(f,.26,i*.13,'triangle',.12));break;
   case 'pause':tone(620,.14,0,'sine',.08,310);break;
   case 'resume':tone(310,.14,0,'sine',.08,620);break;
   case 'recover':tone(420,.14,0,'triangle',.1,840);tone(840,.18,.14,'triangle',.1,1260);break;
   case 'camera':tone(1100,.035,0,'sine',.035);break;
  }
 }
 hush(){if(!this.context)return;for(const loop of [this.motor,this.harmonic,this.exhaust,this.turbo,this.gearWhine,this.wind,this.rain,this.snow,...this.wheels.flatMap(w=>[w.roll,w.slip,w.squeal])])this.smooth(loop.gain.gain,0,.015);}
 reset(){this.lastGear=null;this.lastHand=false;this.lastThrottle=false;this.lastCountdown=null;this.nextImpact=0;}
 update(s){
  if(!this.context)return;
  const on=s.racing&&!s.paused&&!s.finished,inside=s.camera===3? .7:1;
  const rpm=Math.max(850,s.rpm),load=s.throttle?1:.2,profile=[1,.96,.89,1.06,1.15][s.car]||1;
  const base=rpm/60*2*profile;
  this.smooth(this.motor.source.frequency,base,.035);this.smooth(this.harmonic.source.frequency,base*2.01,.04);
  this.smooth(this.motor.gain.gain,on*(.027+.048*load)*inside*(s.shifting?.35:1));this.smooth(this.harmonic.gain.gain,on*.035*inside);
  this.smooth(this.exhaust.filter.frequency,150+rpm*.055);this.smooth(this.exhaust.gain.gain,on*(.055+.045*load)*inside);
  this.smooth(this.turbo.filter.frequency,1700+rpm*.35);this.smooth(this.turbo.gain.gain,on*(s.throttle?Math.max(0,rpm-2600)/120000:0));
  this.smooth(this.gearWhine.source.frequency,150+s.speed*8);this.smooth(this.gearWhine.gain.gain,on*Math.min(.025,s.speed*.00065));
  this.smooth(this.wind.gain.gain,on*Math.min(.1,(s.speed/55)**2*.085)*(s.camera===3?.35:1));
  this.smooth(this.rain.gain.gain,on&&s.weather===2?(s.camera===3?.035:.08):0);this.smooth(this.snow.gain.gain,on&&s.weather===3?.025:0);
  s.contacts.forEach((contact,i)=>{
   const w=this.wheels[i],active=on&&contact.grounded&&s.speed>.6,surface=contact.surface,skid=Math.min(1,Math.max(0,contact.slip-.09)*1.8+(s.handbrake&&i>1?.3:0));
   const rolling=Math.min(1,s.speed/22),asphalt=surface===0||surface===1;
   this.smooth(w.roll.filter.frequency,[380,1500,900,1250,650,350,1100,2100,700][surface]+s.speed*8);
   this.smooth(w.roll.gain.gain,active?rolling*(asphalt?.009:surface===5?.038:.025):0);
   this.smooth(w.slip.filter.frequency,surface===5?420:surface===6?1900:1200+s.speed*12);
   this.smooth(w.slip.gain.gain,active?rolling*(asphalt?.015:.06)*skid:0);
   this.smooth(w.squeal.source.frequency,650+skid*440+s.speed*3);
   this.smooth(w.squeal.gain.gain,active&&asphalt?skid*.035:0);
  });
  if(on){
   if(this.lastGear!==null&&s.gear!==this.lastGear){this.event('shift');if(s.gear<0)this.event('reverse');}
   if(s.handbrake&&!this.lastHand&&s.speed>1)this.event('handbrake');
   if(this.lastThrottle&&!s.throttle&&rpm>3500)this.event('turboRelease');
  }
  this.lastGear=s.gear;this.lastHand=s.handbrake;this.lastThrottle=s.throttle;
 }
 snapshot(){let rms=0;if(this.context){this.analyser.getFloatTimeDomainData(this.meter);for(const x of this.meter)rms+=x*x;rms=Math.sqrt(rms/this.meter.length);}return {state:this.context?.state||'locked',muted:this.muted,volume:this.volume,rms,events:{...this.events},voices:this.activeVoices,engineFrequency:this.motor?.source.frequency.value||0,engineGain:this.motor?.gain.gain.value||0,wheelRoll:this.wheels.map(w=>w.roll.gain.gain.value),wheelSlip:this.wheels.map(w=>w.slip.gain.gain.value),wheelSqueal:this.wheels.map(w=>w.squeal.gain.gain.value),rainGain:this.rain?.gain.gain.value||0,error:this.error||null};}
}
window.RallyAudio=RallyAudio;
