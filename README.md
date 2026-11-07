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

`npm test` memeriksa seluruh GLB, batas furnitur, kesesuaian alat dengan ruang, preservasi denah asli, kamera pada empat ukuran viewport, pergantian mode, Reset, dan render saat diam. Tes Node memakai geometri asli dengan DOM/WebGL stand-in. Hasil browser dan ukuran output dicatat di `ENHANCEMENT_NOTES.md`.

Luas 216 m² dan dimensi visual adalah asumsi konsep. Model ini bukan gambar konstruksi atau pembuktian pemenuhan izin fasilitas kesehatan; desain shielding, sanitasi, alur instrumen, akses bangunan, serta utilitas memerlukan tinjauan profesional.
