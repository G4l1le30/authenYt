# AGENTS.md — Thrifts

Node/Express 5 e-commerce app dengan MySQL + Socket.IO chat. Tidak ada test, lint, atau CI.

## Setup

- Node.js, MySQL 5.7+/8.x di port 3306.
- Buat `.env` (di-gitignore). Wajib:
  - `DATABASE_HOST`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE`
  - `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_COOKIE_EXPIRES`
- DB schema **tidak disertakan**, tapi `schema.sql` di-root mendefinisikan semua tabel yang dipakai. Restore: `mysql -u root -p thrifts < schema.sql` lalu `seed.sql` (opsional) untuk data demo. Tabel yang dipakai kode: `users`, `products`, `categories`, `styles`, `product_images`, `wishlist`, `carts` (bukan `cart`), `orders`, `order_items`, `conversations`, `chat_messages`, `reviews`.
- Install + jalankan: `npm install` lalu `npm start` (= `nodemon app.js`, port 5000).

## Commands

- `npm start` — dev server dengan hot-reload (`nodemon app.js`).
- `npm test` — placeholder, exit 1. Tidak ada test suite.

## Layout

- `app.js` — single-file entrypoint: Express setup, semua Handlebars helpers, Socket.IO auth + chat, route mounting, `server.listen`. Modifikasi besar di sini harus hati-hati.
- `routes/` — `pages.js` (web pages, 563 baris), `auth.js`, `product.js`, `cart.js`, `checkout.js`, `reviewRoutes.js`. `pagesTemp.js` tidak di-mount — dead file.
- `controllers/` — handler per resource. `controllers/auth.js` juga handle wishlist (jangan tambahin `wishlist.js`).
- `middleware/auth.js` — `isLoggedIn`, `ensureAuth`/`protect`, `getUser` (inject `res.locals.user`). `getUser` dipasang global di `app.js:153`.
- `views/` — Handlebars `.hbs`, partials di `views/partials/`.
- `utils/productOptions.js` — `PREDEFINED_COLORS_CONFIG`, `PREDEFINED_SIZES`, `SORT_OPTIONS`, `getColorDetails`.
- `public/` — `style.css`, `script.js`, `img/`.

## Konvensi & gotchas

- View engine `hbs` (Handlebars). Partial didaftarkan di `app.js:38` dari `views/partials/`. Tambah helper baru di `app.js` block `// ----- Handlebars helpers -----` (jangan buat file helper terpisah — belum ada loader).
- Auth: JWT di cookie `jwt` (httpOnly, **tanpa `secure`/`sameSite`**). Logout set cookie ke string `'logout'`; `getUser`/`isLoggedIn` di `middleware/auth.js` treat `'logout'` sebagai tidak login.
- Routes auth di-mount dua kali di `app.js`: `app.use('/api', authRoutes)` (`app.js:408`) **dan** `app.use('/auth', authRoutes)` (`app.js:414`). Jangan mount ulang tanpa cek冲突.
- `authRoutes` export beberapa handler untuk endpoint `/auth/logout`, `/auth/wishlist`, dll. — lihat `routes/auth.js` sebelum assume path.
- `db.js` connect ke MySQL pakai `mysql2/promise` pool, export `pool` (backward-compat dengan `const pool = require('./db')`) plus `pool.verifyConnection()` dan `pool.ping()`. Startup panggil `verifyConnection()` di `app.js` dan **exit 1** kalau DB down. `/health` endpoint return 200 + status DB.
- Socket.IO: cookie JWT dipakai untuk auth handshake (`app.js:156`). Event: `initiateChat`, `sendMessage`, `testEvent`. Room id = `conversation_<id>`.
- Tabel `conversations` punya kolom `user_one_id`/`user_two_id` dengan `user_one_id < user_two_id` (lihat `app.js:227`). Pertahankan invariant ini.
- Bahasa UI/konten: Indonesia (Bahasa). Pesan error dan helper output混 pakai `id-ID` locale (`formatRupiah`, `formatDate`).
- Dependency noise: `bcryptjs`, `mysql`, `body-parser` ada di `package.json` tapi tidak dipakai (pakai `bcrypt`, `mysql2`, `express` built-in parsers). Jangan import dari yang mati.
- `nodemon` di dependencies (bukan devDependencies) — tidak masalah tapi tidak ideal.
- `module.exports = pool` di akhir `app.js:423` salah tempat (export harus di `db.js`); dibiarkan karena `app.js` di-require oleh nodemon, bukan modul lain.

## Apa yang TIDAK dilakukan agent

- Jangan tambah test baru di tempat kosong tanpa setup framework dulu (lihat "Commands").
- Jangan pisah `app.js` jadi banyak file kecuali task memang itu — repo ini single-file by design (buruk, tapi konsisten).
- Jangan asumsi ada `.env.example`, `schema.sql`, README, atau CI.
- Jangan mount `authRoutes` di path ketiga tanpa cek double-mount.
