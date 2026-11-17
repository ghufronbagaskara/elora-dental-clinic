// Single source of truth for the Elora layout. The 3D viewer and the 2D plan both read
// these records, so a change here moves walls, openings and labels in both views.
// Units are metres. x runs along the front facade, z runs from the facade (0) to the back (12).

export const BUILDING={width:18,depth:12,wallHeight:2.8,extWall:.2,intWall:.12,grossArea:216};

export const ZONES={
 public:{label:'Publik',fill:'#f4e9d8'},
 clinical:{label:'Klinis',fill:'#dcebe3'},
 staff:{label:'Staf',fill:'#e8e8dc'},
 service:{label:'Servis',fill:'#e1e7ea'}
};

export const SPACES=[
 ['waiting','Resepsionis & Ruang Tunggu',0,0,8,3.5,'#ebe2d6','public','Meja pendaftaran dengan workstation dan kursi petugas. Area tunggu dilengkapi sofa, kursi, TV antrean, dispenser, dan sudut bermain anak.'],
 ['consult','Ruang Konsultasi',8,0,4,3.5,'#ece2d6','clinical','Meja dokter, komputer, kursi pasien dan pendamping, model rahang untuk edukasi, serta lemari berkas.'],
 ['staff','Ruang Staf',12,0,4,3.5,'#e6e9df','staff','Area kerja serta istirahat staf; terpisah dari ruang tindakan.'],
 ['wc','Toilet',16,0,2,3.5,'#dce9e6','service','Toilet konseptual. Detail aksesibilitas, sanitasi, dan plumbing perlu diverifikasi.'],
 ['hall','Koridor Utama',0,3.5,18,1.5,'#f1eadf','public','Akses dari ruang tunggu menuju ruang klinis.'],
 ['unit1','Ruang Tindakan 1',0,5,6,3.5,'#deece7','clinical','Dental chair, lampu tindakan, dental delivery, suction, kabinet, dan kursi dokter.'],
 ['unit2','Ruang Tindakan 2',8,5,6,3.5,'#deece7','clinical','Dental unit kedua dengan perlengkapan tindakan lengkap.'],
 ['sterile','Sterilisasi',14,5,4,3.5,'#e8e9e3','service','Pencucian dan sterilisasi instrumen; alur kotor-bersih harus dirancang terpisah.'],
 ['xray','Radiografi',0,8.5,6,3.5,'#e3e6e8','clinical','Radiografi intraoral: lengan rontgen terpasang di dinding, kursi pasien, sensor di meja, viewer hasil, dan area operator. Bukan unit panoramik. Shielding perlu desain profesional.'],
 ['unit3','Ruang Tindakan 3',8,8.5,6,3.5,'#deece7','clinical','Dental unit ketiga sesuai kapasitas awal dalam business plan.'],
 ['storage','Gudang & Utilitas',14,8.5,4,3.5,'#e9e8df','service','Penyimpanan, utilitas, dan perlengkapan pendukung operasional.'],
 ['innerhall','Koridor Dalam',6,5,2,7,'#f1eadf','clinical','Akses internal ke ruang klinis.']
].map(([id,name,x,z,w,d,color,zone,info])=>({id,name,x,z,w,d,color,zone,info}));

export const ROOMS=SPACES.filter(s=>!s.id.includes('hall'));
ROOMS.forEach((room,i)=>{room.number=String(i+1).padStart(2,'0');});

// Clear interior size: every inner wall face sits half an interior wall from the room axis.
export function netSize(space){return [space.w-BUILDING.intWall,space.d-BUILDING.intWall];}
export const fmt=(n,digits=2)=>n.toFixed(digits).replace('.',',');

