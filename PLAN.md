# PLAN.md — Perbaikan Stack Thrifts

Target: merapikan stack dari kondisi "liar" → standar maintainable. Tidak ada deadline; kerjakan per fase.

## Kondisi Awal (ringkasan)

- 3 dependency mati: `bcryptjs`, `mysql`, `body-parser`
- Tidak ada `.env.example`, tidak ada `schema.sql`
- `app.js` 423 baris (monolith): routing + helpers HBS + Socket.IO
- `authRoutes` double-mount (`/api` + `/auth`)
- Cookie JWT tanpa `secure`/`sameSite`
- Tidak ada test, lint, CI
- `db.js` swallow error → server tetap jalan tanpa DB
- `nodemon` salah taruh di `dependencies`

---

## Fase 1 — P0 (cleanup dependency, tanpa ubah runtime)

- [ ] Hapus dari `package.json`: `bcryptjs`, `mysql`, `body-parser`
- [ ] Jalankan `npm install` ulang, pastikan `package-lock.json` bersih
- [ ] Pindahkan `nodemon` ke `devDependencies`
- [ ] Tambah `.env.example` dengan variabel yang wajib (lihat AGENTS.md)
- [ ] Tambah `README.md` minimal: setup, scripts, env, schema restore

**Verify:** `npm install` tanpa warning, `npm start` masih jalan, `node -e "require('./app')"` tidak error.

## Fase 2 — P0 (schema & DB resilience)

- [ ] Tulis `schema.sql` untuk tabel: `users`, `products`, `styles`, `wishlist`, `cart`, `orders`, `order_items`, `conversations`, `chat_messages`, `reviews`
- [ ] Tambah `seed.sql` opsional (1 user demo, 5 produk)
- [ ] Fix `db.js`: pakai `pool.query('SELECT 1')` di startup; **exit proses** kalau DB down (jangan diam-diam start)
- [ ] Tambah `/health` endpoint yang return 200 + status DB

**Verify:** `mysql < schema.sql` jalan, drop & restore bekerja, `/health` return JSON benar.

## Fase 3 — P1 (security hardening)

- [ ] Cookie JWT: tambah `sameSite: 'lax'`, `secure: process.env.NODE_ENV === 'production'`
- [ ] `isLoggedIn` & `ensureAuth`: ganti `SELECT *` jadi kolom eksplisit (jangan load `password` hash)
- [ ] Review helper HBS yang pakai `new hbs.SafeString(...)` — pastikan input di-escape dulu
- [ ] Rate limit di `/auth/login` (pakai `express-rate-limit`)
- [ ] Tambah `helmet` middleware

**Verify:** cookie `Set-Cookie` di prod env punya `Secure; SameSite=Lax`, login brute force 429.

## Fase 4 — P1 (refactor `app.js`)

- [ ] Pecah jadi:
  - `server.js` — bootstrap (`dotenv`, pool, http, `app.listen`)
  - `app.js` — express config, middleware order
  - `sockets/chat.js` — Socket.IO auth + handlers (event `initiateChat`, `sendMessage`, `testEvent`)
  - `views/helpers.js` — Handlebars helpers
- [ ] Pindahkan helper ke `views/helpers.js` (sekarang ~100 baris inline di `app.js:41-138`)
- [ ] Lepas double-mount `authRoutes`: pilih satu prefix (`/api/auth/...` saja) dan update semua link di views

**Verify:** struktur folder baru, tidak ada `hbs.registerHelper` di `app.js`, semua route masih resolve.

## Fase 5 — P1 (testing & linting)

- [ ] Pilih test runner — rekomendasi: `node --test` (built-in, zero-dep)
- [ ] Tambah `npm test` yang real: jalankan test dari `test/`
- [ ] Tambah `eslint` config (`eslint.config.js` flat config), rule default + `no-unused-vars`
- [ ] Tambah `npm run lint` script
- [ ] Tulis test minimal:
  - `middleware/auth.test.js` — token invalid, expired, `'logout'` cookie
  - `controllers/auth.test.js` — register/login happy path
  - `routes/socket.test.js` — handshake tanpa token ditolak

**Verify:** `npm test` exit 0, `npm run lint` exit 0.

## Fase 6 — P2 (CI & DX)

- [ ] Tambah `.github/workflows/ci.yml`: jalankan `npm install` + `npm run lint` + `npm test` di Node 20 dan 22
- [ ] Tambah MySQL service container di workflow untuk integration test
- [ ] Tambah `.editorconfig` + `prettier` config
- [ ] Tambah `npm run format` script

**Verify:** PR baru trigger CI, badge di README.

## Fase 7 — P2 (cleanup sisa)

- [ ] Hapus `routes/pagesTemp.js` (dead file)
- [ ] Hapus `module.exports = pool` salah tempat di `app.js:423`
- [ ] Hapus `console.log` debug di `controllers/auth.js:116,121,129,...`
- [ ] Audit semua query `SELECT *` yang tersisa

**Verify:** `git grep "SELECT \*" -- '*.js'` minimal, tidak ada `console.log` debug.

---

## Progress Tracking

