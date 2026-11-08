const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{const p=await b.newPage({viewport:{width:800,height:640}}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await p.goto(process.env.RALLY_URL||'http://127.0.0.1:8766');await p.waitForFunction(()=>window.RallyTest?.snapshot().frames>2,{},{timeout:60000});
 let s=await p.evaluate(()=>RallyTest.snapshot());assert.ok(s.vehicleTriangles>10000);assert.ok(s.graphics.terrainVertices>30000);assert.equal(s.graphics.trees,720);assert.equal(s.graphics.grass,4500);assert.ok(s.cameraDistance>5&&s.cameraDistance<12);assert.ok(s.triangles>100000);
 for(let track=0;track<5;track++){let old=await p.evaluate(()=>RallyTest.snapshot().frames);await p.selectOption('#trackSelect',String(track));await p.waitForFunction(f=>RallyTest.snapshot().frames>f,old,{timeout:60000});assert.equal((await p.evaluate(()=>RallyTest.snapshot())).track,track);}
 for(let car=0;car<5;car++){await p.selectOption('#carSelect',String(car));await p.waitForFunction(c=>RallyTest.snapshot().car===c,car);}
 for(let weather=0;weather<4;weather++){let old=await p.evaluate(()=>RallyTest.snapshot().frames);await p.selectOption('#weatherSelect',String(weather));await p.waitForFunction(f=>RallyTest.snapshot().frames>f,old,{timeout:60000});assert.equal((await p.evaluate(()=>RallyTest.snapshot())).weather,weather);}
 assert.deepEqual(errors,[]);console.log('PASS: higher-detail vehicle, terrain/vegetation, menu camera, 5 courses, 5 cars, 4 weather render without JS/shader errors.');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1)});
