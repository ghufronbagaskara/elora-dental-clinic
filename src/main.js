import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MODEL_DATA} from './embedded-assets.js';

// All geometry is in metres: width = 18m, length = 12m, height = 2.8m.
const spaces = [
 ['waiting','Resepsionis & Ruang Tunggu',0,0,8,3.5,'#ebe2d6','Penerimaan pasien, antrean, administrasi, pembayaran, dan area tunggu nyaman.'],
 ['consult','Ruang Konsultasi',8,0,4,3.5,'#ece2d6','Meja dokter, komputer, kursi pasien dan pendamping, model rahang untuk edukasi, serta lemari berkas.'],
 ['staff','Ruang Staf',12,0,4,3.5,'#e6e9df','Area kerja serta istirahat staf; terpisah dari ruang tindakan.'],
 ['wc','Toilet',16,0,2,3.5,'#dce9e6','Toilet konseptual. Detail aksesibilitas, sanitasi, dan plumbing perlu diverifikasi.'],
 ['hall','Koridor Utama',0,3.5,18,1.5,'#f1eadf','Akses dari ruang tunggu menuju ruang klinis.'],
 ['unit1','Ruang Tindakan 1',0,5,6,3.5,'#deece7','Dental chair, lampu tindakan, dental delivery, suction, kabinet, dan kursi dokter.'],
 ['unit2','Ruang Tindakan 2',8,5,6,3.5,'#deece7','Dental unit kedua dengan perlengkapan tindakan lengkap.'],
 ['sterile','Sterilisasi',14,5,4,3.5,'#e8e9e3','Pencucian dan sterilisasi instrumen; alur kotor-bersih harus dirancang terpisah.'],
 ['xray','Radiografi',0,8.5,6,3.5,'#e3e6e8','Radiografi intraoral: lengan rontgen terpasang di dinding, kursi pasien, sensor di meja, viewer hasil, dan area operator. Bukan unit panoramik. Shielding perlu desain profesional.'],
 ['unit3','Ruang Tindakan 3',8,8.5,6,3.5,'#deece7','Dental unit ketiga sesuai kapasitas awal dalam business plan.'],
 ['storage','Gudang & Utilitas',14,8.5,4,3.5,'#e9e8df','Penyimpanan, utilitas, dan perlengkapan pendukung operasional.'],
 ['innerhall','Koridor Dalam',6,5,2,7,'#f1eadf','Akses internal ke ruang klinis.']
].map(([id,name,x,z,w,d,color,info])=>({id,name,x,z,w,d,color,info}));
const visibleRooms=spaces.filter(s=>!s.id.includes('hall'));
const roomById=new Map(spaces.map(s=>[s.id,s]));
const root=document.getElementById('viewport');
let renderer;
let needsRender=true;
try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});}
catch(error){document.getElementById('unsupported').style.display='grid';document.getElementById('loader').style.display='none';throw error;}
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,innerWidth<800?1.25:1.7));
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
root.appendChild(renderer.domElement);
renderer.domElement.id='scene';
const scene=new THREE.Scene();scene.background=new THREE.Color('#e7eee8');scene.fog=new THREE.Fog('#e7eee8',35,90);
scene.add(new THREE.HemisphereLight('#fff8ed','#9aa998',.85));
const sunlight=new THREE.DirectionalLight('#ffdfad',3.5);sunlight.position.set(-14,12,-10);sunlight.castShadow=true;sunlight.shadow.mapSize.set(2048,2048);sunlight.shadow.camera.left=-15;sunlight.shadow.camera.right=15;sunlight.shadow.camera.top=13;sunlight.shadow.camera.bottom=-13;sunlight.shadow.camera.near=1;sunlight.shadow.camera.far=52;sunlight.shadow.normalBias=.018;scene.add(sunlight);
sunlight.shadow.bias=-.00015;sunlight.shadow.autoUpdate=false;sunlight.shadow.needsUpdate=true;
const fillLight=new THREE.DirectionalLight('#dbeaff',.35);fillLight.position.set(12,9,8);scene.add(fillLight);
const camera=new THREE.PerspectiveCamera(38,1,.09,150);camera.position.set(23,23,25);
const planCamera=new THREE.OrthographicCamera(-20,20,15,-15,.1,150);planCamera.position.set(0,35,.0001);planCamera.lookAt(0,0,0);
const control=new OrbitControls(camera,renderer.domElement);control.enableDamping=true;control.dampingFactor=.075;control.minDistance=3.5;control.maxDistance=55;control.maxPolarAngle=Math.PI/2-.035;
control.addEventListener('change',()=>{needsRender=true;});
const walls=new THREE.Group(),props=new THREE.Group();scene.add(walls,props);
const overhead=new THREE.Group();scene.add(overhead);
const mat=(c,rough=.86,metal=0)=>new THREE.MeshStandardMaterial({color:c,roughness:rough,metalness:metal});
const m={wall:mat('#f8f7f1'),wood:mat('#bfa486'),sage:mat('#77998a'),green:mat('#2e5244'),metal:mat('#a8b9b7',.35,.48),white:mat('#f7f7f4'),glass:new THREE.MeshPhysicalMaterial({color:'#d3e9e0',transparent:true,opacity:.28,roughness:.12,depthWrite:false,side:THREE.DoubleSide})};
const P=(x,z,y=0)=>new THREE.Vector3(x-9,y,z-6);
function cube(parent,x,z,y,w,d,h,material=m.white){let a=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);a.position.copy(P(x,z,y+h/2));a.castShadow=true;a.receiveShadow=true;parent.add(a);return a;}
function cyl(parent,x,z,y,r,h,material){let a=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,20),material);a.position.copy(P(x,z,y+h/2));a.castShadow=true;parent.add(a);return a;}
function H(z,start,end,gaps=[]){let p=start;for(const [a,b] of gaps){if(a>p)cube(walls,(p+a)/2,z,0,a-p,.12,2.8,m.wall);p=b;}if(end>p)cube(walls,(p+end)/2,z,0,end-p,.12,2.8,m.wall);}
function V(x,start,end,gaps=[]){let p=start;for(const [a,b] of gaps){if(a>p)cube(walls,x,(p+a)/2,0,.12,a-p,2.8,m.wall);p=b;}if(end>p)cube(walls,x,(p+end)/2,0,.12,end-p,2.8,m.wall);}
cube(scene,9,6,-.34,38,30,.04,mat('#d9dfd1'));cube(scene,9,6,-.28,18.65,12.65,.22,mat('#ccd8ce'));cube(scene,9,6,-.06,18.3,12.3,.15,mat('#faf8f3'));
const floorMats=new Map();
function floorTexture(wood){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;const c=canvas.getContext('2d');
 c.fillStyle=wood?'#b58b62':'#deded5';c.fillRect(0,0,512,512);
 for(let row=0;row<(wood?8:4);row++)for(let col=-1;col<4;col++){
  const x=col*256+(row%2)*128,y=row*(wood?64:128);
  c.fillStyle=wood?['#ba9777','#c5a17b','#ac8868','#c0a080'][(row+col+5)%4]:'#e9e9e2';
  c.fillRect(x+1,y+1,254,(wood?64:128)-2);
  if(wood){c.strokeStyle='#795b3720';for(let line=0;line<9;line++){c.beginPath();c.moveTo(x+3,y+5+line*6);c.bezierCurveTo(x+70,y+line*6,x+150,y+14+line*6,x+250,y+5+line*6);c.stroke();}}
 }
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return texture;
}
const timber=floorTexture(true),tile=floorTexture(false);
for(const r of spaces){let material=mat('#ffffff',.78);material.map=(['waiting','consult','staff'].includes(r.id)?timber:tile).clone();material.map.repeat.set(r.w/3,r.d/3);floorMats.set(r.id,material);cube(scene,r.x+r.w/2,r.z+r.d/2,.09,r.w-.02,r.d-.02,.032,material);}
H(0,0,18,[[6.15,7.85]]);H(12,0,18);V(0,0,12);V(18,0,12);
H(3.5,0,18,[[6.2,7.8],[9.5,10.55],[13.25,14.25],[16.3,17.22]]);
V(8,0,3.5);V(12,0,3.5);V(16,0,3.5);
H(5,0,18,[[6.15,7.85],[9.9,11],[15.3,16.25]]);
H(8.5,0,18,[[6.1,7.9],[10.05,11.1],[15.4,16.4]]);
V(6,5,12,[[6.05,7.15],[9.68,10.76]]);
V(8,5,12,[[6.05,7.15],[9.68,10.76]]);
V(14,5,12,[[6.08,7.13],[9.7,10.74]]);
cube(walls,7,0,.15,1.60,.03,2.45,m.glass);
for(const x of [2,4.2,12.7,15.1])cube(walls,x,12,1.27,1.52,.025,1.14,m.glass);
cube(walls,10.0,3.5,.86,1.05,.024,1.52,m.glass);
// Scandinavian finishes: timber slats, reception furniture, plants, and wall art.
for(let i=0;i<15;i++)cube(props,.45+i*.12,.18,.27,.065,.05,2.16,m.wood);
function desk(x,z,w=1.7,d=.72){cube(props,x,z,.72,w,d,.08,m.wood);for(const a of [-w/2+.12,w/2-.12])for(const b of [-d/2+.1,d/2-.1])cube(props,x+a,z+b,0,.055,.06,.72,m.green);}
function plant(x,z,size=1){cyl(props,x,z,0,.25*size,.41*size,mat('#d4bda5'));let leave=mat('#537c60');for(let i=0;i<9;i++){let angle=2*Math.PI*i/9;let geo=new THREE.SphereGeometry(.2*size,9,7),leaf=new THREE.Mesh(geo,leave);leaf.scale.set(.42,1.9,.6);leaf.position.copy(P(x+Math.cos(angle)*.22*size,z+Math.sin(angle)*.22*size,.79*size));leaf.rotation.set(Math.sin(angle)*.24,0,Math.cos(angle)*.24);props.add(leaf);}}
desk(10,1.65,2.0);desk(13.6,1.8,1.7);desk(4.6,11.3,1.6);
plant(.66,.72,1.18);plant(7.28,3.03,.78);plant(11.48,.67,.9);plant(13.0,3.0,.8);
// Four local fill lights share the sun's single shadow map.
for(const [x,z] of [[4,2],[13,2],[4,10],[13,7]]){const light=new THREE.PointLight('#fff1dd',5,9,2);light.position.copy(P(x,z,2.55));scene.add(light);}
const trim=mat('#ded8cb');
walls.children.filter(o=>o.isMesh&&o.material===m.wall).forEach(wall=>{const size=wall.geometry.parameters;const skirting=new THREE.Mesh(new THREE.BoxGeometry(size.width+.015,.11,size.depth+.015),trim);skirting.position.copy(wall.position);skirting.position.y=.19;props.add(skirting);});
const colliders=[];
for(const r of spaces){const o=new THREE.Mesh(new THREE.PlaneGeometry(r.w-.15,r.d-.15),new THREE.MeshBasicMaterial({visible:false,side:THREE.DoubleSide}));o.rotation.x=-Math.PI/2;o.position.copy(P(r.x+r.w/2,r.z+r.d/2,.156));o.userData.room=r.id;scene.add(o);colliders.push(o);}
const roomList=document.getElementById('roomList');
for(let i=0;i<visibleRooms.length;i++){let r=visibleRooms[i],b=document.createElement('button');b.className='room';b.dataset.id=r.id;b.innerHTML=`<span class="dot" style="background:${r.color};border:1px solid #bfd0c2"></span><span>${r.name}</span><span class="num">${String(i+1).padStart(2,'0')}</span>`;b.onclick=()=>select(r.id,true);roomList.appendChild(b);}
let current=camera,view='3d',selected=null,hover=null,cutaway=true,tween=null;
const labels=new Map();
for(const r of visibleRooms){let e=document.createElement('div');e.className='room-label';e.textContent=r.name;root.appendChild(e);labels.set(r.id,e);}
function updateFloor(){needsRender=true;for(const r of spaces){floorMats.get(r.id).color.set(r.id===selected?'#f7d4a5':r.id===hover?'#fff0d8':'#ffffff');}}
function select(id,zoom=false){selected=id;roomList.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.id===id));let r=roomById.get(id);document.getElementById('detailTitle').textContent=r?r.name:'Explore the clinic';document.getElementById('detailText').textContent=r?r.info:'Pilih ruangan dari daftar atau klik langsung pada lantai model.';updateFloor();if(zoom&&r&&view!=='2d'){let t=P(r.x+r.w/2,r.z+r.d/2,.5);tween={start:performance.now(),a:camera.position.clone(),b:t.clone().add(new THREE.Vector3(6.6,8.8,9.8)),ta:control.target.clone(),tb:t};}}
const glbLoader=new GLTFLoader();const templates={};
function arrayBuffer(base64){let bin=atob(base64),array=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)array[i]=bin.charCodeAt(i);return array.buffer;}
async function decode(key,data){return new Promise((resolve,reject)=>glbLoader.parse(arrayBuffer(data),'',gltf=>{let item=gltf.scene;item.updateMatrixWorld(true);let bb=new THREE.Box3().setFromObject(item),center=new THREE.Vector3();bb.getCenter(center);item.position.set(-center.x,-bb.min.y,-center.z);item.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;}});let group=new THREE.Group();group.add(item);templates[key]=group;resolve();},reject));}
function put(id,x,z,angle=0,scale=1,y=.13){if(!templates[id])throw new Error(`Missing asset: ${id}`);let a=templates[id].clone(true);a.name=id;a.userData.asset=id;a.position.copy(P(x,z,y));a.rotation.y=angle;a.scale.setScalar(scale);props.add(a);return a;}
function dental(x,z,type){
 put(type,x,z,Math.PI);put('light',x+.95,z-1.02,Math.PI);put('delivery',x+1.25,z+.18,Math.PI);
 put('spittoon',x-1.01,z-.13);put('dentist_stool',x-.92,z+.87);put('nurse_stool',x+1.03,z+1.12);
 put('monitor',x+1.57,z-1.1);put('suction',x-1.58,z+.32);
 put('instrument_tray',x+1.08,z-.6,0,.82);put('pedal_bin',x-2.0,z-1.15,0,.83);
 put('cabinet',x-1.61,z-1.48);put('sink_cabinet',x-.55,z-1.48);put('cabinet',x+.51,z-1.48);
 put('scaler',x-1.61,z-1.48,0,1,1.0);put('curing_light',x+.51,z-1.48,0,1,1.0);
 put('sharps',x-2.35,z-1.36);put('dispenser',x+2.45,z-1.48,0,1,1.2);
 put('gel',x-.55,z-1.48,0,1,1.1);
}
function placeAll(){
 dental(3.13,7.06,'chair');dental(11.12,7.06,'chair_blue');dental(11.12,10.68,'chair_reclined');
 put('reception',4.45,2.64,Math.PI);put('waiting_chairs',2.03,1.13,-Math.PI/2);put('coral_chairs',5.40,1.0,Math.PI);
 put('low_table',3.35,1.16);put('water_cooler',7.1,1.2);put('play_corner',.98,1.26,0,.75);
 put('appointment_screen',7.19,2.8,.3);put('coat_stand',7.46,2.95);put('notice_board',.6,3.10,Math.PI);
 put('autoclave',15.2,6.09,Math.PI/2);put('washer',16.72,6.04,Math.PI/2);
 put('ultrasonic',15.33,7.49);put('sterile_cabinet',17.12,7.50,Math.PI/2);put('pouch_rack',16.02,7.55);
 put('gel',14.34,6.11,0,1,1.15);put('sink_cabinet',14.55,7.75);
 put('dispenser',17.65,6.85,-Math.PI/2,1,1.2);put('pedal_bin',14.5,5.45);
 // Keep dental radiography intraoral: a hospital table X-ray is a different machine.
 put('chair',1.8,10.3,Math.PI/2);put('xray_arm',.85,10.3,-Math.PI/2,1,.65);
 put('sensor',4.1,11.3,0,1,.80);put('xray_viewer',3.3,11.68,Math.PI,1,.65);
 put('desktop',4.85,11.28,Math.PI,1,.80);put('keyboard',4.85,10.99,Math.PI,1,.80);
 put('mouse',5.22,11.02,0,1,.80);put('task_chair',4.7,10.35,Math.PI);
 put('cabinet',.75,11.5);put('pedal_bin',.42,8.95,0,.8);
 // A hanging apron and warning plate identify the room in the cutaway view.
 const apron=mat('#4c7379',.95);cube(props,.2,9.15,.85,.045,.46,.7,apron);
 cube(props,.2,8.99,1.5,.045,.09,.22,apron);cube(props,.2,9.31,1.5,.045,.09,.22,apron);
 cube(props,.2,9.15,1.74,.075,.58,.04,m.metal);
 const signCanvas=document.createElement('canvas');signCanvas.width=512;signCanvas.height=256;
 const signContext=signCanvas.getContext('2d');signContext.fillStyle='#f4cf61';signContext.fillRect(0,0,512,256);
 signContext.fillStyle='#272a26';signContext.textAlign='center';signContext.font='bold 82px sans-serif';signContext.fillText('☢',256,95);
 signContext.font='bold 30px sans-serif';signContext.fillText('RADIOGRAFI',256,156);signContext.font='22px sans-serif';signContext.fillText('AREA PEMERIKSAAN',256,205);
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(.7,.35),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(signCanvas),side:THREE.DoubleSide}));
 sign.position.copy(P(5.93,9.12,1.55));sign.rotation.y=-Math.PI/2;props.add(sign);
 put('desktop',10.15,1.65,0,1,.80);put('keyboard',10.1,1.94,0,1,.80);
 put('mouse',10.48,1.94,0,1,.80);put('jaw_model',9.32,1.65,0,.65,.80);
 put('task_chair',10, .77);put('guest_chair',9.4,2.65,Math.PI);put('guest_chair',10.6,2.65,Math.PI);
 put('records',11.55,.7,Math.PI);put('model_boxes',11.55,.7,0,.75,1.5);
 put('guest_chair',13.1,2.65,Math.PI);put('guest_chair',14.15,2.65,Math.PI);
 put('lockers',14.75,.4);put('staff_fridge',15.5,2.85,Math.PI/2);
 put('cabinet',12.5,.5);put('kettle',12.5,.5,0,1,1.0);
 put('wc',17.15,.6);put('basin',17.63,2.25,-Math.PI/2);
 put('mirror',17.88,2.25,-Math.PI/2,1,1.2);put('toilet_roll',17.85,.9,-Math.PI/2,1,.65);
 put('gel',17.88,1.7,-Math.PI/2,1,1.1);put('pedal_bin',16.5,.55,0,.75);
 put('stock_shelf',15.1,11.6,Math.PI);put('stock_shelf',17,11.6,Math.PI);
 put('sterile_cabinet',17.45,9.3,-Math.PI/2);put('model_boxes',15.2,10.5);
 put('coat_stand',14.55,9.05);
 for(const [x,z,angle] of [[3,.19,0],[10,.19,0],[13.5,.19,0],[3,5.19,0],[11,5.19,0],[3,11.80,Math.PI],[11,11.80,Math.PI]])put('ac_indoor',x,z,angle,1,2.28);
 put('ac_outdoor',18.65,9.4,-Math.PI/2);put('ac_outdoor',18.65,10.6,-Math.PI/2);
 for(const r of visibleRooms){const panel=put('ceiling_panel',r.x+r.w/2,r.z+r.d/2,0,1,2.75);overhead.attach(panel);}
}
async function load(){const items=Object.entries(MODEL_DATA),total=items.length;let count=0;for(const [key,data] of items){await decode(key,data);count++;document.getElementById('progressBar').style.width=100*count/total+'%';document.getElementById('progressLabel').textContent=`Menyiapkan interior ${count} / ${total}`;if(count%2===0)await new Promise(r=>setTimeout(r,0));}placeAll();sunlight.shadow.needsUpdate=true;needsRender=true;document.getElementById('loader').style.display='none';}
load().catch(e=>{console.error(e);document.getElementById('progressLabel').textContent='Ada aset yang gagal. Ruang dasar masih bisa dilihat.';setTimeout(()=>document.getElementById('loader').style.display='none',2000);});
function setView(v){control.enableDamping=false;control.update();control.enableDamping=true;view=v;tween=null;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===v));
 if(v==='2d'){current=planCamera;control.object=planCamera;control.enableRotate=false;planCamera.position.set(0,35,.0001);planCamera.zoom=1;control.target.set(0,0,0);walls.visible=false;}
 else{current=camera;control.object=camera;control.enableRotate=true;camera.zoom=1;if(v==='walk'){camera.position.set(-4.4,1.7,-5.2);control.target.set(-1.4,1.5,1);}else{fitClinic();}walls.visible=true;}
 overhead.visible=v==='walk';sunlight.shadow.needsUpdate=true;needsRender=true;
 current.updateProjectionMatrix();
 document.getElementById('viewHint').textContent=v==='2d'?'Top-down room plan · Scroll to zoom':v==='walk'?'Eye level · Drag to look around':'Drag to orbit · Scroll to zoom · Click to inspect';control.update();}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
