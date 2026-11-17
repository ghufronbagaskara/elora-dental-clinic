import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {BUILDING,SPACES,ROOMS,WALLS,OPENINGS,SITE,openingsOn,wallBody} from './clinic-data.js';

// Procedural shell, roof, site and room dressing. Static pieces are merged per material and
// repeated pieces are instanced, so the whole addition costs a few dozen draw calls.
const {width:W,depth:D,wallHeight:WH}=BUILDING;
export const CUT_HEIGHT=WH*.27;
const P=(x,z,y=0)=>new THREE.Vector3(x-W/2,y,z-D/2);
const mat=(color,roughness=.86,metalness=0,extra={})=>new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});
function rng(seed){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}

class Batch{
 constructor(){this.items=new Map();}
 add(material,geometry){if(!this.items.has(material))this.items.set(material,[]);this.items.get(material).push(geometry);return geometry;}
 // Axis-aligned box from site-coordinate extents.
 box(material,x0,x1,y0,y1,z0,z1){
  const g=new THREE.BoxGeometry(Math.abs(x1-x0),Math.abs(y1-y0),Math.abs(z1-z0));
  const c=P((x0+x1)/2,(z0+z1)/2,(y0+y1)/2);g.translate(c.x,c.y,c.z);return this.add(material,g);
 }
 // Box along a wall: a = position along the wall, p = absolute perpendicular coordinate.
 wall(material,wall,a0,a1,y0,y1,p0,p1){return wall.o==='h'?this.box(material,a0,a1,y0,y1,p0,p1):this.box(material,p0,p1,y0,y1,a0,a1);}
 cyl(material,x,z,y0,h,r0,r1=r0,seg=16){const g=new THREE.CylinderGeometry(r1,r0,h,seg);const c=P(x,z,y0+h/2);g.translate(c.x,c.y,c.z);return this.add(material,g);}
 finish(parent,{shadow=true,uv=new Map()}={}){
  const meshes=[];
  for(const [material,geos] of this.items){
   const merged=mergeGeometries(geos,false);geos.forEach(g=>g.dispose());
   const tile=uv.get(material);
   if(tile){const pos=merged.attributes.position,uvs=merged.attributes.uv;for(let i=0;i<pos.count;i++)uvs.setXY(i,pos.getX(i)/tile,pos.getZ(i)/tile);}
   const mesh=new THREE.Mesh(merged,material);
   mesh.castShadow=shadow&&!material.transparent&&!material.userData.noShadow;mesh.receiveShadow=true;
   parent.add(mesh);meshes.push(mesh);
  }
  this.items.clear();return meshes;
 }
}

function texture(canvas,repeat=false){
 const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;
 if(repeat)t.wrapS=t.wrapT=THREE.RepeatWrapping;
 return t;
}
// Deterministic pseudo-noise so duplicated vertices of a non-indexed mesh move together.
const lumpy=(x,y,z)=>1+.16*Math.sin(x*7.3+y*3.1)*Math.cos(z*6.1-y*2.3)+.07*Math.sin((x+z)*13.7);
function blobCluster(blobs,seed){
 const rand=rng(seed),parts=[];
 for(let i=0;i<blobs;i++){
  const g=new THREE.IcosahedronGeometry(.5,1),pos=g.attributes.position;
  for(let v=0;v<pos.count;v++){const x=pos.getX(v),y=pos.getY(v),z=pos.getZ(v),n=lumpy(x+i,y,z-i);pos.setXYZ(v,x*n,y*n*.82,z*n);}
  const s=i===0?1:.55+rand()*.35,a=rand()*Math.PI*2,r=i===0?0:.32+rand()*.18;
  g.scale(s,s,s);g.translate(Math.cos(a)*r,(i===0?0:.08+rand()*.22),Math.sin(a)*r);parts.push(g);
 }
 const g=mergeGeometries(parts,false);parts.forEach(p=>p.dispose());g.computeVertexNormals();
 g.computeBoundingBox();g.translate(0,-g.boundingBox.min.y,0);return g;
}
function instanced(parent,geometry,material,transforms,colors){
 const mesh=new THREE.InstancedMesh(geometry,material,transforms.length),m=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler();
 transforms.forEach((t,i)=>{e.set(t.rx||0,t.ry||0,t.rz||0);q.setFromEuler(e);m.compose(t.p,q,t.s instanceof THREE.Vector3?t.s:new THREE.Vector3(t.s,t.s,t.s));mesh.setMatrixAt(i,m);if(colors)mesh.setColorAt(i,new THREE.Color(colors[i]));});
 mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();parent.add(mesh);return mesh;
}
// Plane facing away from a wall face. side: +1 faces +z/+x of the wall.
function facePlane(wall,along,y,side,w,h,inset=.006){
 const body=wallBody(wall),g=new THREE.PlaneGeometry(w,h);
 const off=body.center+side*(body.t/2+inset);
 if(wall.o==='h'){if(side<0)g.rotateY(Math.PI);const c=P(along,off,y);g.translate(c.x,c.y,c.z);}
 else{g.rotateY(side>0?Math.PI/2:-Math.PI/2);const c=P(off,along,y);g.translate(c.x,c.y,c.z);}
 return g;
}
function atlasUV(g,col,row,cols,rows){const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,(col+uv.getX(i))/cols,1-(row+1-uv.getY(i))/rows);return g;}
const spaceAt=(x,z)=>SPACES.find(s=>x>s.x&&x<s.x+s.w&&z>s.z&&z<s.z+s.d);

