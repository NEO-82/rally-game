/* Original procedural geometry and GLSL; all detail is generated offline. */
'use strict';
(()=>{
 const T=window.THREE;
 const mix=(a,b,t)=>a+(b-a)*t,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const smooth=(a,b,x)=>{let t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
 function noise(x,z){return Math.sin(x*.029+Math.sin(z*.017)*1.4)*.48+Math.sin(z*.043-x*.011)*.27+Math.cos(x*.083+z*.067)*.15+Math.sin(x*.17-z*.12)*.1;}
 class RallyGraphics {
  constructor(renderer,scene){
   this.renderer=renderer;this.scene=scene;this.textures=[];
   renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
   this.sky=new T.Mesh(new T.SphereGeometry(3600,40,24),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{cloudiness:{value:.25},sunDirection:{value:new T.Vector3(.4,.68,-.35).normalize()}},vertexShader:`varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 vDirection;uniform float cloudiness;uniform vec3 sunDirection;
   float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}void main(){vec3 d=normalize(vDirection);float h=max(d.y,0.);vec3 sky=mix(vec3(.78,.85,.84),vec3(.21,.48,.68),pow(h,.5));float sun=pow(max(dot(d,sunDirection),0.),650.);float glow=pow(max(dot(d,sunDirection),0.),18.);vec2 p=d.xz/max(.12,d.y+.14)*2.2;float clouds=n(p)*.6+n(p*2.1)*.26+n(p*4.3)*.14;float c=smoothstep(.56-cloudiness*.25,.78-cloudiness*.2,clouds)*smoothstep(.02,.18,h);sky=mix(sky,vec3(.94,.95,.92),c*.9);sky=mix(sky,vec3(.57,.65,.7),cloudiness*.48);gl_FragColor=vec4(sky+vec3(1.,.78,.43)*(sun*.7+glow*.12),1.);}` }));
   this.sky.frustumCulled=false;scene.add(this.sky);
   // Small procedural environment map produces car-paint reflections without external images.
   const envScene=new T.Scene(),envSky=this.sky.clone();envScene.add(envSky);const pmrem=new T.PMREMGenerator(renderer);this.env=pmrem.fromScene(envScene,.03,.1,4000);scene.environment=this.env.texture;pmrem.dispose();
  }
  update(position,weather){this.sky.position.copy(position);this.sky.material.uniforms.cloudiness.value=[.2,.65,.95,.8][weather];}
  groundHeight(x,z,roadY,dist,width,track){const blend=smooth(width*.5+8,width*.5+50,dist),amplitude=track===1?28:track===3?3.5:9;return roadY+blend*(noise(x,z)*amplitude+Math.max(0,dist-50)*.05);}
  detailMaterial(color,kind='ground',weather=0){
   const mat=new T.MeshStandardMaterial({color,roughness:weather===2&&kind==='road'?.28:.92,metalness:weather===2&&kind==='road'?.12:0});
   mat.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 vDetailWorld;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvDetailWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
    shader.fragmentShader='varying vec3 vDetailWorld;\nfloat rallyHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
     float grain=rallyHash(floor(vDetailWorld.xz*${kind==='road'?'23.':'9.'}));
     float broad=sin(vDetailWorld.x*.22+sin(vDetailWorld.z*.13))*sin(vDetailWorld.z*.17)*.06;
     diffuseColor.rgb*=.94+grain*.12+broad;
     ${kind==='road'?'float rut=pow(abs(sin(vDetailWorld.x*.27+vDetailWorld.z*.11)),28.);diffuseColor.rgb*=1.-rut*.035;':''}`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
     float grainNormal=rallyHash(floor(vDetailWorld.xz*18.))-.5;
     normal=normalize(normal+vec3(grainNormal*.065,0.,-grainNormal*.045));`);
   };
   mat.customProgramCacheKey=()=>`rally-detail-${kind}`;return mat;
  }
  paint(color){return new T.MeshPhysicalMaterial({color,metalness:.32,roughness:.27,clearcoat:1,clearcoatRoughness:.2,envMapIntensity:1.1});}
  bodyGeometry(d){
   const sections=[[-.5,.65,.55],[-.47,.76,.67],[-.42,.86,.78],[-.3,.89,.85],[-.2,.88,.88],[0,.86,.87],[.2,.86,.85],[.37,.82,.77],[.46,.75,.65],[.5,.64,.51]];
   const vs=[],indices=[],long=48,around=24;
   for(let i=0;i<=long;i++){let u=i/long-.5,k=0;while(k<sections.length-2&&u>sections[k+1][0])k++;let a=sections[k],b=sections[k+1],t=clamp((u-a[0])/(b[0]-a[0]),0,1);t=t*t*(3-2*t);let w=mix(a[1],b[1],t),top=mix(a[2],b[2],t),bottom=.3;
    for(let j=0;j<around;j++){let angle=j/around*Math.PI*2,c=Math.cos(angle),s=Math.sin(angle); // rounded rectangle / superellipse
     let x=Math.sign(c)*Math.pow(Math.abs(c),.4)*w,y=(top+bottom)*.5+Math.sign(s)*Math.pow(Math.abs(s),.45)*(top-bottom)*.5;
     y+=Math.max(0,s)*.022*Math.cos(x*2);vs.push(x,y,u*d.length);
     if(i<long){let p=i*around+j,q=i*around+(j+1)%around;indices.push(p,q,p+around,q,q+around,p+around);}
    }
   }
   // End caps share rings and receive smooth boundary normals.
   for(let end of [0,long]){let center=vs.length/3;vs.push(0,.43,(end/long-.5)*d.length);for(let j=0;j<around;j++){let a=end*around+j,b=end*around+(j+1)%around;indices.push(...(end===0?[center,b,a]:[center,a,b]));}}
   const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vs,3));const clipped=[];
   for(let i=0;i<indices.length;i+=3){let x=0,y=0,z=0;for(let k=0;k<3;k++){let v=indices[i+k]*3;x+=vs[v]/3;y+=vs[v+1]/3;z+=vs[v+2]/3;}let arch=Math.abs(x)>.57&&Math.min(Math.hypot(z-d.wb/2,y-.33),Math.hypot(z+d.wb/2,y-.33))<.36;if(!arch)clipped.push(indices[i],indices[i+1],indices[i+2]);}
   geo.setIndex(clipped);geo.computeVertexNormals();return geo;
  }
  roundedBox(w,h,d,r=.08){const shape=new T.Shape(),x=-w/2,y=-h/2;shape.moveTo(x+r,y);shape.lineTo(x+w-r,y);shape.quadraticCurveTo(x+w,y,x+w,y+r);shape.lineTo(x+w,y+h-r);shape.quadraticCurveTo(x+w,y+h,x+w-r,y+h);shape.lineTo(x+r,y+h);shape.quadraticCurveTo(x,y+h,x,y+h-r);shape.lineTo(x,y+r);shape.quadraticCurveTo(x,y,x+r,y);const geo=new T.ExtrudeGeometry(shape,{depth:Math.max(.01,d-2*r),bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:r*.4,bevelThickness:r,curveSegments:5});geo.translate(0,0,-d/2+r);geo.computeVertexNormals();return geo;}
  buildLandscape(world,samples,d,weather,track,random,colliders){
   const minX=Math.min(...samples.map(p=>p.x))-450,maxX=Math.max(...samples.map(p=>p.x))+450,minZ=Math.min(...samples.map(p=>p.z))-450,maxZ=Math.max(...samples.map(p=>p.z))+450;
   const nearest=(x,z)=>{let best=Infinity,p;for(let i=0;i<samples.length;i+=2){const q=samples[i],dist=(x-q.x)**2+(z-q.z)**2;if(dist<best){best=dist;p=q;}}return {p,dist:Math.sqrt(best)};};
   const terrainAt=(x,z)=>{let n=nearest(x,z);return this.groundHeight(x,z,n.p.y,n.dist,d.width,track)-.15;};
   const nx=140,nz=Math.max(100,Math.min(300,Math.ceil((maxZ-minZ)/12))),verts=[],colors=[],indices=[],base=new T.Color(weather===3?0xdce4e4:d.ground);
   for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){let x=mix(minX,maxX,i/nx),z=mix(minZ,maxZ,j/nz),y=terrainAt(x,z);verts.push(x,y,z);let tint=.87+noise(x*1.8,z*1.8)*.2;colors.push(base.r*tint,base.g*tint,base.b*tint);if(i<nx&&j<nz){let a=j*(nx+1)+i;indices.push(a,a+nx+1,a+1,a+1,a+nx+1,a+nx+2);}}
   const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();const groundMat=this.detailMaterial(0xffffff,'ground',weather);groundMat.vertexColors=true;const land=new T.Mesh(geo,groundMat);land.receiveShadow=true;land.name='Detailed rolling terrain';world.add(land);
   // Mountain silhouettes: several concentric ridgelines, displaced per vertex.
   const cx=(minX+maxX)/2,cz=(minZ+maxZ)/2,radius=Math.max(maxX-minX,maxZ-minZ)*.62;
   for(let ring=0;ring<2;ring++){
    let g=new T.CylinderGeometry(radius*(1.1+ring*.3),radius*(1.25+ring*.3),1,120,10,true);let attr=g.attributes.position;
    for(let i=0;i<attr.count;i++){let x=attr.getX(i),z=attr.getZ(i),v=attr.getY(i)+.5;let peak=(Math.sin(Math.atan2(z,x)*7+ring)*.3+Math.sin(Math.atan2(z,x)*13)*.16+.64)*(track===1?500:track===3?150:280);attr.setY(i,v*peak-22);}g.computeVertexNormals();const mountain=new T.Mesh(g,new T.MeshStandardMaterial({color:ring?0x8199a2:weather===3?0xaabbbb:0x657d78,roughness:1,side:T.DoubleSide}));mountain.position.set(cx,0,cz);world.add(mountain);
   }
   const trunkMat=new T.MeshStandardMaterial({color:0x665044,roughness:1}),leafMat=new T.MeshStandardMaterial({color:weather===3?0xcbd9d3:track===3?0x647448:0x24543a,roughness:.95}),rockMat=this.detailMaterial(0x87877c,'rock',weather);
   const count=720,trunkGeo=new T.CylinderGeometry(.23,.48,5,8,3),foliageGeo=track===3||track===2?new T.SphereGeometry(2.6,14,10):new T.ConeGeometry(2.8,6.8,12,5);
   if(track!==3&&track!==2){let a=foliageGeo.attributes.position;for(let i=0;i<a.count;i++){let y=a.getY(i);let f=1+.09*Math.sin(y*5+i*1.3);a.setX(i,a.getX(i)*f);a.setZ(i,a.getZ(i)*f);}foliageGeo.computeVertexNormals();}
   const trunks=new T.InstancedMesh(trunkGeo,trunkMat,count),leaves=new T.InstancedMesh(foliageGeo,leafMat,count*3),rocks=new T.InstancedMesh(new T.IcosahedronGeometry(1,2),rockMat,150),dummy=new T.Object3D(),col=new T.Color();
   for(let i=0;i<count;i++){let p=samples[Math.floor(random()*samples.length)],side=i%2?-1:1,offset=d.width*.5+9+random()*110,x=p.x+p.right.x*offset*side,z=p.z+p.right.z*offset*side,y=terrainAt(x,z),size=.65+random()*.8;colliders.push({x,z,y,r:.4});dummy.position.set(x,y+2.5*size,z);dummy.rotation.set(0,random()*6.28,0);dummy.scale.set(size,size,size);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
    for(let tier=0;tier<3;tier++){let scale=size*(1-tier*.18);dummy.position.set(x+Math.sin(i*1.9+tier)*.28*size,y+(4.5+tier*1.8)*size,z+Math.cos(i*2.1+tier)*.28*size);dummy.scale.set(scale,track===3?scale*.5:scale,scale);dummy.updateMatrix();leaves.setMatrixAt(i*3+tier,dummy.matrix);col.setHSL(track===3?.24:.38,.24+random()*.16,.16+random()*.12);if(weather===3)col.set(0xd4dfda);leaves.setColorAt(i*3+tier,col);}
   }
   for(let i=0;i<150;i++){let p=samples[Math.floor(random()*samples.length)],off=(d.width*.5+4+random()*28)*(i%2?-1:1),x=p.x+p.right.x*off,z=p.z+p.right.z*off,y=terrainAt(x,z),size=.4+random()*1.5;dummy.position.set(x,y+size*.45,z);dummy.scale.set(size*1.4,size,size);dummy.rotation.set(random(),random()*6,random()*.2);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);colliders.push({x,z,y,r:size});}
   trunks.castShadow=true;leaves.castShadow=true;rocks.castShadow=true;trunks.receiveShadow=true;leaves.receiveShadow=true;world.add(trunks,leaves,rocks);
   // Crossed grass blade clusters: one instanced draw rather than thousands of objects.
   const blade=new T.BufferGeometry();blade.setAttribute('position',new T.Float32BufferAttribute([-.15,0,0,.15,0,0,0,.65,0,0,0,-.15,0,0,.15,0,.55,0],3));blade.computeVertexNormals();const grassMat=new T.MeshStandardMaterial({color:weather===3?0xcbd7cf:track===3?0xaca26b:0x608144,side:T.DoubleSide,roughness:1});
   const grass=new T.InstancedMesh(blade,grassMat,4500);for(let i=0;i<4500;i++){let p=samples[Math.floor(random()*samples.length)],off=(d.width*.5+1+random()*24)*(i%2?-1:1),x=p.x+p.right.x*off,z=p.z+p.right.z*off;dummy.position.set(x,terrainAt(x,z)+.1,z);dummy.rotation.set(0,random()*6.28,0);let size=.6+random()*.9;dummy.scale.set(size,size,size);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);}world.add(grass);
   // Gentle vertex movement stays on GPU; no per-blade JS updates.
   grassMat.onBeforeCompile=shader=>{shader.uniforms.rallyTime={value:0};this.grassShader=shader;shader.vertexShader='uniform float rallyTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=sin(rallyTime*1.4+instanceMatrix[3].x*.7)*position.y*.12;');};
   return {terrainVertices:verts.length/3,trees:count,grass:4500};
  }
 }
 window.RallyGraphics=RallyGraphics;
})();
