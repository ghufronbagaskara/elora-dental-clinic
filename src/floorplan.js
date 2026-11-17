import {BUILDING,SPACES,ROOMS,ZONES,WALLS,OPENINGS,SITE,openingsOn,wallBody,dimensionBreaks,netSize,fmt} from './clinic-data.js';

// Architectural floor plan drawn as SVG from the same records as the 3D model.
// 1 SVG unit = 1 cm. The sheet is rotated 180° so the facade and parking sit at the bottom.
const U=100,{width:W,depth:D}=BUILDING;
const X=x=>+((W-x)*U).toFixed(1),Y=z=>+((D-z)*U).toFixed(1);
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
function box(x0,x1,z0,z1){const a=X(x0),b=X(x1),c=Y(z0),d=Y(z1);return {x:Math.min(a,b),y:Math.min(c,d),w:Math.abs(b-a),h:Math.abs(d-c)};}
const rect=(x0,x1,z0,z1,attrs='')=>{const r=box(x0,x1,z0,z1);return `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" ${attrs}/>`;};
const line=(x1,y1,x2,y2,cls)=>`<line x1="${+x1.toFixed(1)}" y1="${+y1.toFixed(1)}" x2="${+x2.toFixed(1)}" y2="${+y2.toFixed(1)}" class="${cls}"/>`;
// Wall-local helpers: a = along the wall, p = perpendicular coordinate (site metres).
const wpt=(wall,a,p)=>wall.o==='h'?[X(a),Y(p)]:[X(p),Y(a)];
const wrect=(wall,a0,a1,p0,p1,attrs)=>wall.o==='h'?rect(a0,a1,p0,p1,attrs):rect(p0,p1,a0,a1,attrs);

const CROP={x0:-6.4,x1:24.4,z0:-17.6};
export const PLAN_LAYOUTS={
 wide:{viewBox:[-700,-380,4010,3380],north:[2580,-330],legend:[2580,260],title:[2580,2330]},
 tall:{viewBox:[-700,-380,3220,4140],north:[1420,3090],legend:[-640,3090],title:[560,3090]}
};

function wrapName(name,fs,maxW){
 const est=s=>s.length*fs*.56;
 if(est(name)<=maxW)return [name];
 const words=name.split(' '),lines=[];let cur='';
 for(const w of words){const next=cur?cur+' '+w:w;if(est(next)>maxW&&cur){lines.push(cur);cur=w;}else cur=next;}
 lines.push(cur);return lines;
}