// o: 'h' runs along x at z=at, 'v' runs along z at x=at. out: outward side of exterior walls.
export const WALLS=[
 {id:'front',o:'h',at:0,from:0,to:18,ext:true,out:-1},
 {id:'back',o:'h',at:12,from:0,to:18,ext:true,out:1},
 {id:'left',o:'v',at:0,from:0,to:12,ext:true,out:-1},
 {id:'right',o:'v',at:18,from:0,to:12,ext:true,out:1},
 {id:'h35',o:'h',at:3.5,from:0,to:18},
 {id:'v8a',o:'v',at:8,from:0,to:3.5},
 {id:'v12a',o:'v',at:12,from:0,to:3.5},
 {id:'v16a',o:'v',at:16,from:0,to:3.5},
 {id:'h5',o:'h',at:5,from:0,to:18},
 {id:'h85',o:'h',at:8.5,from:0,to:18},
 {id:'v6',o:'v',at:6,from:5,to:12},
 {id:'v8',o:'v',at:8,from:5,to:12},
 {id:'v14',o:'v',at:14,from:5,to:12}
];
export const wallById=new Map(WALLS.map(w=>[w.id,w]));

// type: window | entry | door | exit | open. swing: side the leaf opens toward (+1 = larger z/x).
export const OPENINGS=[
 {wall:'front',type:'window',from:.8,to:2.8,sill:.9,head:2.25,room:'waiting'},
 {wall:'front',type:'window',from:3.4,to:5.4,sill:.9,head:2.25,room:'waiting'},
 {wall:'front',type:'entry',from:6.15,to:7.85,head:2.45,swing:-1,room:'waiting'},
 {wall:'front',type:'window',from:9.1,to:10.9,sill:.9,head:2.25,room:'consult'},
 {wall:'front',type:'window',from:12.45,to:13.95,sill:.9,head:2.25,room:'staff'},
 {wall:'front',type:'window',from:16.65,to:17.35,sill:1.65,head:2.2,frosted:true,room:'wc'},
 {wall:'back',type:'window',from:9.7,to:12.3,sill:.9,head:2.1,room:'unit3'},
 {wall:'back',type:'exit',from:6.45,to:7.55,head:2.1,hinge:'to',swing:1,room:'innerhall'},
 {wall:'left',type:'window',from:3.85,to:4.65,sill:.9,head:2.25,room:'hall'},
 {wall:'left',type:'window',from:5.9,to:7.7,sill:.9,head:2.25,room:'unit1'},
 {wall:'right',type:'window',from:3.85,to:4.65,sill:.9,head:2.25,room:'hall'},
 {wall:'right',type:'window',from:5.4,to:6.5,sill:1.65,head:2.2,frosted:true,room:'sterile'},
 {wall:'h35',type:'open',from:6.2,to:7.8,head:2.4},
 {wall:'h35',type:'door',from:9.5,to:10.55,head:2.1,hinge:'from',swing:-1,room:'consult'},
 {wall:'h35',type:'door',from:13.25,to:14.25,head:2.1,hinge:'to',swing:-1,room:'staff'},
 {wall:'h35',type:'door',from:16.3,to:17.22,head:2.1,hinge:'to',swing:-1,room:'wc'},
 {wall:'h5',type:'open',from:6.15,to:7.85,head:2.4},
 {wall:'h5',type:'door',from:9.9,to:11,head:2.1,hinge:'from',swing:1,room:'unit2'},
 {wall:'h5',type:'door',from:15.3,to:16.25,head:2.1,hinge:'to',swing:1,room:'sterile'},
 {wall:'h85',type:'open',from:6.1,to:7.9},
 {wall:'h85',type:'door',from:10.05,to:11.1,head:2.1,hinge:'from',swing:1,room:'unit3'},
 {wall:'h85',type:'door',from:15.4,to:16.4,head:2.1,hinge:'to',swing:1,room:'storage'},
 {wall:'v6',type:'door',from:6.05,to:7.15,head:2.1,hinge:'from',swing:-1,room:'unit1'},
 {wall:'v6',type:'door',from:9.68,to:10.76,head:2.1,hinge:'to',swing:-1,room:'xray'},
 {wall:'v8',type:'door',from:6.05,to:7.15,head:2.1,hinge:'from',swing:1,room:'unit2'},
 {wall:'v8',type:'door',from:9.68,to:10.76,head:2.1,hinge:'to',swing:1,room:'unit3'},
 {wall:'v14',type:'door',from:6.08,to:7.13,head:2.1,hinge:'from',swing:1,room:'sterile'},
 {wall:'v14',type:'door',from:9.7,to:10.74,head:2.1,hinge:'to',swing:1,room:'storage'}
];
export const openingsOn=id=>OPENINGS.filter(o=>o.wall===id).sort((a,b)=>a.from-b.from);

