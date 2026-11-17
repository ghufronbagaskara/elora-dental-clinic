# Elora Smile Clinic

Viewer interior 3D untuk Elora Fendrine. Denah, ukuran ruang, urutan direktori, serta susunan sidebar mengikuti proyek Elora asli. Enhancement melengkapi isi ruang, pencahayaan, material, dan logo.

## Menjalankan

```powershell
npm ci
npm run dev
```

Vite menyediakan dev server dengan entry module `src/main.js`. Untuk produksi:

```powershell
npm test
npm run build
npm run preview
```

Build menghasilkan `dist/` untuk hosting. Setelah Vite selesai, esbuild memperbarui `app.bundle.js` di root sebagai versi offline. Anda tetap dapat membuka `index.html` root dengan klik dua kali; folder `assets/brand/` diperlukan untuk logo/favicon. Versi `dist/index.html` dilayani melalui HTTP atau hosting, bukan file langsung.

## Deploy Vercel

| Pengaturan | Nilai |
| --- | --- |
| Root Directory | `.` |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

`vercel.json` sudah disediakan. Tidak perlu mengunduh aset dental saat deployment. Node yang didukung Vite: 20.19+ atau 22.12+; versi lebih baru mengikuti engines paket.

## Enhancement

- Denah tetap: penerimaan/tunggu, konsultasi, staf, toilet, dua koridor, tiga ruang tindakan, sterilisasi, radiografi, dan gudang.
- Radiografi intraoral: kursi pasien, lengan rontgen di dinding, viewer hasil, sensor di meja, workstation operator, apron, papan, dan AC.
- Ruang tindakan: instrumen di kabinet, dispenser, hand gel, sharps bin, dan AC.
- Konsultasi/staf: kursi, komputer, model rahang, loker, kulkas staf, dan ketel.
- Resepsionis: meja lengkung, kursi kerja, komputer, printer, serta figur petugas dan pengunjung. Ruang tunggu menampilkan sofa, pengunjung duduk, dan TV dengan tampilan antrean ilustratif.
- Sterilisasi: autoclave dan ultrasonic cleaner berada di atas meja kerja.
- Toilet/gudang/sterilisasi: perlengkapan sesuai fungsi, menggantikan bentuk placeholder.
- Matahari hangat miring, ambient dan fill yang lebih lembut, bayangan 2048², serta panel lampu untuk Eye Level.
- Lantai kayu/tile dan lis dinding; warna dental asli tetap dipertahankan.
- Ukuran kanvas, framing kamera, pergantian mode, dan Reset diperbaiki. Render berhenti saat diam.
- Monogram E diganti logo Elora baru dengan background transparan. File yang sama menjadi favicon dan Apple touch icon. Label Studio Concept dihapus.

## Bangunan, tapak, dan Denah 2D (November 2026)

- **Data bersama** – `src/clinic-data.js` menyimpan ruang, zona, dinding, bukaan (pintu/jendela), dan tapak. Model 3D (`src/architecture.js`) dan Denah 2D (`src/floorplan.js`) membaca data yang sama; ID, koordinat, dan ukuran ruang tidak berubah.
- **Selubung bangunan** – dinding luar 20 cm (dalam 12 cm) dengan jendela kaca berkusen aluminium gelap, ambang batu, pintu masuk kaca ganda, kanopi kayu dengan papan nama "elora", pintu keluar belakang, daun pintu kayu berkusen, plint, dan ambang di setiap bukaan.
- **Atap** – pelat datar dengan lis, parapet, coping, tiga unit AC luar, AHU dengan saluran, toren air pada rangka baja, hatch, dan pipa vent. Tombol **⌂ Atap** (default tampil) memperlihatkan bangunan utuh; mematikannya kembali ke potongan dinding. Atap otomatis disembunyikan di Eye Level atau ketika ruang dipilih.
- **Bayangan matahari** – satu shadow map 2048² menutup seluruh tapak. Tombol **☀ Bayangan** menyalakan/mematikan bayangan; slider jam (07.00–17.00) menggeser matahari timur → barat dengan lintasan agak ke selatan. Bisa juga lewat hash `#shadow=0` atau `#sun=15.5`.
- **Tapak** – plaza paving dengan ramp, jalur sirkulasi aspal, lima petak mobil + satu petak difabel (biru, piktogram, area transfer berarsir), wheel stop, deret parkir motor beratap, zebra cross ke pintu utama, marka MASUK, trotoar dan jalan, bedeng bermulsa dengan semak prosedural, empat pohon peneduh, lampu taman/bollard, totem nama, dan pagar batas. Elemen berulang memakai `InstancedMesh`, elemen statis digabung per material.
- **Isi ruang** – papan nama ruang di samping pintu (bernomor sesuai direktori), karya seni berbingkai, jam dinding, tanaman pot tambahan, plafon koridor, dan downlight untuk Eye Level. Perabot inti tidak dipindah.
- **Eye Level** – memilih ruang di mode Eye Level menempatkan kamera di ambang pintu ruang tersebut setinggi mata, dengan dinding penuh.
- **Denah 2D** – tab baru berupa SVG: dinding poché, busur ayun pintu, jendela garis kaca ganda, nama/nomor/ukuran bersih/luas tiap ruang, tint zona dengan legenda, rantai dimensi luar di empat sisi (segmen + total, tick 45°), panah utara, skala grafis 0–5 m, kotak judul, dan tapak parkir dengan label MASUK. Hover/klik ruang menampilkan info yang sama dengan sidebar. Zoom/geser memakai wheel, drag, atau pinch; **Unduh PNG** menghasilkan gambar 4000 px.
- **Tautan status** – `#view=plan`, `#view=walk&room=unit1`, atau `#roof=0` membuka viewer langsung pada kondisi tersebut.

## Aset

Proyek menyertakan 56 GLB dari 3DAssets.dev dan delapan GLB detail dari Innerscene yang berlisensi CC0. Tiga figur manusia bersifat statis dan berasal dari model berbasis MakeHuman/MPFB. URL, dimensi, jumlah segitiga, dan lisensi tersedia di `ASSET_LICENSES.json`. File GLB disimpan di `assets/models/` dan tertanam di bundle.

Untuk meregenerasi aset tertanam:

```powershell
python scripts/fetch_assets.py
python scripts/embed_assets.py
npm run build
```

Generator menulis UTF-8 agar kompatibel dengan Vite. Logo dibuat dengan tool imagegen bawaan; prompt dan lokasi file dicatat di `BRAND.md`.

## Verifikasi dan batas

`npm test` memeriksa seluruh GLB, batas furnitur, kesesuaian alat dengan ruang, preservasi denah asli, kamera pada empat ukuran viewport, pergantian mode, Reset, render saat diam, perilaku tombol Atap, bukaan jendela di dinding luar, kesamaan data Denah 2D dengan model 3D, serta rantai dimensi yang totalnya sama dengan ukuran bangunan. Tes Node memakai geometri asli dengan DOM/WebGL stand-in. Hasil browser dan ukuran output dicatat di `ENHANCEMENT_NOTES.md`.

Luas 216 m² dan dimensi visual adalah asumsi konsep. Model ini bukan gambar konstruksi atau pembuktian pemenuhan izin fasilitas kesehatan; desain shielding, sanitasi, alur instrumen, akses bangunan, serta utilitas memerlukan tinjauan profesional.