function siteLayer(){
 const S=SITE,o=[];
 const crop=box(CROP.x0,CROP.x1,CROP.z0,0);
 o.push(`<clipPath id="siteClip"><rect x="${crop.x}" y="${Y(D+1.4)}" width="${crop.w}" height="${Y(CROP.z0)-Y(D+1.4)}"/></clipPath><g clip-path="url(#siteClip)">`);
 o.push(rect(CROP.x0,CROP.x1,CROP.z0,D+1.4,'class="lawn"'));
 o.push(rect(CROP.x0-1,CROP.x1+1,S.street.z0,S.street.z1,'class="road"'));
 o.push(rect(CROP.x0-1,CROP.x1+1,S.sidewalk.z0,S.sidewalk.z1,'class="pave"'));
 for(const r of [S.aisle,S.driveway])o.push(rect(r.x0,r.x1,r.z0,r.z1,'class="asphalt"'));
 o.push(rect(-.4,S.stalls.at(-1)[1],S.stallRow.z0,S.stallRow.z1,'class="asphalt"'));
 o.push(rect(S.motor.x0-.3,S.motor.x1,S.motor.z0,S.motor.z1,'class="asphalt"'));
 o.push(rect(S.plaza.x0,S.plaza.x1,S.plaza.z0,0,'class="pave"'));
 o.push(rect(-.33,W+.33,D+.33,D+1.2,'class="pave"'));
 o.push(rect(W+.33,19.6,-.33,D+.33,'class="gravel"'));
 o.push(rect(S.walkway.x0,S.walkway.x1,S.walkway.z0,S.walkway.z1,'class="pave"'));
 for(const b of S.beds)o.push(rect(b.x0,b.x1,b.z0,b.z1,'class="bed"'));
 // Shrub dots inside the beds.
 for(const b of S.beds.filter(b=>b.z1<-5)){const nx=Math.max(1,Math.floor((b.x1-b.x0)/.7)),nz=Math.max(1,Math.floor((b.z1-b.z0)/.7));for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){const x=b.x0+(i+.5)*(b.x1-b.x0)/nx,z=b.z0+(j+.5)*(b.z1-b.z0)/nz;o.push(`<circle cx="${X(x)}" cy="${Y(z)}" r="${20+((i*7+j*3)%3)*4}" class="shrub"/>`);}}
 // Stall markings.
 const sr=S.stallRow,ac=S.accessible;
 o.push(rect(ac.x0,ac.x1,sr.z0,sr.z1,'class="ada"'));
 const hb=box(ac.hatch[0],ac.hatch[1],sr.z0,sr.z1);
 o.push(`<clipPath id="hatchClip"><rect x="${hb.x}" y="${hb.y}" width="${hb.w}" height="${hb.h}"/></clipPath><g clip-path="url(#hatchClip)">`);
 for(let k=-hb.h;k<hb.w+hb.h;k+=45)o.push(line(hb.x+k,hb.y,hb.x+k-hb.h,hb.y+hb.h,'mark-thin'));
 o.push('</g>');
 const ax=X((ac.x0+ac.x1)/2),ay=Y((sr.z0+sr.z1)/2);
 o.push(`<g transform="translate(${ax} ${ay}) scale(1.6)" class="ada-icon"><circle cx="-4" cy="-44" r="9"/><path d="M-6-30 L-1 4 L26 4 L36 32 M-3-14 L20-14" fill="none" stroke-width="9"/><path d="M-22 -10 A30 30 0 1 0 14 30" fill="none" stroke-width="7"/></g>`);
 for(const x of new Set([S.stalls[0][0],...S.stalls.flat(),ac.x0,...ac.hatch]))o.push(line(X(x),Y(sr.z0),X(x),Y(sr.z1-.2),'mark'));
 o.push(line(X(S.stalls[0][0]),Y(sr.z0+.05),X(ac.hatch[1]),Y(sr.z0+.05),'mark'),line(X(S.stalls[1][0]),Y(sr.z0+.05),X(S.stalls.at(-1)[1]),Y(sr.z0+.05),'mark'));
 for(const [a,b] of [...S.stalls,[ac.x0,ac.x1]]){const m=(a+b)/2;o.push(rect(m-.8,m+.8,S.wheelStop-.08,S.wheelStop+.08,'class="stop"'));}
 const zr=S.zebra;for(let z=zr.z0+.35;z<zr.z1-.3;z+=1)o.push(rect(zr.x0+.1,zr.x1-.1,z,z+.5,'class="zebra"'));
 const mw=(S.motor.x1-S.motor.x0)/S.motor.count;for(let i=0;i<=S.motor.count;i++){const x=S.motor.x0+i*mw;o.push(line(X(x),Y(S.motor.z0),X(x),Y(S.motor.z1-.15),'mark'));}
 o.push(rect(S.motor.x0-.1,S.motor.x1+.1,S.motor.z0-.1,S.motor.z1+.2,'class="overhead"'));
 // Fence with the pedestrian gate and driveway gaps.
 const fz=Y(S.lot.z0);
 for(const [a,b] of [[CROP.x0-1,S.gate[0]],[S.gate[1],S.driveway.x0],[S.driveway.x1,CROP.x1+1]])o.push(line(X(a),fz,X(b),fz,'fence'));
 for(const [x,z,r] of S.trees)o.push(`<circle cx="${X(x)}" cy="${Y(z)}" r="${r*85}" class="tree"/><circle cx="${X(x)}" cy="${Y(z)}" r="9" class="trunk"/>`);
 for(const [x,z] of S.lamps)o.push(`<circle cx="${X(x)}" cy="${Y(z)}" r="13" class="lamp"/>`);
 // Canopy outline (overhead) and site labels.
 const L=S.landing;o.push(rect(L.x0,L.x1,L.z0,-.14,'class="overhead"'));
 const lbl=(x,z,text,cls='site-label')=>`<text x="${X(x)}" y="${Y(z)}" class="${cls}">${esc(text)}</text>`;
 o.push(lbl(12.8,-12.4,'PARKIR MOBIL'),lbl(-3.1,-11.35,'MOTOR'),lbl(2.5,-7.4,'JALUR SIRKULASI'),lbl(2.5,-2.9,'PLAZA / TERAS'),lbl(10.5,-17.1,'JALAN','site-label road-label'));
 const mx=X((S.driveway.x0+S.driveway.x1)/2),my=Y(-13.2);
 o.push(`<g class="entry-mark"><path d="M${mx} ${my-210} l58 80 h-34 v110 h-48 v-110 h-34 z"/><text x="${mx}" y="${my+60}">MASUK</text></g>`);
 const ex=X(7),ey=Y(-3.3);
 o.push(`<g class="entry-mark small"><path d="M${ex} ${ey-120} l40 56 h-24 v64 h-32 v-64 h-24 z"/><text x="${ex}" y="${ey+52}">PINTU UTAMA</text></g>`);
 o.push('</g>');
 return o.join('');
}