// Centre line, thickness and length of a wall. Exterior walls grow outward so every
// inner face stays where the original 12 cm partitions put it.
export function wallBody(wall){
 const {extWall,intWall}=BUILDING;
 if(!wall.ext)return {center:wall.at,t:intWall,from:wall.from,to:wall.to};
 const shift=(extWall-intWall)/2,outer=extWall-intWall/2;
 const grow=wall.o==='h'?outer:0;
 return {center:wall.at+wall.out*shift,t:extWall,from:wall.from-grow,to:wall.to+grow,outerFace:wall.at+wall.out*outer};
}

// Points where partitions meet an exterior side: the basis of the dimension chains.
export function dimensionBreaks(side){
 const {width:W,depth:D}=BUILDING,eps=1e-6;
 const pts=new Set(side==='front'||side==='back'?[0,W]:[0,D]);
 for(const w of WALLS){
  if(w.ext)continue;
  if((side==='front'&&w.o==='v'&&w.from<=eps)||(side==='back'&&w.o==='v'&&w.to>=D-eps))pts.add(w.at);
  if((side==='left'&&w.o==='h'&&w.from<=eps)||(side==='right'&&w.o==='h'&&w.to>=W-eps))pts.add(w.at);
 }
 return [...pts].sort((a,b)=>a-b);
}

// Site in the same coordinates; negative z lies in front of the facade.
export const SITE={
 lot:{x0:-7,x1:25,z0:-15.5,z1:15},
 plaza:{x0:-2,x1:20,z0:-4,z1:0},
 landing:{x0:5,x1:9,z0:-1.9,z1:0},
 aisle:{x0:-6.5,x1:24,z0:-10,z1:-4},
 stallRow:{z0:-15.2,z1:-10},
 stalls:[[.1,2.6],[7.8,10.3],[10.3,12.8],[12.8,15.3],[15.3,17.8]],
 accessible:{x0:2.6,x1:5,hatch:[5,6.2]},
 walkway:{x0:6.2,x1:7.8,z0:-15.5,z1:-10},
 zebra:{x0:6.2,x1:7.8,z0:-10,z1:-4},
 wheelStop:-14.55,
 motor:{x0:-6,x1:-.2,z0:-12.4,z1:-10,count:6},
 driveway:{x0:19.6,x1:24,z0:-16.5,z1:-10},
 sidewalk:{z0:-16.5,z1:-15.5},
 street:{z0:-22.5,z1:-16.5},
 gate:[6.2,7.8],
 beds:[
  {x0:-1.6,x1:5.4,z0:-1.5,z1:-.45},
  {x0:8.6,x1:17.8,z0:-1.5,z1:-.45},
  {x0:-1.45,x1:-.45,z0:1,z1:11},
  {x0:17.9,x1:19.5,z0:-15.2,z1:-10.3},
  {x0:-6.8,x1:-.4,z0:-15.2,z1:-12.8}
 ],
 trees:[[18.7,-12.6,1.7],[-3.6,-14,1.6],[-4.3,5.5,2],[22.3,4.6,1.9]],
 lamps:[[-1.7,-3.6],[4.4,-3.6],[13.2,-3.6],[19.6,-3.6],[-.4,-13],[18.7,-15]]
};