export function buildArchitecture({canvas,shared,envMap,plants=[]}){
 const M={
  wall:shared.wall,wood:shared.wood,white:shared.white,metal:shared.metal,sage:shared.sage,
  trim:mat('#e4ddd0',.7),frame:mat('#2a302d',.42,.55),stone:mat('#d8d3c8',.8),plinth:mat('#c7cec4',.9),
  roof:mat('#cfd3cc',.95),coping:mat('#cbc5b8',.75),unit:mat('#e2e5e1',.5,.25),dark:mat('#3a423f',.6,.3),
  grille:mat('#59615d',.55,.4),tank:mat('#d9dfdc',.45,.1),fascia:mat('#183b32',.6),
  glass:new THREE.MeshPhysicalMaterial({color:'#c4dcd6',roughness:.05,metalness:0,transparent:true,opacity:.34,depthWrite:false,side:THREE.DoubleSide,envMap,envMapIntensity:1.3}),
  frosted:new THREE.MeshPhysicalMaterial({color:'#eef4f1',roughness:.6,transparent:true,opacity:.82,depthWrite:false,side:THREE.DoubleSide}),
  glow:new THREE.MeshStandardMaterial({color:'#fff6e4',emissive:'#ffe7bd',emissiveIntensity:1.4,roughness:.4}),
  exit:new THREE.MeshStandardMaterial({color:'#2f8a55',emissive:'#2f9a5c',emissiveIntensity:.9}),
  lawn:mat('#ffffff',.98),asphalt:mat('#ffffff',.92),paving:mat('#ffffff',.88),mulch:mat('#ffffff',.98),
  gravel:mat('#c6c3ba',.98),line:mat('#f4f3ee',.7),curb:mat('#d9d6ce',.85),
  edging:mat('#8d6e52',.8),fence:mat('#2f3533',.5,.45),shelter:mat('#5f7c70',.55,.3),
  leaf:mat('#ffffff',.9,0,{flatShading:true}),crown:mat('#ffffff',.92,0,{flatShading:true}),bark:mat('#6b5848',.9),
  pot:mat('#d4bda5'),plantLeaf:mat('#537c60')
 };
 M.glow.userData.noShadow=true;M.exit.userData.noShadow=true;M.line.userData.noShadow=true;
 M.lawn.map=surfaceTexture(canvas,'lawn');M.asphalt.map=surfaceTexture(canvas,'asphalt');M.paving.map=surfaceTexture(canvas,'paving');M.mulch.map=surfaceTexture(canvas,'mulch');
 const full=new THREE.Group(),cut=new THREE.Group(),roof=new THREE.Group(),site=new THREE.Group(),details=new THREE.Group(),overhead=new THREE.Group();
 full.name='shell-full';cut.name='shell-cut';roof.name='roof';site.name='site';
 const segments=[];

 // ---- Walls: full-height shell with real openings, and a low cutaway shell.
 const F=new Batch(),C=new Batch(),S=new Batch();
 for(const wall of WALLS){
  const body=wallBody(wall),p0=body.center-body.t/2,p1=body.center+body.t/2,ops=openingsOn(wall.id);
  const seg=(a0,a1,y0,y1)=>{if(a1-a0<.005||y1-y0<.005)return;F.wall(M.wall,wall,a0,a1,y0,y1,p0,p1);segments.push({wall:wall.id,from:a0,to:a1,y0,y1});};
  let a=body.from;
  for(const op of ops){
   seg(a,op.from,0,WH);
   if(op.type==='window'){seg(op.from,op.to,0,op.sill);seg(op.from,op.to,op.head,WH);}
   else if(op.head)seg(op.from,op.to,op.head,WH);
   a=op.to;
  }
  seg(a,body.to,0,WH);
  // Cutaway shell: windows stay solid below the cut, door openings stay open.
  let c=body.from;
  for(const op of ops.filter(o=>o.type!=='window'||o.sill<CUT_HEIGHT)){if(op.from>c)C.wall(M.wall,wall,c,op.from,0,CUT_HEIGHT,p0,p1);c=op.to;}
  if(body.to>c)C.wall(M.wall,wall,c,body.to,0,CUT_HEIGHT,p0,p1);
  // Skirting on room faces only, interrupted at doors.
  let s=wall.ext?wall.from:body.from;
  const skirt=(a0,a1)=>{if(a1-a0<.05)return;if(wall.ext){const inner=wall.at-wall.out*BUILDING.intWall/2;S.wall(M.trim,wall,a0,a1,.13,.24,Math.min(inner,inner-wall.out*.014),Math.max(inner,inner-wall.out*.014));}else S.wall(M.trim,wall,a0,a1,.13,.24,p0-.009,p1+.009);};
  for(const op of ops.filter(o=>o.type!=='window')){skirt(s,op.from);s=op.to;}
  skirt(s,wall.ext?wall.to:body.to);
  if(wall.ext){
   // Exterior base band, interrupted only by doors.
   const face=body.outerFace,q0=Math.min(face,face+wall.out*.025),q1=Math.max(face,face+wall.out*.025);
   let b=body.from-(wall.o==='v'?0:.025);
   for(const op of ops.filter(o=>o.type==='entry'||o.type==='exit')){F.wall(M.plinth,wall,b,op.from,-.06,.3,q0,q1);b=op.to;}
   F.wall(M.plinth,wall,b,body.to+(wall.o==='v'?0:.025),-.06,.3,q0,q1);
  }
 }
 // ---- Openings: frames, glass, leaves, sills and thresholds.
 for(const op of OPENINGS){
  const wall=WALLS.find(w=>w.id===op.wall),body=wallBody(wall),c=body.center,t=body.t,w=op.to-op.from;
  if(op.type==='window'){
   const f=.05,d=.08,g0=c-d/2,g1=c+d/2,glass=op.frosted?M.frosted:M.glass;
   F.wall(M.frame,wall,op.from,op.to,op.head-f,op.head,g0,g1);F.wall(M.frame,wall,op.from,op.to,op.sill,op.sill+f,g0,g1);
   F.wall(M.frame,wall,op.from,op.from+f,op.sill,op.head,g0,g1);F.wall(M.frame,wall,op.to-f,op.to,op.sill,op.head,g0,g1);
   const panes=Math.max(1,Math.round(w/1.05));
   for(let i=1;i<panes;i++){const m=op.from+w*i/panes;F.wall(M.frame,wall,m-.02,m+.02,op.sill,op.head,g0,g1);}
   F.wall(glass,wall,op.from+f,op.to-f,op.sill+f,op.head-f,c-.006,c+.006);
   if(wall.ext){
    const face=body.outerFace,o=wall.out;
    F.wall(M.stone,wall,op.from-.05,op.to+.05,op.sill-.05,op.sill,Math.min(face-o*.02,face+o*.05),Math.max(face-o*.02,face+o*.05));
    const inner=wall.at-o*BUILDING.intWall/2;
    F.wall(M.white,wall,op.from-.03,op.to+.03,op.sill-.03,op.sill,Math.min(inner+o*.02,inner-o*.04),Math.max(inner+o*.02,inner-o*.04));
   }
   continue;
  }
  // Thresholds in every passage.
  F.wall(M.stone,wall,op.from,op.to,.09,.128,c-t/2-.01,c+t/2+.01);
  if(op.type==='open'){
   if(op.head){F.wall(M.trim,wall,op.from-.04,op.from,0,op.head,c-t/2-.012,c+t/2+.012);F.wall(M.trim,wall,op.to,op.to+.04,0,op.head,c-t/2-.012,c+t/2+.012);}
   continue;
  }
  if(op.type==='entry'){
   const f=.06,d=.1,g0=c-d/2,g1=c+d/2,mid=(op.from+op.to)/2,tr=2.1;
   F.wall(M.frame,wall,op.from,op.from+f,0,op.head,g0,g1);F.wall(M.frame,wall,op.to-f,op.to,0,op.head,g0,g1);
   F.wall(M.frame,wall,op.from,op.to,op.head-f,op.head,g0,g1);F.wall(M.frame,wall,op.from,op.to,tr-.03,tr+.03,g0,g1);
   F.wall(M.frame,wall,mid-.03,mid+.03,.13,tr,g0,g1);
   for(const [a0,a1] of [[op.from+f,mid-.03],[mid+.03,op.to-f]]){
    F.wall(M.frame,wall,a0,a1,.13,.24,c-.025,c+.025);
    F.wall(M.glass,wall,a0,a1,.24,tr-.03,c-.006,c+.006);
   }
   F.wall(M.glass,wall,op.from+f,op.to-f,tr+.03,op.head-f,c-.006,c+.006);
   for(const s of [-1,1])for(const x of [mid-.13,mid+.13])F.wall(M.metal,wall,x-.016,x+.016,.82,1.78,c+s*.05,c+s*.085);
   continue;
  }
  // Single leaf door with frame, leaf and lever.
  const f=.045,leaf=op.type==='exit'?M.sage:M.wood;
  F.wall(M.trim,wall,op.from,op.from+f,0,op.head,c-t/2-.012,c+t/2+.012);
  F.wall(M.trim,wall,op.to-f,op.to,0,op.head,c-t/2-.012,c+t/2+.012);
  F.wall(M.trim,wall,op.from,op.to,op.head-f,op.head,c-t/2-.012,c+t/2+.012);
  F.wall(leaf,wall,op.from+f+.004,op.to-f-.004,.135,op.head-f-.004,c-.02,c+.02);
  const latch=op.hinge==='from'?op.to-f-.1:op.from+f+.1,dir=op.hinge==='from'?-1:1;
  for(const s of [-1,1]){
   F.wall(M.metal,wall,latch-.018,latch+.018,.99,1.06,Math.min(c+s*.02,c+s*.06),Math.max(c+s*.02,c+s*.06));
   F.wall(M.metal,wall,Math.min(latch,latch+dir*.13),Math.max(latch,latch+dir*.13),1.005,1.035,Math.min(c+s*.06,c+s*.085),Math.max(c+s*.06,c+s*.085));
  }
  if(op.type==='exit'){const inner=wall.at-wall.out*BUILDING.intWall/2;F.wall(M.exit,wall,(op.from+op.to)/2-.17,(op.from+op.to)/2+.17,op.head+.1,op.head+.24,inner-wall.out*.05,inner);}
 }
 // ---- Entrance canopy with the Elora fascia sign.
 const L=SITE.landing;
 F.box(M.white,L.x0,L.x1,2.5,2.64,L.z0,-.14);F.box(M.wood,L.x0+.05,L.x1-.05,2.47,2.5,L.z0+.05,-.14);
 F.box(M.fascia,L.x0-.02,L.x1+.02,2.42,2.78,L.z0-.06,L.z0+.02);
 for(const x of [L.x0+1.2,L.x1-1.2])F.cyl(M.glow,x,(L.z0-.14)/2,2.455,.015,.07,.07,14);
 F.finish(full);C.finish(cut);S.finish(details,{shadow:false});
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(L.x1-L.x0-.3,.3),new THREE.MeshStandardMaterial({map:signTexture(canvas,'fascia'),emissive:'#ffffff',emissiveIntensity:.18,emissiveMap:null,roughness:.6}));
 sign.material.emissiveMap=sign.material.map;sign.rotation.y=Math.PI;sign.position.copy(P((L.x0+L.x1)/2,L.z0-.062,2.6));full.add(sign);

 // ---- Roof: slab with cornice, parapet, coping and rooftop plant.
 const R=new Batch(),e=BUILDING.extWall-BUILDING.intWall/2;
 R.box(M.trim,-e-.05,W+e+.05,WH,WH+.18,-e-.05,D+e+.05);
 R.box(M.roof,-e+.15,W+e-.15,WH+.18,WH+.2,-e+.15,D+e-.15);
 const pt=.15,ph=.5,top=WH+.18+ph;
 for(const [x0,x1,z0,z1] of [[-e,W+e,-e,-e+pt],[-e,W+e,D+e-pt,D+e],[-e,-e+pt,-e+pt,D+e-pt],[W+e-pt,W+e,-e+pt,D+e-pt]]){
  R.box(M.wall,x0,x1,WH+.18,top,z0,z1);
  R.box(M.coping,x0-(x1-x0<1?.04:0),x1+(x1-x0<1?.04:0),top,top+.05,z0-(z1-z0<1?.04:0),z1+(z1-z0<1?.04:0));
 }
 const roofY=WH+.2;
 for(const x of [9.6,10.9,12.2]){
  R.box(M.stone,x-.5,x+.5,roofY,roofY+.08,10.45,11.25);
  R.box(M.unit,x-.46,x+.46,roofY+.08,roofY+.76,10.55,11.0);
  const g=new THREE.CylinderGeometry(.24,.24,.02,24);g.rotateX(Math.PI/2);const p=P(x-.05,10.545,roofY+.42);g.translate(p.x,p.y,p.z);R.add(M.grille,g);
  R.box(M.dark,x+.3,x+.42,roofY+.15,roofY+.7,10.54,10.55);
 }
 R.box(M.metal,9.3,12.5,roofY,roofY+.07,10.25,10.37);R.box(M.metal,12.4,12.52,roofY,roofY+.07,6.8,10.37);
 // Air handling unit with louvres and a supply duct dropping into the roof.
 R.box(M.stone,2.2,4.6,roofY,roofY+.1,8.9,10.3);R.box(M.unit,2.3,4.5,roofY+.1,roofY+1.1,9.0,10.2);
 for(let i=0;i<6;i++)R.box(M.grille,2.45+i*.34,2.67+i*.34,roofY+.35,roofY+.95,8.985,9.0);
 R.box(M.metal,3.1,3.7,roofY+.4,roofY+.95,8.2,9.0);R.box(M.metal,3.1,3.7,roofY,roofY+.95,7.6,8.2);
 // Water tank on a steel stand and a roof hatch.
 for(const [x,z] of [[15.75,9.75],[16.85,9.75],[15.75,10.85],[16.85,10.85]])R.box(M.dark,x-.04,x+.04,roofY,roofY+1.1,z-.04,z+.04);
 R.box(M.dark,15.6,17,roofY+1.1,roofY+1.18,9.6,11);R.cyl(M.tank,16.3,10.3,roofY+1.18,1.15,.6,.6,28);R.cyl(M.tank,16.3,10.3,roofY+2.33,.12,.6,.18,28);
 R.box(M.coping,6.55,7.45,roofY,roofY+.32,6.1,6.9);R.box(M.unit,6.5,7.5,roofY+.32,roofY+.38,6.05,6.95);
 for(const [x,z] of [[16.9,1.2],[1,6],[13.5,7.2],[4.8,2.1]])R.cyl(M.grille,x,z,roofY,.45,.055,.055,10);
 R.finish(roof);

 // ---- Site: lawn, plaza, parking, landscaping, fence and lighting.
 const G=new Batch(),A=SITE;
 G.box(M.lawn,A.lot.x0-1,A.lot.x1+1,-.36,-.3,A.sidewalk.z1,A.lot.z1+1);
 G.box(M.asphalt,A.aisle.x0,A.aisle.x1,-.36,-.28,A.aisle.z0,A.aisle.z1);
 G.box(M.asphalt,A.driveway.x0,A.driveway.x1,-.36,-.28,A.driveway.z0,A.driveway.z1);
 G.box(M.asphalt,A.lot.x0-8,A.lot.x1+8,-.4,-.3,A.street.z0,A.street.z1);
 G.box(M.asphalt,A.stalls[0][0]-2.5,A.stalls.at(-1)[1],-.36,-.28,A.stallRow.z0,A.stallRow.z1);
 G.box(M.asphalt,A.motor.x0-.3,A.motor.x1,-.36,-.28,A.motor.z0,A.motor.z1);
 // Raised plaza with a kerb ramp at the crossing, landing and ramp at the entrance.
 const pz=A.plaza,zr=A.zebra,front=-.33;
 G.box(M.paving,pz.x0,pz.x1,-.36,-.06,pz.z0+1,front);
 G.box(M.paving,pz.x0,zr.x0,-.36,-.06,pz.z0,pz.z0+1);G.box(M.paving,zr.x1,pz.x1,-.36,-.06,pz.z0,pz.z0+1);
 ramp(G,M.paving,zr.x0,zr.x1,pz.z0,pz.z0+1,-.28,-.06);
 G.box(M.paving,L.x0,L.x1,-.36,.06,L.z0,front);ramp(G,M.paving,L.x0+.6,L.x1-.6,L.z0-1.2,L.z0,-.06,.06);
 G.box(M.curb,pz.x0,zr.x0,-.36,-.05,pz.z0,pz.z0+.14);G.box(M.curb,zr.x1,pz.x1,-.36,-.05,pz.z0,pz.z0+.14);
 G.box(M.paving,A.walkway.x0,A.walkway.x1,-.36,-.27,A.walkway.z0,A.walkway.z1);
 G.box(M.paving,A.lot.x0-8,A.driveway.x0,-.36,-.14,A.sidewalk.z0,A.sidewalk.z1);G.box(M.paving,A.driveway.x1,A.lot.x1+8,-.36,-.14,A.sidewalk.z0,A.sidewalk.z1);
 G.box(M.curb,A.lot.x0-8,A.driveway.x0,-.4,-.13,A.sidewalk.z0,A.sidewalk.z0+.15);G.box(M.curb,A.driveway.x1,A.lot.x1+8,-.4,-.13,A.sidewalk.z0,A.sidewalk.z0+.15);
 G.box(M.paving,-1.95,-.33,-.36,-.06,front,D+.33);G.box(M.gravel,W+.33,19.6,-.36,-.27,front,D+.33);
 G.box(M.paving,-.33,W+.33,-.36,-.1,D+.33,D+1.2);
 // Markings.
 const y0=-.281,y1=-.274,sr=A.stallRow;
 for(const x of [...new Set([A.stalls[0][0],...A.stalls.flat(),A.accessible.x0,...A.accessible.hatch])])G.box(M.line,x-.05,x+.05,y0,y1,sr.z0,sr.z1-.2);
 G.box(M.line,A.stalls[0][0],A.accessible.hatch[1],y0,y1,sr.z0,sr.z0+.1);G.box(M.line,A.stalls[1][0],A.stalls.at(-1)[1],y0,y1,sr.z0,sr.z0+.1);
 for(let z=zr.z0+.35;z<zr.z1-.3;z+=1)G.box(M.line,zr.x0+.1,zr.x1-.1,y0,y1,z,z+.5);
 const mw=(A.motor.x1-A.motor.x0)/A.motor.count;
 for(let i=0;i<=A.motor.count;i++){const x=A.motor.x0+i*mw;G.box(M.line,x-.04,x+.04,y0,y1,A.motor.z0,A.motor.z1-.15);}
 G.box(M.line,A.motor.x0,A.motor.x1,y0,y1,A.motor.z0,A.motor.z0+.08);
 const sc=(A.street.z0+A.street.z1)/2;
 for(let x=A.lot.x0-8;x<A.lot.x1+8;x+=4)G.box(M.line,x,x+2,-.301,-.294,sc-.06,sc+.06);
 G.box(M.line,A.lot.x0-8,A.lot.x1+8,-.301,-.294,A.street.z0+.2,A.street.z0+.3);
 // Wheel stops.
 for(const [a,b] of [...A.stalls,[A.accessible.x0,A.accessible.x1]]){const m=(a+b)/2;G.box(M.curb,m-.8,m+.8,-.28,-.17,A.wheelStop-.08,A.wheelStop+.08);}
 // Planting beds with timber edging and mulch.
 for(const b of A.beds){
  const raised=b.z1<=0&&b.z0>=A.plaza.z0,base=raised?-.06:-.3,top=base+(raised?.05:.03);
  G.box(M.mulch,b.x0,b.x1,base-.02,top,b.z0,b.z1);
  for(const [x0,x1,z0,z1] of [[b.x0-.06,b.x1+.06,b.z0-.06,b.z0],[b.x0-.06,b.x1+.06,b.z1,b.z1+.06],[b.x0-.06,b.x0,b.z0,b.z1],[b.x1,b.x1+.06,b.z0,b.z1]])G.box(M.edging,x0,x1,base-.02,top+.06,z0,z1);
 }
 // Motorcycle shelter.
 const ms=A.motor;
 for(const x of [ms.x0+.1,(ms.x0+ms.x1)/2,ms.x1-.1])for(const z of [ms.z0+.15,ms.z1-.15])G.cyl(M.fence,x,z,-.28,2.3,.045,.045,10);
 const shelter=new THREE.BoxGeometry(ms.x1-ms.x0+.4,.06,ms.z1-ms.z0+.6);shelter.rotateX(-.06);const sp=P((ms.x0+ms.x1)/2,(ms.z0+ms.z1)/2,2.07);shelter.translate(sp.x,sp.y,sp.z);G.add(M.shelter,shelter);
 // Pole lamps and bollards.
 for(const [x,z] of A.lamps){G.cyl(M.fence,x,z,-.3,3.6,.06,.045,10);G.box(M.fence,x-.08,x+.42,3.22,3.32,z-.09,z+.09);G.box(M.glow,x-.02,x+.38,3.2,3.22,z-.06,z+.06);}
 for(const [x,z] of [[-1.72,2],[-1.72,5],[-1.72,8],[-1.72,11],[19.85,1.5],[19.85,6],[19.85,10.5],[A.walkway.x0-.18,-11],[A.walkway.x1+.18,-11]]){G.cyl(M.fence,x,z,-.3,.85,.08,.07,12);G.cyl(M.glow,x,z,.42,.08,.072,.072,12);}
 // Fence: posts and rails merged, pickets instanced.
 const fenceRuns=[[A.lot.x0,A.gate[0],A.lot.z0,'x'],[A.gate[1],A.driveway.x0,A.lot.z0,'x'],[A.driveway.x1,A.lot.x1,A.lot.z0,'x'],[A.lot.x0,A.lot.x1,A.lot.z1,'x'],[A.lot.z0,A.lot.z1,A.lot.x0,'z'],[A.lot.z0,A.lot.z1,A.lot.x1,'z']];
 const pickets=[];
 for(const [a0,a1,at,axis] of fenceRuns){
  const len=a1-a0,posts=Math.max(1,Math.round(len/2.4));
  for(let i=0;i<=posts;i++){const a=a0+len*i/posts,[x,z]=axis==='x'?[a,at]:[at,a];G.box(M.fence,x-.04,x+.04,-.3,1.2,z-.04,z+.04);}
  for(const y of [-.12,1.08]){if(axis==='x')G.box(M.fence,a0,a1,y,y+.05,at-.02,at+.02);else G.box(M.fence,at-.02,at+.02,y,y+.05,a0,a1);}
  for(let a=a0+.14;a<a1-.07;a+=.14)pickets.push({p:axis==='x'?P(a,at,.48):P(at,a,.48),s:1});
 }
 G.finish(site,{uv:new Map([[M.lawn,4],[M.asphalt,5],[M.paving,2],[M.mulch,2]])});
 instanced(site,new THREE.BoxGeometry(.022,1.2,.022),M.fence,pickets);
 // Accessible bay: blue field with pictogram, hatched transfer aisle and the entry arrow.
 const ac=A.accessible,acW=ac.x1-ac.x0,acD=sr.z1-sr.z0-.2;
 const bay=flatPlane(acW-.12,acD-.12,new THREE.MeshStandardMaterial({map:signTexture(canvas,'accessible'),roughness:.8}),(ac.x0+ac.x1)/2,sr.z0+.06+acD/2,-.276,0);site.add(bay);
 const hatch=flatPlane(ac.hatch[1]-ac.hatch[0]-.1,acD-.12,new THREE.MeshStandardMaterial({map:signTexture(canvas,'hatch'),alphaTest:.5,roughness:.8}),(ac.hatch[0]+ac.hatch[1])/2,sr.z0+.06+acD/2,-.276,0);site.add(hatch);
 const arrow=flatPlane(2.6,1.3,new THREE.MeshStandardMaterial({map:signTexture(canvas,'masuk'),alphaTest:.5,roughness:.8}),(A.driveway.x0+A.driveway.x1)/2,-13.3,-.276,Math.PI);site.add(arrow);
 // Shrubs and shade trees (instanced, faceted rather than spheres).
 const rand=rng(41),shrubs=[],shrubColors=[],palette=['#5d8264','#6c9170','#53775c','#7b9a6c','#668a6a'];
 for(const b of A.beds){
  const raised=b.z1<=0&&b.z0>=A.plaza.z0,base=raised?-.01:-.27;
  const step=.62,nx=Math.max(1,Math.floor((b.x1-b.x0)/step)),nz=Math.max(1,Math.floor((b.z1-b.z0)/step));
  for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){
   const x=b.x0+(i+.5)*(b.x1-b.x0)/nx+(rand()-.5)*.18,z=b.z0+(j+.5)*(b.z1-b.z0)/nz+(rand()-.5)*.18;
   if(A.trees.some(([tx,tz])=>Math.hypot(tx-x,tz-z)<.75)||A.lamps.some(([lx,lz])=>Math.hypot(lx-x,lz-z)<.45))continue;
   const s=.42+rand()*.28;shrubs.push({p:P(x,z,base),s:new THREE.Vector3(s,s*(.8+rand()*.35),s),ry:rand()*6.28});shrubColors.push(palette[Math.floor(rand()*palette.length)]);
  }
 }
 instanced(site,blobCluster(5,3),M.leaf,shrubs,shrubColors);
 const trunk=new THREE.CylinderGeometry(.08,.14,2.5,8);trunk.translate(0,1.25,0);
 instanced(site,trunk,M.bark,A.trees.map(([x,z,r])=>({p:P(x,z,-.3),s:new THREE.Vector3(r/1.8,1,r/1.8)})));
 const crowns=[],crownColors=[];
 A.trees.forEach(([x,z,r],i)=>{crowns.push({p:P(x,z,1.75),s:new THREE.Vector3(r*1.7,r*1.25,r*1.7),ry:i*1.3});crownColors.push(['#6e8f6a','#7a9a72','#65866a','#73946d'][i%4]);});
 instanced(site,blobCluster(7,11),M.crown,crowns,crownColors);
 // Totem sign at the driveway.
 const T=new Batch();T.box(M.white,18.15,19.25,-.3,2.1,-15.05,-14.75);T.box(M.fascia,18.2,19.2,1.0,2.02,-15.07,-15.04);T.finish(site);
 const totem=new THREE.Mesh(new THREE.PlaneGeometry(.94,.96),new THREE.MeshStandardMaterial({map:signTexture(canvas,'totem'),roughness:.6,emissive:'#ffffff',emissiveIntensity:.12}));
 totem.material.emissiveMap=totem.material.map;totem.rotation.y=Math.PI;totem.position.copy(P(18.7,-15.075,1.51));site.add(totem);

 // ---- Room dressing: door signs, artwork, clocks, potted plants, downlights.
 const signs=[],hallIds=new Set(['hall','innerhall']);
 for(const op of OPENINGS.filter(o=>o.type==='door')){
  const wall=WALLS.find(w=>w.id===op.wall),mid=(op.from+op.to)/2,side=-op.swing;
  const probe=wall.o==='h'?spaceAt(mid,wall.at+side*.3):spaceAt(wall.at+side*.3,mid);
  if(!probe||!hallIds.has(probe.id))continue;
  const room=ROOMS.find(r=>r.id===op.room),along=op.hinge==='from'?op.to+.26:op.from-.26;
  signs.push({room,g:facePlane(wall,along,1.55,side,.3,.15)});
 }
 const signCanvas=canvas(1024,512),cols=4,rows=4;drawDoorSigns(signCanvas,ROOMS,cols,rows);
 const signGeos=signs.map(({room,g})=>{const i=ROOMS.indexOf(room);return atlasUV(g,i%cols,Math.floor(i/cols),cols,rows);});
 if(signGeos.length){const mesh=new THREE.Mesh(mergeGeometries(signGeos,false),new THREE.MeshStandardMaterial({map:texture(signCanvas),roughness:.5}));details.add(mesh);}
 const byId=id=>WALLS.find(w=>w.id===id);
 const art=[['v8a',2.25,1.62,-1,0],['h35',3.0,1.6,1,1],['v8a',1.75,1.58,1,2],['h85',2.0,1.58,-1,3],['h85',12.8,1.58,-1,1],['v8',11.35,1.58,1,0],['v12a',1.9,1.62,1,3],['v6',8.0,1.58,1,2],['h5',3.0,1.6,-1,2]];
 const artCanvas=canvas(1024,640);drawArt(artCanvas);
 const AF=new Batch(),artGeos=[];
 for(const [id,along,y,side,cell] of art){
  const wall=byId(id),body=wallBody(wall),face=body.center+side*body.t/2,fw=.62,fh=.78;
  AF.wall(M.wood,wall,along-fw/2,along+fw/2,y-fh/2,y+fh/2,Math.min(face,face+side*.03),Math.max(face,face+side*.03));
  artGeos.push(atlasUV(facePlane(wall,along,y,side,fw-.08,fh-.08,.032),cell,0,4,1));
 }
 details.add(new THREE.Mesh(mergeGeometries(artGeos,false),new THREE.MeshStandardMaterial({map:texture(artCanvas),roughness:.75})));
 const clocks=[['h35',4.7,2.28,-1],['v16a',1.6,2.05,-1],['h5',13.2,2.15,-1]],clockCanvas=canvas(256,256);drawClock(clockCanvas);
 const clockGeos=[];
 for(const [id,along,y,side] of clocks){
  const wall=byId(id),body=wallBody(wall),face=body.center+side*body.t/2;
  const rim=new THREE.CylinderGeometry(.17,.17,.04,32);
  if(wall.o==='h')rim.rotateX(Math.PI/2);else rim.rotateZ(Math.PI/2);
  const p=wall.o==='h'?P(along,face+side*.02,y):P(face+side*.02,along,y);rim.translate(p.x,p.y,p.z);AF.add(M.frame,rim);
  clockGeos.push(facePlane(wall,along,y,side,.3,.3,.042));
 }
 AF.finish(details);
 const clockFace=new THREE.Mesh(mergeGeometries(clockGeos,false),new THREE.MeshStandardMaterial({map:texture(clockCanvas),alphaTest:.5,roughness:.4}));details.add(clockFace);
 // Potted plants: original spots plus a few for the corridors and consult room.
 const pots=[],leaves=[];
 for(const [x,z,size] of [...plants,[.42,4.25,.72],[17.58,4.3,.7],[7.62,11.55,.62],[11.62,3.12,.62],[6.35,5.45,.6]]){
  pots.push({p:P(x,z,.205*size),s:new THREE.Vector3(.25*size,.41*size,.25*size)});
  for(let i=0;i<9;i++){const a=2*Math.PI*i/9;leaves.push({p:P(x+Math.cos(a)*.22*size,z+Math.sin(a)*.22*size,.79*size),s:new THREE.Vector3(.2*size*.42,.2*size*1.9,.2*size*.6),rx:Math.sin(a)*.24,rz:Math.cos(a)*.24});}
 }
 const potGeo=new THREE.CylinderGeometry(1,1,1,20);
 instanced(details,potGeo,M.pot,pots);instanced(details,new THREE.SphereGeometry(1,9,7),M.plantLeaf,leaves);
 // Ceilings and downlights appear with the Eye Level ceiling panels.
 const O=new Batch();
 const ceiling=mat('#f3f1ea',.9,0,{emissive:'#bdb8ad',emissiveIntensity:.45});
 for(const s of SPACES)O.box(ceiling,s.x+.06,s.x+s.w-.06,2.785,2.8,s.z+.06,s.z+s.d-.06);
 const lights=[];for(let x=1.5;x<17;x+=2.5)lights.push([x,4.25]);for(const z of [6.2,8,10,11.4])lights.push([7,z]);
 for(const r of ROOMS)lights.push([r.x+.55,r.z+.55],[r.x+r.w-.55,r.z+r.d-.55]);
 for(const [x,z] of lights)O.cyl(M.glow,x,z,2.77,.015,.075,.075,14);
 O.finish(overhead,{shadow:false});
 return {full,cut,roof,site,details,overhead,segments};
}