function wallsLayer(){
 const o=[],sym=[];
 for(const wall of WALLS){
  const body=wallBody(wall),p0=body.center-body.t/2,p1=body.center+body.t/2,ops=openingsOn(wall.id);
  let a=body.from;
  for(const op of ops){if(op.from>a)o.push(wrect(wall,a,op.from,p0,p1,'class="poche"'));a=op.to;}
  if(body.to>a)o.push(wrect(wall,a,body.to,p0,p1,'class="poche"'));
  for(const op of ops){
   if(op.type==='window'){
    sym.push(wrect(wall,op.from,op.to,p0,p1,'class="win-fill"'));
    for(const p of [p0,p1]){const [x1,y1]=wpt(wall,op.from,p),[x2,y2]=wpt(wall,op.to,p);sym.push(line(x1,y1,x2,y2,'win-edge'));}
    for(const d of [-.025,.025]){const [x1,y1]=wpt(wall,op.from,body.center+d),[x2,y2]=wpt(wall,op.to,body.center+d);sym.push(line(x1,y1,x2,y2,'glass'));}
    for(const a of [op.from,op.to]){const [x1,y1]=wpt(wall,a,p0),[x2,y2]=wpt(wall,a,p1);sym.push(line(x1,y1,x2,y2,'win-edge'));}
    continue;
   }
   if(op.type==='open'){
    if(op.head)for(const p of [p0,p1]){const [x1,y1]=wpt(wall,op.from,p),[x2,y2]=wpt(wall,op.to,p);sym.push(line(x1,y1,x2,y2,'head'));}
    continue;
   }
   const face=body.center+op.swing*body.t/2;
   const leaves=op.type==='entry'?[[op.from,op.to,(op.to-op.from)/2],[op.to,op.from,(op.to-op.from)/2]]:[op.hinge==='from'?[op.from,op.to,op.to-op.from-.05]:[op.to,op.from,op.to-op.from-.05]];
   for(const [hinge,latch,len] of leaves){
    const dir=Math.sign(latch-hinge);
    const H=wpt(wall,hinge,face),A=wpt(wall,hinge,face+op.swing*len),B=wpt(wall,hinge+dir*len,face);
    const cross=(A[0]-H[0])*(B[1]-H[1])-(A[1]-H[1])*(B[0]-H[0]);
    sym.push(`<path d="M${A[0]} ${A[1]} A${len*U} ${len*U} 0 0 ${cross>0?1:0} ${B[0]} ${B[1]}" class="swing"/>`);
    sym.push(line(H[0],H[1],A[0],A[1],op.type==='entry'?'leaf glass-leaf':'leaf'));
   }
   const [x1,y1]=wpt(wall,op.from,body.center),[x2,y2]=wpt(wall,op.to,body.center);
   sym.push(line(x1,y1,x2,y2,'sill'));
  }
 }
 return o.join('')+sym.join('');
}

