# Thrifts

[![Node.js CI](https://github.com/G4l1le30/authenYt/actions/workflows/ci.yml/badge.svg)](https://github.com/G4l1le30/authenYt/actions/workflows/ci.yml)

E-commerce app dengan Node.js, Express 5, MySQL, dan Socket.IO chat. Aplikasi ini memiliki fitur katalog produk, keranjang belanja, wishlist, checkout dengan saldo internal, sistem chat *real-time* antar pengguna, dan dashboard manajemen toko untuk penjual.

## Prasyarat

- Node.js 20 LTS (atau 18+)
- MySQL 5.7+ atau 8.x di port 3306
- Docker & Docker Compose *(opsional, untuk menjalankan dengan mode development containerized)*

## Menjalankan dengan Docker (Rekomendasi)

Aplikasi ini sudah disiapkan dengan `Dockerfile` dan `docker-compose.yml` lengkap dengan *hot-reload*. Database MySQL akan otomatis diinisialisasi dengan `schema.sql` dan `seed.sql`.

```bash
# Build image dan jalankan semua service
docker-compose up -d --build

# Untuk melihat log real-time
docker-compose logs -f app

# Untuk mematikan
docker-compose down
```

Akses aplikasi di **http://localhost:5050**.

> **Catatan port:** Port `5050` dan `3307` di-*expose* ke host karena sering bentrok dengan MySQL lokal & AirPlay macOS. Ubah di `docker-compose.yml` jika perlu.

### Akun Demo (otomatis tersedia dari `seed.sql`)

| Email | Password | Saldo | Peran |
|-------|----------|-------|-------|
| `seller@demo.test` | `demo1234` | Rp 1.000.000 | Penjual (memiliki 5 produk dummy) |
| `buyer@demo.test` | `demo1234` | Rp 500.000 | Pembeli |

## Setup Manual (Tanpa Docker)

```bash
# Install dependencies
npm install

# Salin dan isi environment variables
cp .env.example .env
# Edit .env: isi DATABASE_PASSWORD dan JWT_SECRET
# Generate JWT_SECRET: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Setup database
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS thrifts"
mysql -u root -p thrifts < schema.sql
mysql -u root -p thrifts < seed.sql    # Opsional: data dummy

# Jalankan server
npm start
```

Akses di **http://localhost:5000**.

## Scripts

| Command | Fungsi |
|---------|--------|
| `npm start` | Dev server dengan hot-reload (`nodemon server.js`) |
| `npm start:prod` | Production mode (`node server.js`) |
| `npm test` | Jalankan unit test (`node --test test/**/*.test.js`) |
| `npm run lint` | Cek code style dengan ESLint |
| `npm run format` | Format semua file dengan Prettier |

## Environment Variables

Buat file `.env` di root:

```env
DATABASE_HOST=localhost
DATABASE_USER=root
DATABASE_PASSWORD=
DATABASE=thrifts

JWT_SECRET=<generate-with-crypto-randomBytes>
JWT_EXPIRES_IN=7d
JWT_COOKIE_EXPIRES=7

PORT=5000
NODE_ENV=development
```

## Struktur Project

```
thrifts/
├── server.js              # Bootstrap: dotenv, http, socket.io, app.listen
├── app.js                 # Express config + middleware + route mounting
├── db.js                  # MySQL pool + verifyConnection() + ping()
├── schema.sql             # Database schema (12 tabel, FK, CHECK)
├── seed.sql               # Data dummy untuk testing
├── Dockerfile             # Image untuk production (alpine, prod deps only)
├── docker-compose.yml     # Dev mode: app + MySQL + hot-reload + seed init
├── .github/workflows/     # GitHub Actions CI (Node 20/22 + MySQL service)
├── .eslint.config.js      # Flat config ESLint
├── .prettierrc            # Prettier formatting rules
├── AGENTS.md              # Konvensi & gotcha untuk AI agent
├── PLAN.md                # Roadmap & progress tracker
├── controllers/           # Business logic per resource
├── routes/                # HTTP routes
├── middleware/auth.js     # JWT auth middleware
├── sockets/chat.js        # Socket.IO chat handlers
├── views/                 # Handlebars templates
│   └── partials/          # navbar, footer, header
├── public/                # Static assets (CSS, JS, images)
├── utils/                 # Shared helpers
└── test/                  # Unit tests (node --test)
```

## Fitur Utama

### Pembeli
- 📦 Katalog produk dengan filter (kategori, ukuran, warna, harga, sorting)
- 🔍 Pencarian produk
- ❤️ Wishlist (tambah/hapus)
- 🛒 Keranjang belanja dengan varian (warna, ukuran)
- 💰 Checkout dengan saldo internal (`users.balance`)
- 💬 Chat real-time dengan penjual via Socket.IO
- ⭐ Review produk (hanya untuk *verified buyer*)

### Penjual
- 🏪 Dashboard dengan ringkasan produk & pesanan
- ➕ Tambah produk baru dengan upload multi-gambar
- ✏️ Edit harga, nama, dan stok produk
- 🗑️ Hapus produk (soft-delete jika sudah ada pesanan)
- 📦 Kelola pesanan masuk & ubah status (`pending` → `shipped` → `completed`)

### Akun
- 🔐 Register dengan bcrypt-hashed password
- 🔑 Login dengan JWT di httpOnly cookie
- 👤 Edit profil (nama, email, bio, avatar)
- 🔒 Ubah password dengan verifikasi password lama

## Tech Stack

- **Backend**: Node.js 20, Express 5, mysql2/promise
- **Real-time**: Socket.IO 4
- **Auth**: JWT (jsonwebtoken) + bcrypt
- **Templating**: Handlebars (`hbs`)
- **Validation**: Multer (file upload), express-rate-limit
- **Security**: Helmet, express-rate-limit, httpOnly cookie
- **DevOps**: Docker, GitHub Actions, ESLint, Prettier, `node --test`

## API Endpoints (Ringkasan)

| Method | Endpoint | Fungsi |
|--------|----------|--------|
| `POST` | `/auth/register` | Registrasi user baru |
| `POST` | `/auth/login` | Login (rate-limited 10/15min) |
| `GET`  | `/auth/logout` | Logout |
| `POST` | `/auth/profile/update` | Update profil + upload avatar |
| `POST` | `/auth/profile/password` | Ubah password |
| `POST` | `/auth/wishlist` | Toggle wishlist |
| `GET`  | `/allProduk?q=&page=&...` | Katalog dengan filter & pagination |
| `POST` | `/api/products/sell` | Upload produk baru |
| `PUT`  | `/api/products/:id` | Update produk (seller) |
| `DELETE` | `/api/products/:id` | Hapus produk (seller) |
| `POST` | `/api/cart/add` | Tambah ke keranjang |
| `PUT`  | `/api/cart/:id` | Update jumlah item |
| `DELETE` | `/api/cart/:id` | Hapus item |
| `POST` | `/api/checkout/process` | Proses checkout |
| `POST` | `/api/products/:productId/reviews` | Tambah review (verified buyer) |
| `PUT`  | `/api/orders/:id/status` | Update status pesanan (seller) |
| `GET`  | `/health` | Health check + DB status |

## Dokumentasi Tambahan

- 📘 **`AGENTS.md`** — Konvensi codebase, gotcha, dan invariant penting untuk AI assistant
- 📗 **`PLAN.md`** — Roadmap perbaikan dari kondisi awal sampai fitur lengkap

## Lisensi

ISC