| Fase | Status | Tanggal Selesai | Catatan |
|------|--------|-----------------|---------|
| 1    | ✅ selesai | 2026-06-23 | Hapus bcryptjs/mysql/body-parser, nodemon ke devDeps, tambah .env.example + README. `node -e "require('./app.js')"` resolve semua module. |
| 2    | ✅ selesai | 2026-06-23 | `schema.sql` + `seed.sql` ditulis (12 tabel, FK lengkap, CHECK constraints). `db.js` exit-on-fail. `/health` endpoint di `app.js`. Verified: process exit 1 saat DB credentials invalid. |
| 3    | ✅ selesai | 2026-06-23 | Helmet, rate-limit login (max 10), escape hbs.SafeString input, JWT cookie `sameSite` & `secure`, hapus `SELECT *` yang expose password hash. |
| 4    | ✅ selesai | 2026-06-23 | Refactor `app.js` menjadi `server.js` (bootstrap) & `app.js` (config). Pindah helpers ke `views/helpers.js` dan Socket.IO ke `sockets/chat.js`. Route authRoutes di-fix ke `/auth`. |
| 5    | ✅ selesai | 2026-06-23 | Setup `node --test` untuk middleware, controller dan socket chat. Setup `eslint` flat config. |
| 6    | ✅ selesai | 2026-06-23 | Tambah workflow GitHub Actions CI (Node 20/22 + MySQL Service). Buat konfigurasi `.editorconfig` dan `.prettierrc`, serta tambahkan script format di package.json. |
| 7    | ✅ selesai | 2026-06-23 | Hapus file mati `routes/pagesTemp.js`. Hapus log debug berlebih di `controllers/auth.js`. Audit akhir memastikan tidak ada query `SELECT *` yang tersisa. |

Update tabel di atas saat satu fase selesai. Boleh kerjakan paralel kalau tidak konflik (mis. Fase 1 + Fase 2 bisa bareng).

## Definisi Selesai (Refactoring Fase 1-7)

Repo dianggap "standar" ketika:
- `npm install` bersih tanpa dependency mati
- `npm test`, `npm run lint`, `npm start` semua exit 0
- CI hijau
- Tidak ada file `*Temp*` atau `console.log` debug
- `app.js` < 100 baris (cuma wiring)
- Schema DB di repo, bisa di-restore manual

---

# PLAN FASE II — Pengembangan Fitur & E-Commerce Core

Berikut adalah rancangan (blueprint) untuk melengkapi fitur-fitur esensial yang masih kosong.

## Fase 8 — Penyempurnaan Visual & Data Dummy
- [ ] Ubah data `seed.sql` agar menggunakan link gambar Unsplash/Pexels beresolusi tinggi (placeholder baju nyata).
- [ ] Implementasikan fallback avatar UI Faces / DiceBear API di Handlebars untuk pengguna yang belum mengunggah foto profil.

## Fase 9 — Pemberdayaan Penjual (Seller Core)
- [ ] **Edit & Hapus Produk:** Buat backend endpoint (`PUT /api/products/:id`, `DELETE /api/products/:id`) beserta UI di tab *My Products*.
- [ ] **Toko Saya (Store Orders):** Buat tab baru di Dashboard ("Store Orders") yang menampilkan daftar pembeli yang memesan produk si penjual.
- [ ] **Update Status Pesanan:** Berikan akses kepada penjual untuk mengubah status order (misal: "Pending" -> "Shipped").

## Fase 10 — Perbaikan Akun & Keamanan Transaksi
- [ ] **Ganti Password:** Tambahkan form dan fungsi `bcrypt.compare` + `bcrypt.hash` di pengaturan profil untuk mengubah sandi.
- [ ] **Validasi Ulasan (Verified Buyer):** Kunci endpoint `/api/products/:id/reviews` dengan validasi SQL yang mengecek apakah user tersebut benar-benar pernah membeli barang tersebut dengan status `completed`.

## Fase 11 — Navigasi & Performa (UX)
- [ ] **Search Bar Aktif:** Hubungkan ikon kaca pembesar di navigasi ke halaman pencarian dengan parameter query `?q=...` dan buat handler `LIKE %query%` di `controllers/product.js`.
- [ ] **Pagination Katalog:** Tambahkan logika Limit & Offset di halaman `/allProduk` beserta tombol Prev/Next di bagian bawah halaman.

---

## Progress Tracking Fase II

| Fase | Status | Tanggal Selesai | Catatan |
|------|--------|-----------------|---------|
| 8    | ✅ selesai | 2026-06-23 | Modifikasi `seed.sql` memakai foto Unsplash. Implementasikan fallback `ui-avatars` untuk foto profil di dashboard, chat, index, dan sellerProfile. |
| 9    | ✅ selesai | 2026-06-23 | Seller Core: Backend & UI Hapus Produk, Edit Produk (Harga & Stok). Penambahan tab Store Orders beserta Query API dan UI Dropdown form untuk mengubah status pesanan. |
| 10   | ✅ selesai | 2026-06-24 | Menambahkan fitur keamanan Ubah Password dengan verifikasi bcrypt lama/baru. Menambahkan perlindungan pada Endpoint Review agar hanya *Verified Buyer* (yang transaksinya Completed) yang dapat memberikan ulasan. |
| 11   | ✅ selesai | 2026-06-24 | Ikon Search Navbar berfungsi (Modal Form) dan mem-filter query di `/allProduk` via parameter `?q=...`. Katalog kini memiliki limit 8 produk per halaman dan Pagination dinamis di bagian bawah. |