// Exterior dimension chains: room segments plus the overall length, both in metres.
function dimensionLayer(){
 const o=[],e=BUILDING.extWall-BUILDING.intWall/2,gap=30,t1=110,t2=200;
 const sides={
  back:{breaks:dimensionBreaks('back'),face:D+e,along:'x'},
  front:{breaks:dimensionBreaks('front'),face:-e,along:'x'},
  left:{breaks:dimensionBreaks('left'),face:-e,along:'z'},
  right:{breaks:dimensionBreaks('right'),face:W+e,along:'z'}
 };
 for(const [name,s] of Object.entries(sides)){
  const outward=name==='back'||name==='right'?1:-1;
  // In sheet units the outward direction for each side.
  const faceS=s.along==='x'?Y(s.face):X(s.face);
  const sheetDir=s.along==='x'?(outward>0?-1:1):(outward>0?-1:1);
  const d1=faceS+sheetDir*t1,d2=faceS+sheetDir*t2,start=faceS+sheetDir*gap;
  const P=(a,off)=>s.along==='x'?[X(a),off]:[off,Y(a)];
  const total=s.breaks.at(-1)-s.breaks[0];
  o.push(`<g class="dim" data-dim="${name}" data-total="${total.toFixed(2)}">`);
  for(const [tier,pts,dl] of [[1,s.breaks,d1],[2,[s.breaks[0],s.breaks.at(-1)],d2]]){
   const a=P(pts[0],dl),b=P(pts.at(-1),dl);o.push(line(a[0],a[1],b[0],b[1],'dim-line'));
   for(const v of pts){
    const [ex1,ey1]=P(v,start),[ex2,ey2]=P(v,dl+sheetDir*28);o.push(line(ex1,ey1,ex2,ey2,'ext-line'));
    const [tx,ty]=P(v,dl);o.push(line(tx-16,ty+16,tx+16,ty-16,'tick'));
   }
   for(let i=0;i<pts.length-1;i++){
    const len=pts[i+1]-pts[i],[mx,my]=P((pts[i]+pts[i+1])/2,dl);
    const label=fmt(len),cls=tier===2?'dim-text total':'dim-text';
    if(s.along==='x')o.push(`<text x="${mx}" y="${my-14}" class="${cls}" data-len="${len.toFixed(2)}">${label}</text>`);
    else o.push(`<text x="${mx-14}" y="${my}" class="${cls}" data-len="${len.toFixed(2)}" transform="rotate(-90 ${mx-14} ${my})">${label}</text>`);
   }
  }
  o.push('</g>');
 }
 return o.join('');
}

function roomsLayer(active){
 const fills=[],labels=[];
 for(const s of SPACES){
  const r=box(s.x,s.x+s.w,s.z,s.z+s.d),hall=s.id.includes('hall'),cx=r.x+r.w/2,cy=r.y+r.h/2;
  const zone=ZONES[s.zone];
  if(hall){
   fills.push(`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${zone.fill}" class="hall" data-zone="${s.zone}"/>`);
   const vertical=r.h>r.w;
   labels.push(`<text x="${cx}" y="${cy+10}" class="hall-label"${vertical?` transform="rotate(-90 ${cx} ${cy+10})"`:''}>${esc(s.name)}</text>`);
   continue;
  }
  const [nw,nd]=netSize(s),cls=s.id===active?'room is-active':'room';
  fills.push(`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${zone.fill}" class="${cls}" data-room="${s.id}" data-zone="${s.zone}" data-x="${s.x}" data-z="${s.z}" data-w="${s.w}" data-d="${s.d}"><title>${esc(s.number+' · '+s.name)}</title></rect>`);
  const maxW=r.w*.84,dims=`${fmt(nw)} × ${fmt(nd)} m`,area=`${fmt(nw*nd)} m²`;
  let fs=52,sub=34;const subW=dims.length*sub*.56;if(subW>maxW){const k=maxW/subW;sub=Math.max(24,sub*k);fs=Math.max(38,fs*Math.max(k,.8));}
  const name=wrapName(s.name,fs,maxW),lh=fs*1.15,blockH=78+name.length*lh+sub*2.6;
  let y=cy-blockH/2;
  labels.push(`<g class="room-text" data-for="${s.id}"><circle cx="${cx}" cy="${y+30}" r="30" class="badge"/><text x="${cx}" y="${y+41}" class="badge-text">${s.number}</text>`);
  y+=78;
  name.forEach((n,i)=>labels.push(`<text x="${cx}" y="${y+fs*.85+i*lh}" class="room-name" style="font-size:${fs.toFixed(1)}px">${esc(n)}</text>`));
  y+=name.length*lh+6;
  labels.push(`<text x="${cx}" y="${y+sub}" class="room-dim" style="font-size:${sub.toFixed(1)}px">${dims}</text><text x="${cx}" y="${y+sub*2.25}" class="room-area" style="font-size:${sub.toFixed(1)}px">${area}</text></g>`);
 }
 return {fills:fills.join(''),labels:labels.join('')};
}