document.getElementById('wallBtn').onclick=()=>{cutaway=!cutaway;walls.scale.y=cutaway?.27:1;sunlight.shadow.needsUpdate=true;needsRender=true;document.getElementById('wallBtn').textContent=cutaway?'◧ Cutaway walls':'▣ Full walls';};
walls.scale.y=.27;
overhead.visible=false;
document.getElementById('resetBtn').onclick=()=>{hover=null;select(null);setView('3d');};
document.getElementById('pngBtn').onclick=()=>{renderer.render(scene,current);try{let a=document.createElement('a');a.download='Elora-Smile-Clinic-'+view+'.png';a.href=renderer.domElement.toDataURL('image/png');a.click();}catch(e){console.warn(e);}};
const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();
function pick(e){let r=renderer.domElement.getBoundingClientRect();mouse.set(2*(e.clientX-r.left)/r.width-1,1-2*(e.clientY-r.top)/r.height);ray.setFromCamera(mouse,current);let intersects=ray.intersectObjects(colliders);return intersects[0]?.object.userData.room||null;}
let down=null;
renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});
renderer.domElement.addEventListener('pointerup',e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<5){let id=pick(e);if(id)select(id);}down=null;});
renderer.domElement.addEventListener('pointermove',e=>{if(down)return;const id=pick(e);if(id!==hover){hover=id;renderer.domElement.style.cursor=id?'pointer':'grab';updateFloor();}});
function fitClinic(){
 const target=new THREE.Vector3(0,.65,0),direction=new THREE.Vector3(1,1.25,1.1).normalize();
 camera.position.copy(target).add(direction);camera.lookAt(target);camera.updateMatrixWorld(true);
 const inverse=camera.quaternion.clone().invert(),vertical=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),horizontal=vertical*camera.aspect;
 let distance=0;
 for(const x of [-9.6,10.2])for(const y of [-.3,3.1])for(const z of [-6.5,6.5]){
  const corner=new THREE.Vector3(x,y,z).sub(target).applyQuaternion(inverse);
  distance=Math.max(distance,corner.z+Math.abs(corner.x)/(horizontal*.82),corner.z+Math.abs(corner.y)/(vertical*.76));
 }
 control.maxDistance=Math.max(55,distance*1.3);camera.position.copy(target).addScaledVector(direction,distance);control.target.copy(target);
 scene.fog.near=Math.max(35,distance+15);scene.fog.far=Math.max(90,distance+75);
}
function resize(){let r=root.getBoundingClientRect(),w=Math.max(r.width,1),h=Math.max(r.height,1);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();let extent=Math.max(7.8,11.8/(w/h));planCamera.left=-extent*w/h;planCamera.right=extent*w/h;planCamera.top=extent;planCamera.bottom=-extent;planCamera.updateProjectionMatrix();if(view==='3d'&&!selected){tween=null;fitClinic();}control.update();needsRender=true;}
new ResizeObserver(resize).observe(root);resize();
const p=new THREE.Vector3();
function frame(now){requestAnimationFrame(frame);if(tween){needsRender=true;let t=Math.min((now-tween.start)/770,1);t=1-Math.pow(1-t,3);camera.position.lerpVectors(tween.a,tween.b,t);control.target.lerpVectors(tween.ta,tween.tb,t);if(t===1)tween=null;}control.update();if(!needsRender)return;
 for(const r of visibleRooms){let n=labels.get(r.id);if(view!=='2d'){n.style.display='none';continue;}p.copy(P(r.x+r.w/2,r.z+r.d/2,.16)).project(current);n.style.display='block';n.style.left=(p.x*.5+.5)*root.clientWidth+'px';n.style.top=(-p.y*.5+.5)*root.clientHeight+'px';}
 renderer.render(scene,current);
 needsRender=false;
}
requestAnimationFrame(frame);
