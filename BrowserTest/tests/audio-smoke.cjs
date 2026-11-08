// npm install playwright; RALLY_URL=http://127.0.0.1:8766 node tests/audio-smoke.cjs
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try {
 const p=await browser.newPage({viewport:{width:800,height:640}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(process.env.RALLY_URL||'http://127.0.0.1:8766');await p.waitForFunction(()=>window.RallyTest?.snapshot().frames>2);
 assert.equal((await p.evaluate(()=>RallyTest.snapshot())).audio.state,'locked');
 await p.click('#start');await p.waitForFunction(()=>RallyTest.snapshot().audio.state==='running');
 await p.waitForFunction(()=>RallyTest.snapshot().audio.rms>.002,{},{timeout:5000});
 await p.waitForFunction(()=>RallyTest.snapshot().countdown<=0,{},{timeout:15000});
 let s=await p.evaluate(()=>RallyTest.snapshot());assert.equal(s.audio.events.countdown,3);assert.equal(s.audio.events.go,1);const idle=s.audio.engineFrequency;
 await p.keyboard.down('KeyJ');await p.waitForFunction(()=>RallyTest.snapshot().speed>35,{},{timeout:60000});await p.keyboard.up('KeyJ');s=await p.evaluate(()=>RallyTest.snapshot());assert.ok(s.audio.engineFrequency>idle*1.5);assert.ok(s.audio.wheelRoll.every(v=>v>0));console.log('Engine/rolling:',s.audio);
 const yaw=s.yaw;
 await p.keyboard.down('KeyD');await p.waitForFunction(()=>RallyTest.snapshot().steer<-.6);await p.keyboard.up('KeyD');assert.ok((await p.evaluate(()=>RallyTest.snapshot())).yaw<yaw,'D turns right: negative yaw when car faces +Z');
 await p.keyboard.down('KeyL');await p.waitForFunction(()=>RallyTest.snapshot().audio.events.handbrake>=1);await p.keyboard.up('KeyL');
 await p.keyboard.press('KeyC');await p.keyboard.press('KeyR');
 await p.keyboard.press('Escape');await p.waitForTimeout(500);s=await p.evaluate(()=>RallyTest.snapshot());assert.ok(s.audio.engineGain<.001);assert.equal(s.audio.events.pause,1);
 await p.click('#resume');await p.waitForFunction(()=>RallyTest.snapshot().audio.engineGain>.01,{},{timeout:15000});
 await p.click('#mute');await p.waitForTimeout(350);s=await p.evaluate(()=>RallyTest.snapshot());assert.equal(s.audio.muted,true);assert.ok(s.audio.rms<.0001);
 await p.click('#mute');await p.locator('#volume').fill('25');assert.equal((await p.evaluate(()=>RallyTest.snapshot())).audio.volume,.25);
 // Synthesis contract: exercise events that require a long race or an impact separately.
 await p.evaluate(async()=>{window.soundFixture=new RallyAudio();await soundFixture.unlock();for(const e of ['menu','start','countdown','go','shift','reverse','handbrake','turboRelease','landing','collision','checkpoint','lap','finish','pause','resume','recover','camera']){soundFixture.event(e);await new Promise(r=>setTimeout(r,110));}});
 let a=await p.evaluate(()=>soundFixture.snapshot());assert.equal(Object.keys(a.events).length,17);assert.equal(a.error,null);
 const input={racing:true,paused:false,finished:false,rpm:3500,speed:12,gear:2,shifting:false,throttle:true,handbrake:false,camera:0,car:0,weather:2,contacts:[{grounded:true,surface:0,slip:.8},{grounded:true,surface:3,slip:.8},{grounded:true,surface:5,slip:.8},{grounded:false,surface:6,slip:.8}]};
 await p.evaluate(s=>soundFixture.update(s),input);await p.waitForTimeout(500);a=await p.evaluate(()=>soundFixture.snapshot());assert.ok(a.wheelSqueal[0]>.001);assert.ok(a.wheelSlip[1]>.001);assert.ok(a.wheelSlip[2]>.001);assert.equal(a.wheelRoll[3],0);assert.equal(a.wheelSlip[3],0);assert.ok(a.rainGain>.01);
 await p.evaluate(()=>soundFixture.context.close());assert.deepEqual(errors,[]);console.log('PASS: WebAudio gesture unlock, nonzero waveform, RPM pitch, rolling sound, D right, handbrake, pause silence/resume, mute, volume, 17 event syntheses, per-wheel surfaces/airborne, rain.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