function northBlock([ox,oy]){
 const s=[];
 s.push(`<g transform="translate(${ox} ${oy}) scale(1.15)" class="block">`);
 s.push(`<circle cx="90" cy="110" r="78" class="north-ring"/><path d="M90 30 L124 150 L90 128 L56 150 Z" class="north-arrow"/><path d="M90 30 L90 128 L56 150 Z" class="north-half"/><text x="90" y="22" class="north-text">U</text>`);
 // Graphic scale 0–5 m.
 const sx=240,sy=150;
 for(let i=0;i<5;i++)s.push(`<rect x="${sx+i*U}" y="${sy-18}" width="${U}" height="18" class="${i%2?'scale-b':'scale-a'}"/>`);
 s.push(`<rect x="${sx}" y="${sy-18}" width="${5*U}" height="18" class="scale-frame"/>`);
 for(let i=0;i<=5;i++)s.push(`<text x="${sx+i*U}" y="${sy+36}" class="scale-text">${i}</text>`);
 s.push(`<text x="${sx+5*U+18}" y="${sy-2}" class="scale-text" text-anchor="start">m</text><text x="${sx}" y="${sy-46}" class="block-head" text-anchor="start">SKALA GRAFIS</text>`);
 s.push('</g>');return s.join('');
}
function legendBlock([ox,oy]){
 const s=[`<g transform="translate(${ox} ${oy}) scale(1.2)" class="block"><text x="0" y="0" class="block-head" text-anchor="start">ZONA</text>`];
 Object.values(ZONES).forEach((z,i)=>{const y=34+i*66;s.push(`<rect x="0" y="${y}" width="74" height="48" fill="${z.fill}" class="swatch"/><text x="100" y="${y+37}" class="legend-text">${z.label}</text>`);});
 const y0=34+4*66+50;
 s.push(`<text x="0" y="${y0}" class="block-head" text-anchor="start">SIMBOL</text>`);
 s.push(`<rect x="0" y="${y0+30}" width="74" height="20" class="poche"/><text x="100" y="${y0+48}" class="legend-text">Dinding</text>`);
 s.push(`<rect x="0" y="${y0+82}" width="74" height="20" class="win-fill"/><line x1="0" y1="${y0+82}" x2="74" y2="${y0+82}" class="win-edge"/><line x1="0" y1="${y0+102}" x2="74" y2="${y0+102}" class="win-edge"/><line x1="0" y1="${y0+89}" x2="74" y2="${y0+89}" class="glass"/><line x1="0" y1="${y0+95}" x2="74" y2="${y0+95}" class="glass"/><text x="100" y="${y0+100}" class="legend-text">Jendela kaca</text>`);
 s.push(`<path d="M6 ${y0+196} L6 ${y0+132}" class="leaf"/><path d="M6 ${y0+132} A64 64 0 0 1 70 ${y0+196}" class="swing"/><text x="100" y="${y0+176}" class="legend-text">Pintu &amp; arah bukaan</text>`);
 s.push(`<rect x="0" y="${y0+222}" width="74" height="40" class="overhead"/><text x="100" y="${y0+250}" class="legend-text">Kanopi / atap di atas</text>`);
 s.push('</g>');return s.join('');
}
function titleBlock([ox,oy]){
 const area=ROOMS.reduce((sum,r)=>{const [a,b]=netSize(r);return sum+a*b;},0);
 return `<g transform="translate(${ox} ${oy})" class="block"><rect x="0" y="0" width="680" height="600" class="title-frame"/>
 <text x="40" y="96" class="title-brand">elora <tspan font-style="italic" font-weight="400">smile clinic</tspan></text>
 <line x1="40" y1="130" x2="640" y2="130" class="title-rule"/>
 <text x="40" y="200" class="title-main">Denah Lantai</text>
 <text x="40" y="250" class="title-sub">Lantai dasar · ${ROOMS.length} ruang + 2 koridor</text>
 <text x="40" y="312" class="title-meta">Bangunan ${fmt(W)} × ${fmt(D)} m (as dinding)</text>
 <text x="40" y="356" class="title-meta">Luas bangunan ${BUILDING.grossArea} m²</text>
 <text x="40" y="400" class="title-meta">Luas bersih ruang ${fmt(area,1)} m²</text>
 <text x="40" y="444" class="title-meta">Ukuran dalam meter · skala grafis</text>
 <line x1="40" y1="478" x2="640" y2="478" class="title-rule"/>
 <text x="40" y="530" class="title-note">Ukuran konseptual, bukan gambar konstruksi.</text>
 <text x="40" y="572" class="title-note">Lembar A-01 · Studi arsitektur 2026</text></g>`;
}

