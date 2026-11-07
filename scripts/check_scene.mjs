import assert from 'node:assert/strict';
import {readFile, readdir, stat} from 'node:fs/promises';
import vm from 'node:vm';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {MODEL_DATA} from '../src/embedded-assets.js';

// Real geometry and GLB parsing; DOM/WebGL stand-ins keep this check runnable without a browser.
const size={width:1100,height:850};
// Geometry is parsed and decoded in Node. The browser check covers bitmap decoding and rendering.
globalThis.self=globalThis;
globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
const context2d=new Proxy({}, {get:()=>()=>{}});
const elements=new Map();
function element(){return {style:{},dataset:{},children:[],listeners:{},open:false,classList:{toggle(){}},appendChild(child){this.children.push(child);},querySelectorAll(){return this.children;},addEventListener(type,handler){(this.listeners[type]??=[]).push(handler);},showModal(){this.open=true;},close(){this.open=false;this.listeners.close?.forEach(handler=>handler());},getBoundingClientRect:()=>size,getContext:()=>context2d};}
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
const sandbox={THREE:{...THREE,WebGLRenderer:Renderer},OrbitControls:Controls,GLTFLoader,MeshoptDecoder,MODEL_DATA,ArrayBuffer,Uint8Array,document,window:{devicePixelRatio:1.25},innerWidth:1440,ResizeObserver:class{observe(){}},requestAnimationFrame(){},atob,performance,setTimeout,console};
vm.createContext(sandbox);
let source=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
source=source.replace(/^import .*;\r?\n/gm,'').replace('load().catch(', 'const loaded=load();loaded.catch(');
vm.runInContext(source+'\nglobalThis.clinic={loaded,scene,props,spaces,camera,planCamera,control,setView,resize,select,frame,sunlight};',sandbox);
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
 for(const x of [-9.6,10.2])for(const y of [-.3,3.1])for(const z of [-6.5,6.5]){
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
clinic.setView('walk');assert.ok(clinic.camera.position.y<2);
clinic.select('xray',true);clinic.frame(performance.now()+900);
assert.equal(document.getElementById('detailTitle').textContent,'Radiografi');
document.getElementById('resetBtn').onclick();
assert.ok(clinic.control.target.distanceTo(new THREE.Vector3(0,.65,0))<1e-6,'Reset must recenter');
clinic.frame(performance.now()+1000);const rendered=renders;clinic.frame(performance.now()+1100);
assert.equal(renders,rendered,'Idle scene must not render continuously');
const lights=[];clinic.scene.traverse(o=>{if(o.isLight&&o.castShadow)lights.push(o);});
assert.equal(lights.length,1,'Only sunlight should allocate a shadow map');
let triangles=0,meshes=0;
clinic.scene.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});
const models=await readdir(new URL('../assets/models/',import.meta.url));
const bytes=(await Promise.all(models.map(name=>stat(new URL('../assets/models/'+name,import.meta.url))))).reduce((sum,s)=>sum+s.size,0);
console.log(JSON.stringify({checks:'passed',models:models.length,placements:assets.length,meshes,triangles,modelBytes:bytes,bundleBytes:(await stat(new URL('../app.bundle.js',import.meta.url))).size},null,2));
