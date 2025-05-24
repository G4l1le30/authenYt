// app.js
const express = require('express');
const app = express();
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });
const cookieParser = require('cookie-parser');
const hbs = require('hbs');
const pool = require('./db');  // pool MySQL2 promise
const authMiddleware = require('./middleware/auth');
const productApiRoutes = require('./routes/product');

// Middleware dan parsers
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Static files folder
const publicDirectory = path.join(__dirname, './public/');
app.use(express.static(publicDirectory));

// View engine setup
const viewsPath = path.join(__dirname, './views'); 
const partialsPath = path.join(__dirname, './views/partials'); 

app.set('view engine', 'hbs');
app.set('views', viewsPath); 
hbs.registerPartials(partialsPath); 

// Handlebars helper

hbs.registerHelper('includes', function (array, value) {
  if (!array) return false;
  const strArray = array.map(String);
  return strArray.includes(String(value));
});

hbs.registerHelper('generateStars', function(rating) {
  // ... (kode generateStars Anda) ...
});

hbs.registerHelper('currentYear', function() { 
  return new Date().getFullYear();
});

hbs.registerHelper('eq', function (a, b) {
  return a === b;
});
hbs.registerHelper('neq', function (a, b) {
  return a !== b;
});

// TAMBAHKAN HELPER INI:
hbs.registerHelper('gt', function (a, b) {
  // Pastikan kita membandingkan angka jika memungkinkan
  const numA = parseFloat(a);
  const numB = parseFloat(b);
  if (!isNaN(numA) && !isNaN(numB)) {
    return numA > numB;
  }
  return false; // Default jika bukan angka atau salah satunya bukan angka
});

// Test koneksi database (async/await)
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('MySQL connected');
    conn.release();
  } catch (err) {
    console.error('Database connection failed:', err);
  }
}
testConnection();

// Inject user ke semua views (buat akses user di hbs via {{user}})
app.use(authMiddleware.getUser);

// Import routes dan middleware
const pagesRoutes = require('./routes/pages');
const authRoutes = require('./routes/auth');
const cartRoutes = require('./routes/cart');
const reviewApiRoutes = require('./routes/reviewRoutes'); 
// Daftarkan Rute

app.use('/api/products', productApiRoutes); // Jika productApiRoutes untuk /:id/reviews juga, maka reviewApiRoutes tidak perlu prefix /api/products lagi
app.use('/api', reviewApiRoutes);          // <-- DAFTARKAN INI. Endpoint menjadi /api/products/:productId/reviews


app.use('/api/cart', cartRoutes);
app.use('/', pagesRoutes);
app.use('/auth', authRoutes);

// Start server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

module.exports = pool;