const STYLE=`
svg{font-family:"Segoe UI",Inter,system-ui,-apple-system,sans-serif;background:#fbfcfa}
.paper{fill:#fbfcfa}.lawn{fill:#e9f0e5}.road{fill:#c3c9c4}.pave{fill:#efebe3}.asphalt{fill:#cdd3cf}.gravel{fill:#dedbd3}
.bed{fill:#d5e2cc;stroke:#a9bf9d;stroke-width:3}.shrub{fill:#bcd2b1;stroke:#93ae88;stroke-width:2}
.ada{fill:#2f62a8}.ada-icon{fill:#fff;stroke:#fff;stroke-linecap:round;stroke-linejoin:round}
.mark{stroke:#fff;stroke-width:9}.mark-thin{stroke:#fff;stroke-width:6}.zebra{fill:#fff}.stop{fill:#a9b0ab}
.fence{stroke:#5e6a64;stroke-width:6;stroke-dasharray:40 12 6 12}
.tree{fill:#c8dabf;fill-opacity:.55;stroke:#7f9c80;stroke-width:3;stroke-dasharray:14 9}.trunk{fill:#7f6a57}.lamp{fill:#fff6dc;stroke:#5e6a64;stroke-width:4}
.overhead{fill:none;stroke:#5e6a64;stroke-width:3;stroke-dasharray:22 12}
.site-label{font-size:44px;font-weight:700;letter-spacing:4px;fill:#4c5f56;text-anchor:middle}.road-label{fill:#38463f}
.entry-mark path{fill:#183b32}.entry-mark text{font-size:56px;font-weight:800;letter-spacing:5px;fill:#183b32;text-anchor:middle}.entry-mark.small text{font-size:36px;letter-spacing:3px}
.room{cursor:pointer;transition:fill .18s}.room:hover,.room.is-hover{fill:#cfe3d4}.room.is-active{fill:#f6ddb9}
.hall{pointer-events:none}.hall-label{font-size:38px;font-style:italic;fill:#55675e;text-anchor:middle}
.poche{fill:#26332e}.win-fill{fill:#fbfcfa}.win-edge{stroke:#26332e;stroke-width:2.5}.glass{stroke:#3f7f86;stroke-width:3}
.leaf{stroke:#26332e;stroke-width:6;stroke-linecap:round;fill:none}.glass-leaf{stroke:#3f7f86}.swing{fill:none;stroke:#26332e;stroke-width:2;stroke-dasharray:10 7}
.sill{stroke:#8b958f;stroke-width:2}.head{stroke:#26332e;stroke-width:2;stroke-dasharray:14 8}
.room-text{pointer-events:none}.badge{fill:#183b32}.badge-text{font-size:30px;font-weight:700;fill:#fff;text-anchor:middle}
.room-name,.room-dim,.room-area{paint-order:stroke;stroke:#ffffffb0;stroke-width:6px;stroke-linejoin:round}.room-name{font-weight:650;letter-spacing:.2px;fill:#173a2f;text-anchor:middle}.room-dim{font-weight:600;fill:#344a41;text-anchor:middle}.room-area{fill:#4d6158;text-anchor:middle}
.dim-line,.ext-line{stroke:#3a4741;stroke-width:2}.tick{stroke:#1f2b26;stroke-width:4}
.dim-text{font-size:40px;fill:#24312c;text-anchor:middle;paint-order:stroke;stroke:#fbfcfa;stroke-width:10px;stroke-linejoin:round}.dim-text.total{font-weight:700}
.block-head{font-size:32px;font-weight:800;letter-spacing:4px;fill:#4c6157}.legend-text{font-size:38px;fill:#24312c}.swatch{stroke:#9fb0a6;stroke-width:2}
.north-ring{fill:none;stroke:#3a4741;stroke-width:3}.north-arrow{fill:#fbfcfa;stroke:#183b32;stroke-width:4;stroke-linejoin:round}.north-half{fill:#183b32}.north-text{font-size:34px;font-weight:800;fill:#183b32;text-anchor:middle}
.scale-a{fill:#183b32}.scale-b{fill:#fbfcfa}.scale-frame{fill:none;stroke:#183b32;stroke-width:3}.scale-text{font-size:32px;fill:#24312c;text-anchor:middle}
.title-frame{fill:#fff;stroke:#183b32;stroke-width:4}.title-brand{font-family:Georgia,serif;font-size:66px;font-weight:600;fill:#183b32}
.title-rule{stroke:#cfd9d2;stroke-width:3}.title-main{font-family:Georgia,serif;font-size:58px;fill:#173a2f}.title-sub{font-size:32px;font-weight:600;fill:#4c6157;letter-spacing:1px}
.title-meta{font-size:31px;fill:#24312c}.title-note{font-size:28px;fill:#4f6158}
`;