function ramp(batch,material,x0,x1,z0,z1,yLow,yHigh){
 const len=z1-z0,rise=yHigh-yLow,angle=Math.atan2(rise,len),g=new THREE.BoxGeometry(x1-x0,.12,Math.hypot(len,rise));
 g.rotateX(z1>z0?-angle:angle);const p=P((x0+x1)/2,(z0+z1)/2,(yLow+yHigh)/2-.06*Math.cos(angle));g.translate(p.x,p.y,p.z);batch.add(material,g);
}
function flatPlane(w,d,material,x,z,y,rot){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),material);m.rotation.set(-Math.PI/2,0,rot);m.position.copy(P(x,z,y));m.receiveShadow=true;return m;}

function surfaceTexture(canvas,kind){
 const c=canvas(512,512),x=c.getContext('2d'),rand=rng(kind.length*97);
 const base={lawn:'#b9cbb0',asphalt:'#6d716f',paving:'#e3ddd2',mulch:'#7a5b45'}[kind];
 x.fillStyle=base;x.fillRect(0,0,512,512);
 if(kind==='paving'){
  for(let r=0;r<8;r++)for(let k=-1;k<5;k++){const ox=k*128+(r%2)*64;x.fillStyle=['#e6e0d5','#dfd8cc','#e9e4da','#ddd6c9'][(r*3+k+8)%4];x.fillRect(ox+2,r*64+2,124,60);}
 }else{
  const n=kind==='lawn'?9000:kind==='asphalt'?14000:6000;
  for(let i=0;i<n;i++){const v=rand();x.fillStyle=kind==='lawn'?(v<.5?'#adc2a4':'#c4d4bb'):kind==='asphalt'?(v<.5?'#5f6361':'#7c807e'):(v<.5?'#6a4c39':'#8f6c52');const s=kind==='mulch'?2+rand()*4:1+rand()*2;x.fillRect(rand()*512,rand()*512,s,s);}
 }
 return texture(c,true);
}
function signTexture(canvas,kind){
 if(kind==='fascia'){
  const c=canvas(1536,128),x=c.getContext('2d');x.fillStyle='#183b32';x.fillRect(0,0,1536,128);
  x.fillStyle='#f5f2ea';x.textAlign='center';x.textBaseline='middle';x.font='italic 600 84px Georgia, serif';x.fillText('elora',640,66);
  x.font='600 30px Segoe UI, sans-serif';x.fillStyle='#b9d3c4';x.fillText('S M I L E   C L I N I C',1010,68);
  x.fillStyle='#8fb6a3';x.fillRect(470,60,3,10);return texture(c);
 }
 if(kind==='totem'){
  const c=canvas(512,512),x=c.getContext('2d');x.fillStyle='#183b32';x.fillRect(0,0,512,512);
  x.fillStyle='#f5f2ea';x.textAlign='center';x.font='italic 600 120px Georgia, serif';x.fillText('elora',256,190);
  x.font='600 30px Segoe UI, sans-serif';x.fillStyle='#b9d3c4';x.fillText('SMILE CLINIC',256,250);
  x.fillStyle='#2e5a4b';x.fillRect(40,320,432,2);x.fillStyle='#f5f2ea';x.font='700 44px Segoe UI, sans-serif';x.fillText('P  Parkir pasien',256,410);
  return texture(c);
 }
 if(kind==='accessible'){
  const c=canvas(256,512),x=c.getContext('2d');x.fillStyle='#2f62a8';x.fillRect(0,0,256,512);
  x.strokeStyle='#ffffff';x.lineWidth=8;x.strokeRect(10,10,236,492);
  // Wheelchair pictogram (ISO 7001 style, simplified).
  x.save();x.translate(128,256);x.rotate(Math.PI);x.fillStyle='#ffffff';x.strokeStyle='#ffffff';x.lineCap='round';x.lineJoin='round';
  x.beginPath();x.arc(-6,-74,15,0,Math.PI*2);x.fill();
  x.lineWidth=17;x.beginPath();x.moveTo(-10,-48);x.lineTo(-2,8);x.lineTo(44,8);x.lineTo(60,56);x.stroke();
  x.lineWidth=13;x.beginPath();x.moveTo(-6,-22);x.lineTo(34,-22);x.stroke();
  x.lineWidth=11;x.beginPath();x.arc(-8,34,46,-.35*Math.PI,1.45*Math.PI*.98);x.stroke();
  x.restore();return texture(c);
 }
 if(kind==='hatch'){
  const c=canvas(128,512),x=c.getContext('2d');x.clearRect(0,0,128,512);x.strokeStyle='#f4f3ee';x.lineWidth=12;
  x.strokeRect(6,6,116,500);for(let y=-128;y<640;y+=48){x.beginPath();x.moveTo(0,y);x.lineTo(128,y+128);x.stroke();}
  return texture(c);
 }
 const c=canvas(512,256),x=c.getContext('2d');x.clearRect(0,0,512,256);x.fillStyle='#f4f3ee';
 x.textAlign='center';x.textBaseline='middle';x.font='800 92px Segoe UI, sans-serif';x.fillText('MASUK',256,196);
 x.beginPath();x.moveTo(256,8);x.lineTo(318,72);x.lineTo(280,72);x.lineTo(280,128);x.lineTo(232,128);x.lineTo(232,72);x.lineTo(194,72);x.closePath();x.fill();
 return texture(c);
}
function drawDoorSigns(c,rooms,cols,rows){
 const x=c.getContext('2d'),cw=c.width/cols,ch=c.height/rows;
 rooms.forEach((r,i)=>{
  const ox=(i%cols)*cw,oy=Math.floor(i/cols)*ch;
  x.fillStyle='#fbfaf6';x.fillRect(ox,oy,cw,ch);x.fillStyle='#183b32';x.fillRect(ox,oy,62,ch);
  x.fillStyle='#f5f2ea';x.textAlign='center';x.textBaseline='middle';x.font='700 34px Segoe UI, sans-serif';x.fillText(r.number,ox+31,oy+ch/2);
  x.fillStyle='#1d3b31';x.textAlign='left';
  const words=r.name.split(' '),lines=[];let line='';
  for(const w of words){if((line+' '+w).trim().length>13&&line){lines.push(line);line=w;}else line=(line+' '+w).trim();}
  lines.push(line);
  x.font=`600 ${lines.length>2?22:25}px Segoe UI, sans-serif`;
  lines.slice(0,3).forEach((l,k)=>x.fillText(l,ox+76,oy+ch/2+(k-(Math.min(lines.length,3)-1)/2)*27));
  x.fillStyle='#77998a';x.fillRect(ox+76,oy+ch-14,40,4);
 });
}
function drawArt(c){
 const x=c.getContext('2d'),cw=c.width/4,h=c.height;
 const pal=[['#f1ebe0','#77998a','#c9a985','#2e5244'],['#eef2ec','#bfa486','#5f8466','#e4d6c2'],['#f6f1e8','#2e5244','#d9c3a5','#9cb8a8'],['#e9efe9','#c58f6b','#77998a','#f6efe3']];
 pal.forEach((p,i)=>{
  const ox=i*cw;x.fillStyle=p[0];x.fillRect(ox,0,cw,h);
  if(i===0){x.fillStyle=p[1];x.beginPath();x.arc(ox+cw/2,h*.62,cw*.34,Math.PI,0);x.fill();x.fillStyle=p[2];x.beginPath();x.arc(ox+cw*.62,h*.32,cw*.13,0,Math.PI*2);x.fill();x.fillStyle=p[3];x.fillRect(ox+cw*.16,h*.62,cw*.68,6);}
  if(i===1){for(let k=0;k<5;k++){x.fillStyle=k%2?p[1]:p[2];x.fillRect(ox+cw*.2,h*(.18+k*.13),cw*.6*(1-k*.12),h*.08);}x.fillStyle=p[3];x.beginPath();x.arc(ox+cw*.7,h*.8,cw*.1,0,Math.PI*2);x.fill();}
  if(i===2){x.strokeStyle=p[1];x.lineWidth=10;for(let k=0;k<4;k++){x.beginPath();x.arc(ox+cw*.5,h*.9,cw*(.18+k*.1),Math.PI*1.05,Math.PI*1.95);x.stroke();}x.fillStyle=p[2];x.fillRect(ox+cw*.14,h*.12,cw*.2,cw*.2);x.fillStyle=p[3];x.fillRect(ox+cw*.62,h*.18,cw*.22,h*.2);}
  if(i===3){x.fillStyle=p[2];x.beginPath();x.ellipse(ox+cw*.45,h*.5,cw*.18,h*.3,.4,0,Math.PI*2);x.fill();x.fillStyle=p[1];x.beginPath();x.ellipse(ox+cw*.58,h*.46,cw*.1,h*.22,-.3,0,Math.PI*2);x.fill();x.strokeStyle='#2e5244';x.lineWidth=5;x.beginPath();x.moveTo(ox+cw*.45,h*.85);x.lineTo(ox+cw*.5,h*.25);x.stroke();}
 });
}
function drawClock(c){
 const x=c.getContext('2d');x.clearRect(0,0,256,256);x.fillStyle='#fbfaf6';x.beginPath();x.arc(128,128,124,0,Math.PI*2);x.fill();
 x.fillStyle='#2a302d';for(let i=0;i<12;i++){x.save();x.translate(128,128);x.rotate(i*Math.PI/6);x.fillRect(-3,-112,6,i%3?14:24);x.restore();}
 x.strokeStyle='#2a302d';x.lineCap='round';
 const hand=(a,l,w)=>{x.lineWidth=w;x.beginPath();x.moveTo(128,128);x.lineTo(128+Math.sin(a)*l,128-Math.cos(a)*l);x.stroke();};
 hand(Math.PI*2*(10.15/12),58,9);hand(Math.PI*2*(9/60),88,6);x.strokeStyle='#c4704f';hand(Math.PI*2*(38/60),94,2.5);
 x.fillStyle='#2a302d';x.beginPath();x.arc(128,128,8,0,Math.PI*2);x.fill();
}
