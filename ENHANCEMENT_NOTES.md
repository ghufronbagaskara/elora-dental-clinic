# Elora Fendrine: catatan enhancement

Tanggal: 26 Oktober 2026.

## Ruang dan interior

Koordinat serta dimensi seluruh dua belas zona (sepuluh ruang dan dua koridor) dipertahankan. Partisi dan bukaan tetap mengikuti denah awal. Sidebar, mode kamera, direktori, dan fakta proyek mengikuti desain Elora.

Jumlah model bertambah dari 35 menjadi 56. Aset tambahan mencakup AC indoor/outdoor, komputer, kursi, loker, rak, viewer rontgen, sanitary fixtures, model rahang, dan panel plafon. Sumber dan lisensi disimpan di ASSET_LICENSES.json.

Radiografi dilengkapi sebagai ruang rontgen intraoral, bukan unit panoramik atau mesin X-ray meja rumah sakit. Sensor dan komputer berada di meja; kursi pasien, viewer, lengan rontgen, apron, serta papan ditempatkan dalam ruang radiografi. Perlengkapan ruang lain mengikuti fungsinya.

## Renderer

Sinar matahari miring dan hangat, shadow map tunggal 2048², fill lebih lembut, serta empat lampu lokal. Pola lantai dan lis memberi detail permukaan. Bayangan diperbarui ketika geometri atau mode dinding berubah. Render berhenti saat tampilan diam.

Scene memiliki 130.564 segitiga dan 960 mesh; GLB asli berjumlah 2.106.796 byte. Bundle web Vite sekitar 3,46 MB atau 983 KB gzip, ditambah logo PNG sekitar 274 KB. Vite memberi warning ukuran chunk karena model tertanam; ini bukan error build. FPS pada perangkat pengguna belum diukur.

## Vite dan kompatibilitas

Vite 8.3.5 dipasang bersama esbuild 0.28.2 untuk memenuhi peer dependency. Lockfile disediakan. Hook HTML Vite mengganti entry bundle klasik menjadi module hanya untuk server/build; source HTML root tetap memakai bundle offline. Hasil Vite memakai nama aset ber-hash, termasuk logo/favicon.

Generator embedded-assets diperbaiki agar menulis UTF-8. Versi awal generator memakai encoding default Windows yang ditolak parser Vite.

## Logo

Logo transparan dihasilkan memakai imagegen bawaan, disimpan di assets/brand/elora-symbol.png, dan digunakan untuk ikon sidebar, favicon, serta Apple touch icon. Prompt lengkap tersedia di BRAND.md.

## Verifikasi

Tes Node lolos: preservasi ID/posisi/ukuran semua ruang, parsing 56 GLB, batas furnitur, penempatan peralatan, kamera empat ukuran, Reset, serta penghentian render saat diam.

Dev server dan hasil production dibuka melalui browser bawaan. Logo dan favicon production menunjuk aset hash yang sama dan logo termuat; kanvas sesuai panel. Seluruh direktori ruang, Floor Plan, Eye Level, dinding rendah/penuh, dan Reset diperiksa. Tidak ada warning/error konsol browser. Screenshot desktop dan denah disimpan dalam proyek.

Unduhan PNG melalui dialog browser dan benchmark FPS belum diperiksa pada sesi ini. Deployment Vercel belum dilakukan.


Pemeriksaan mobile 390 × 844 juga lolos: tidak ada overflow horizontal, logo termuat, dan kanvas sesuai panel. Jarak fog disesuaikan dengan framing kamera agar model tidak pudar ketika kamera menjauh pada layar sempit. Screenshot mobile diperbarui.

## Upgrade November 2026

Fasad diberi jendela kaca berkusen, pintu kaca ganda + kanopi, signage ELORA, atap datar berparapet dengan unit AC (tombol Atap), serta tapak: plaza paving, jalan akses, parkir 5 petak + 1 difabel, parkir motor, zebra cross, bedeng tanaman, pohon, lampu taman, pagar. Ruang diberi signage, poster, jam, tanaman pot. Mode **Denah 2D** (SVG dari data ruang yang sama dengan 3D, `src/clinic-data.js`) lengkap dengan dimensi, legenda zona, panah utara, skala, dan unduh PNG 4000 px.

Bayangan matahari tetap satu shadow map 2048², kini menutup seluruh tapak (±23 m). Tombol **☀ Bayangan** mematikan/menyalakan bayangan; slider jam menggeser matahari 07.00–17.00. Bayangan dihitung ulang hanya saat matahari, dinding, atau toggle berubah.

Hasil `npm test`: 956 mesh, 244.302 segitiga (sebelumnya 960 mesh, 130.564 segitiga). Bundle Vite 6,8 MB (3,26 MB gzip); `app.bundle.js` 6,5 MB. Konsol browser hanya menampilkan warning compiler shader ANGLE (X4122), bukan error.