const prefix=markup=>markup.replace(/class="([^"]+)"/g,(m,c)=>`class="${c.split(' ').map(k=>'fp-'+k).join(' ')}"`);
const SCOPED_STYLE=STYLE.replace(/\.([a-z][\w-]*)/g,'.fp-$1');

export function buildPlanSVG({layout='wide',active=null,width='100%',height='100%'}={}){
 const L=PLAN_LAYOUTS[layout]??PLAN_LAYOUTS.wide,[vx,vy,vw,vh]=L.viewBox;
 const rooms=roomsLayer(active);
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${vw} ${vh}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Denah lantai Elora Smile Clinic" data-layout="${layout}"><style>${SCOPED_STYLE}</style>
${prefix(`<rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" class="paper"/>
${siteLayer()}
<g class="rooms">${rooms.fills}</g>
<g class="walls" pointer-events="none">${wallsLayer()}</g>
<g pointer-events="none">${rooms.labels}${dimensionLayer()}</g>
${northBlock(L.north)}${legendBlock(L.legend)}${titleBlock(L.title)}`)}
</svg>`;
}

// Interactive wrapper: zoom (wheel/pinch), pan (drag), hover/click selection, PNG export.
export function mountFloorPlan(host,{onSelect=()=>{},info=null}={}){
 let layout=null,svg=null,full=null,view=null,target=null,anim=0,active=null,hover=null;
 const pointers=new Map();let drag=null;
 function describe(id){
  const r=ROOMS.find(x=>x.id===id);if(!r)return '';
  const [w,d]=netSize(r);
  return `<strong>${r.number} · ${esc(r.name)}</strong><span>Zona ${ZONES[r.zone].label} · ${fmt(w)} × ${fmt(d)} m · ${fmt(w*d)} m²</span><p>${esc(r.info)}</p>`;
 }
 function paintInfo(){if(!info)return;const id=hover||active;info.innerHTML=id?describe(id):'<span>Arahkan atau ketuk ruang untuk melihat detail.</span>';info.classList.toggle('empty',!id);}
 function mark(){if(!svg)return;svg.querySelectorAll('.fp-room').forEach(el=>{el.classList.toggle('fp-is-active',el.dataset.room===active);el.classList.toggle('fp-is-hover',el.dataset.room===hover&&hover!==active);});paintInfo();}
 function apply(){if(svg)svg.setAttribute('viewBox',view.map(v=>v.toFixed(2)).join(' '));}
 function tick(){
  anim=0;let done=true;
  for(let i=0;i<4;i++){const d=target[i]-view[i];if(Math.abs(d)>.5){view[i]+=d*.24;done=false;}else view[i]=target[i];}
  apply();if(!done)anim=requestAnimationFrame(tick);
 }
 const animate=()=>{if(!anim)anim=requestAnimationFrame(tick);};
 function toSVG(cx,cy){const m=svg.getScreenCTM();if(!m)return [0,0];const p=svg.createSVGPoint();p.x=cx;p.y=cy;const q=p.matrixTransform(m.inverse());return [q.x,q.y];}
 function zoomAt(cx,cy,k,base=target){
  const [px,py]=toSVG(cx,cy),w=Math.min(full[2]*1.15,Math.max(full[2]/10,base[2]*k)),f=w/base[2];
  return [px-(px-base[0])*f,py-(py-base[1])*f,w,base[3]*f];
 }
 function render(force=false){
  const r=host.getBoundingClientRect();if(!r.width||!r.height)return;
  const next=r.width/r.height>=1.05?'wide':'tall';
  if(next===layout&&!force)return;
  layout=next;host.innerHTML=buildPlanSVG({layout,active});svg=host.querySelector('svg');
  full=PLAN_LAYOUTS[layout].viewBox.slice();view=full.slice();target=full.slice();apply();mark();
 }
 host.addEventListener('wheel',e=>{if(!svg)return;e.preventDefault();target=zoomAt(e.clientX,e.clientY,Math.exp(e.deltaY*.0016));animate();},{passive:false});
 host.addEventListener('pointerdown',e=>{
  if(!svg)return;host.setPointerCapture?.(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);
  const room=e.target.closest?.('[data-room]')?.dataset.room??null;
  drag={x:e.clientX,y:e.clientY,moved:0,room:pointers.size===1?room:null,pinch:pointers.size===2?pinchState():null};
 });
 function pinchState(){const [a,b]=[...pointers.values()];return {dist:Math.hypot(a[0]-b[0],a[1]-b[1]),cx:(a[0]+b[0])/2,cy:(a[1]+b[1])/2,base:view.slice()};}
 host.addEventListener('pointermove',e=>{
  if(!svg)return;
  if(!pointers.has(e.pointerId)){const id=e.target.closest?.('[data-room]')?.dataset.room??null;if(id!==hover){hover=id;mark();}return;}
  const prev=pointers.get(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);
  if(pointers.size>=2&&drag?.pinch){
   const [a,b]=[...pointers.values()],dist=Math.hypot(a[0]-b[0],a[1]-b[1]);
   view=zoomAt(drag.pinch.cx,drag.pinch.cy,drag.pinch.dist/Math.max(dist,1),drag.pinch.base);target=view.slice();drag.moved=99;apply();return;
  }
  const m=svg.getScreenCTM();if(!m||!drag)return;
  const dx=(e.clientX-prev[0])/m.a,dy=(e.clientY-prev[1])/m.d;
  drag.moved+=Math.abs(e.clientX-prev[0])+Math.abs(e.clientY-prev[1]);
  if(drag.moved>5){view[0]-=dx;view[1]-=dy;target=view.slice();apply();}
 });
 const end=e=>{
  if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);
  if(drag&&drag.moved<=5&&drag.room&&e.type==='pointerup')onSelect(drag.room);
  if(pointers.size===0)drag=null;else if(drag)drag={...drag,pinch:null,room:null};
 };
 host.addEventListener('pointerup',end);host.addEventListener('pointercancel',end);
 host.addEventListener('pointerleave',()=>{if(hover&&!pointers.size){hover=null;mark();}});
 async function renderPNG(width=4000){
  const lay=PLAN_LAYOUTS.wide,[,,vw,vh]=lay.viewBox,height=Math.round(width*vh/vw);
  const markup=buildPlanSVG({layout:'wide',active,width:String(width),height:String(height)});
  const url=URL.createObjectURL(new Blob([markup],{type:'image/svg+xml;charset=utf-8'}));
  try{
   const img=new Image();img.decoding='async';
   await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('SVG gagal dirender'));img.src=url;});
   const c=document.createElement('canvas');c.width=width;c.height=height;const ctx=c.getContext('2d');
   ctx.fillStyle='#fbfcfa';ctx.fillRect(0,0,width,height);ctx.drawImage(img,0,0,width,height);return c;
  }finally{URL.revokeObjectURL(url);}
 }
 async function downloadPNG(){
  const c=await renderPNG();
  const blob=await new Promise(r=>c.toBlob(r,'image/png'));if(!blob)throw new Error('PNG kosong');
  const a=document.createElement('a');a.download='Elora-Smile-Clinic-Denah-Lantai.png';a.href=URL.createObjectURL(blob);document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),5000);
 }
 return {
  render,renderPNG,downloadPNG,
  reset(){if(full){target=full.slice();animate();}},
  setActive(id){active=id;mark();},
  get layout(){return layout;}
 };
}
