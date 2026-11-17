import assert from 'node:assert/strict';
import {readFile, readdir, stat} from 'node:fs/promises';
import vm from 'node:vm';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {MODEL_DATA} from '../src/embedded-assets.js';
import * as data from '../src/clinic-data.js';
import {buildPlanSVG,PLAN_LAYOUTS} from '../src/floorplan.js';

// Real geometry and GLB parsing; DOM/WebGL stand-ins keep this check runnable without a browser.
const size={width:1100,height:850};
// Geometry is parsed and decoded in Node. The browser check covers bitmap decoding and rendering.
globalThis.self=globalThis;
globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
const context2d=new Proxy({}, {get:()=>()=>{}});
const elements=new Map();
function element(){return {style:{},dataset:{},children:[],listeners:{},attributes:{},open:false,classList:{toggle(){}},setAttribute(name,value){this.attributes[name]=value;},appendChild(child){this.children.push(child);},querySelectorAll(){return this.children;},addEventListener(type,handler){(this.listeners[type]??=[]).push(handler);},showModal(){this.open=true;},close(){this.open=false;this.listeners.close?.forEach(handler=>handler());},getBoundingClientRect:()=>size,getContext:()=>context2d};}
const document={getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},createElement:element,querySelectorAll:()=>[]};
let renders=0;
class Renderer{
 constructor(){this.domElement=element();this.shadowMap={};this.capabilities={getMaxAnisotropy:()=>4};}
 setPixelRatio(){} setSize(){} render(){renders++;}
}
class Controls extends THREE.EventDispatcher{
 constructor(camera){super();this.object=camera;this.target=new THREE.Vector3();}
 update(){this.object.lookAt(this.target);this.object.updateMatrixWorld(true);}
}
const sandbox={THREE:{...THREE,WebGLRenderer:Renderer},ArrayBuffer,Uint8Array,document,window:{devicePixelRatio:1.25},innerWidth:1440,ResizeObserver:class{observe(){}},requestAnimationFrame(){},addEventListener(){},location:{hash:''},URLSearchParams,atob,performance,setTimeout,clearTimeout,console};
let source=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
// Resolve main.js's named imports with the real modules; only WebGL and the DOM are stubbed.
for(const [,names,from] of source.matchAll(/^import \{([^}]+)\} from '([^']+)';/gm)){
 const mod=await import(from.startsWith('.')?new URL('../src/'+from.slice(2),import.meta.url).href:from);
 for(const name of names.split(',').map(n=>n.trim()))sandbox[name]=name==='OrbitControls'?Controls:mod[name];
}
vm.createContext(sandbox);
source=source.replace(/^import .*;\r?\n/gm,'').replace('load().catch(', 'const loaded=load();loaded.catch(');
vm.runInContext(source+'\nglobalThis.clinic={loaded,scene,props,spaces,camera,planCamera,control,setView,resize,select,frame,sunlight,shell,state:()=>({roofOn,cutaway,view})};',sandbox);
const clinic=sandbox.clinic;
await clinic.loaded;
const canvas=document.getElementById('viewport').children[0];
assert.equal(canvas.id,'scene','Canvas must receive the CSS sizing rule at non-1 device pixel ratios');
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
assert.match(html,/#scene\{[^}]*width:100%;[^}]*height:100%/,'Canvas CSS must fit its panel');
assert.match(html,/<title>Elora Smile Clinic/);
assert.doesNotMatch(html,/Katalhys|NARA|STUDIO CONCEPT|V2\.0|class="watermark"/i);
assert.match(html,/grid-template-columns:330px minmax\(0,1fr\)/,'Keep the existing sidebar layout');
assert.ok((await stat(new URL('../assets/brand/elora-symbol.png',import.meta.url))).size>0);
const originalLayout=[
 ['waiting',0,0,8,3.5],['consult',8,0,4,3.5],['staff',12,0,4,3.5],['wc',16,0,2,3.5],
 ['hall',0,3.5,18,1.5],['unit1',0,5,6,3.5],['unit2',8,5,6,3.5],['sterile',14,5,4,3.5],
 ['xray',0,8.5,6,3.5],['unit3',8,8.5,6,3.5],['storage',14,8.5,4,3.5],['innerhall',6,5,2,7]
];
assert.deepEqual(Array.from(clinic.spaces,r=>[r.id,r.x,r.z,r.w,r.d]),originalLayout,'Elora room positions and dimensions must stay unchanged');
const assets=clinic.props.children.filter(o=>o.userData.asset);
assert.ok(assets.length>100,'Detailed room furnishings must load');
assert.equal(Object.keys(MODEL_DATA).length,64);
for(const [assetName,roomId] of [['xray_arm','xray'],['xray_viewer','xray'],['detail_autoclave','sterile'],['staff_fridge','staff'],['jaw_model','consult'],['detail_receptionist','waiting'],['detail_visitor','waiting'],['detail_waiting_visitor','waiting'],['detail_tv','waiting']]){
 const asset=assets.find(o=>o.name===assetName),room=clinic.spaces.find(r=>r.id===roomId);
 assert.ok(asset&&asset.position.x+9>room.x&&asset.position.x+9<room.x+room.w&&asset.position.z+6>room.z&&asset.position.z+6<room.z+room.d,`${assetName} must be in ${roomId}`);
}
for(const asset of assets){
 const box=new THREE.Box3().setFromObject(asset);
 assert.ok(Number.isFinite(box.min.x)&&!box.isEmpty(),`${asset.name}: invalid geometry`);
 assert.ok(box.min.y>=.12,`${asset.name}: below finished floor`);
}
const crossings=[];
for(const asset of assets){
 const x=asset.position.x+9,z=asset.position.z+6;
 const room=clinic.spaces.find(r=>!r.id.includes('hall')&&x>r.x&&x<r.x+r.w&&z>r.z&&z<r.z+r.d);
 if(!room)continue;
 const box=new THREE.Box3().setFromObject(asset);
 if(box.min.x+9<room.x-.08||box.max.x+9>room.x+room.w+.08||box.min.z+6<room.z-.08||box.max.z+6>room.z+room.d+.08)crossings.push(`${asset.name} in ${room.id}: ${[box.min.x+9,box.max.x+9,box.min.z+6,box.max.z+6].map(n=>n.toFixed(2))}`);
}
assert.deepEqual(crossings,[],'Furniture should stay inside its room');
for(const [width,height] of [[1100,850],[550,900],[375,450],[1800,650]]){
 Object.assign(size,{width,height});clinic.setView('3d');clinic.resize();
 assert.ok(clinic.scene.fog.near>clinic.camera.position.distanceTo(clinic.control.target),'Responsive framing must not wash out the clinic with fog');
 const projected=[];
 for(const x of [-9.6,10.2])for(const y of [-.3,3.6])for(const z of [-11,6.5]){
  const p=new THREE.Vector3(x,y,z).project(clinic.camera);
  projected.push(p);
  assert.ok(Math.abs(p.x)<.84&&Math.abs(p.y)<.78,`${width}x${height}: clinic cropped`);
 }
 if(width<=850)for(const axis of ['x','y']){
  const values=projected.map(point=>point[axis]);
  assert.ok(Math.abs((Math.min(...values)+Math.max(...values))/2)<.02,`${width}x${height}: clinic is off center`);
 }
 clinic.setView('2d');clinic.resize();
 for(const x of [-9.6,10.2])for(const z of [-6.5,6.5]){
  const p=new THREE.Vector3(x,0,z).project(clinic.planCamera);
  assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1,`${width}x${height}: floor plan cropped`);
 }
 clinic.planCamera.zoom=3;clinic.setView('2d');assert.equal(clinic.planCamera.zoom,1);
}
clinic.setView('3d');
assert.ok(clinic.shell.roof.visible&&clinic.shell.full.visible&&!clinic.shell.cut.visible,'Default 3D view shows the whole building with its roof');
document.getElementById('roofBtn').onclick();
assert.ok(!clinic.shell.roof.visible&&clinic.shell.cut.visible,'Roof off returns to the cutaway');
document.getElementById('roofBtn').onclick();assert.ok(clinic.shell.roof.visible);
clinic.select('unit2');assert.ok(!clinic.shell.roof.visible,'Selecting a room hides the roof');
document.getElementById('resetBtn').onclick();assert.ok(clinic.shell.roof.visible);
clinic.setView('walk');assert.ok(clinic.camera.position.y<2);assert.ok(!clinic.shell.roof.visible,'Eye Level hides the roof');
clinic.select('xray',true);clinic.frame(performance.now()+900);
assert.equal(document.getElementById('detailTitle').textContent,'Radiografi');
document.getElementById('resetBtn').onclick();
assert.ok(clinic.control.target.distanceTo(new THREE.Vector3(0,.65,0))<1e-6,'Reset must recenter');
clinic.frame(performance.now()+1000);const rendered=renders;clinic.frame(performance.now()+1100);
assert.equal(renders,rendered,'Idle scene must not render continuously');
const lights=[];clinic.scene.traverse(o=>{if(o.isLight&&o.castShadow)lights.push(o);});
assert.equal(lights.length,1,'Only sunlight should allocate a shadow map');
// Shadow toggle frees the shadow map; the sun slider moves the light east→west.
const sun=lights[0],shadowBtn=document.getElementById('shadowBtn'),sunHour=document.getElementById('sunHour');
shadowBtn.onclick();assert.equal(sun.castShadow,false,'Shadow toggle must turn sun shadows off');assert.equal(sunHour.disabled,true);
shadowBtn.onclick();assert.equal(sun.castShadow,true);
sunHour.value='8';sunHour.oninput();const morningX=sun.position.x;sunHour.value='16';sunHour.oninput();
assert.ok(morningX<sun.target.position.x&&sun.position.x>sun.target.position.x,'Morning sun east (−x), afternoon west (+x)');
assert.ok(sun.position.y>sun.target.position.y,'Sun stays above the horizon');
sunHour.value='9';sunHour.oninput();
// Exterior windows are real openings: no full-shell wall piece crosses the glazing band.
const exteriorWindows=data.OPENINGS.filter(o=>o.type==='window'&&data.wallById.get(o.wall).ext);
assert.ok(exteriorWindows.length>=8,'Exterior walls need windows');
for(const side of ['front','back','left','right'])assert.ok(data.OPENINGS.some(o=>o.wall===side&&o.type!=='open'),`${side} facade needs an opening`);
for(const op of exteriorWindows){
 const blocking=clinic.shell.segments.filter(s=>s.wall===op.wall&&s.from<op.to-1e-6&&s.to>op.from+1e-6&&s.y0<op.head-1e-6&&s.y1>op.sill+1e-6);
 assert.deepEqual(blocking,[],`Window ${op.wall} ${op.from}-${op.to} must be open in the wall`);
}
const glassMeshes=[];clinic.shell.full.traverse(o=>{if(o.isMesh&&o.material.transparent)glassMeshes.push(o);});
assert.ok(glassMeshes.length>=1,'Windows need glass');
for(const op of data.OPENINGS){const w=data.wallById.get(op.wall);assert.ok(op.from>=w.from&&op.to<=w.to&&op.to>op.from,`Opening ${op.wall} ${op.from} lies on its wall`);}
// The 2D plan reads the same records as the 3D model.
assert.equal(clinic.spaces,data.SPACES,'3D and plan share one room table');
for(const layout of Object.keys(PLAN_LAYOUTS)){
 const svg=buildPlanSVG({layout});
 const rooms=[...svg.matchAll(/data-room="([^"]+)"[^>]*data-x="([^"]+)" data-z="([^"]+)" data-w="([^"]+)" data-d="([^"]+)"/g)].map(m=>[m[1],+m[2],+m[3],+m[4],+m[5]]);
 assert.deepEqual(rooms,clinic.spaces.filter(r=>!r.id.includes('hall')).map(r=>[r.id,r.x,r.z,r.w,r.d]),'Plan rooms match the 3D rooms');
 for(const r of data.ROOMS){const [w,d]=data.netSize(r);assert.ok(svg.includes(`${data.fmt(w)} × ${data.fmt(d)} m`),`${r.id} interior size label`);}
 for(const side of ['front','back','left','right']){
  const group=svg.match(new RegExp(`<g class="fp-dim" data-dim="${side}" data-total="([^"]+)">([\\s\\S]*?)</g>`));
  assert.ok(group,`${side} dimension chain`);
  const expected=side==='front'||side==='back'?data.BUILDING.width:data.BUILDING.depth;
  assert.equal(+group[1],expected,`${side} total equals the building size`);
  const parts=[...group[2].matchAll(/class="fp-dim-text" data-len="([^"]+)"/g)].map(m=>+m[1]);
  assert.ok(parts.length>=2&&Math.abs(parts.reduce((a,b)=>a+b,0)-expected)<1e-6,`${side} segments add up to the total`);
  assert.match(group[2],new RegExp(`class="fp-dim-text fp-total" data-len="${expected.toFixed(2)}"[^>]*>${data.fmt(expected)}<`));
 }
 assert.equal((svg.match(/class="fp-swing"/g)||[]).length,data.OPENINGS.filter(o=>['door','exit'].includes(o.type)).length+2+1,'Every leaf has a swing arc');
 assert.match(svg,/MASUK/);assert.match(svg,/SKALA GRAFIS/);assert.match(svg,/Denah Lantai/);
}
let triangles=0,meshes=0;
clinic.scene.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});
const models=await readdir(new URL('../assets/models/',import.meta.url));
const bytes=(await Promise.all(models.map(name=>stat(new URL('../assets/models/'+name,import.meta.url))))).reduce((sum,s)=>sum+s.size,0);
console.log(JSON.stringify({checks:'passed',models:models.length,placements:assets.length,meshes,triangles,modelBytes:bytes,bundleBytes:(await stat(new URL('../app.bundle.js',import.meta.url))).size},null,2));
