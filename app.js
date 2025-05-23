const express = require('express');
const app = express();
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });
const cookieParser = require('cookie-parser');
const mysql = require('mysql2/promise');  // Ganti ke mysql2 dengan promise

// Buat connection pool
const pool = mysql.createPool({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Middleware dan parsers
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Static files folder
const publicDirectory = path.join(__dirname, './public/');
app.use(express.static(publicDirectory));

// View engine setup
app.set('view engine', 'hbs');

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

// Handlebars helper
const hbs = require('hbs');
hbs.registerHelper('includes', function (array, value) {
  if (!array) return false;
  const strArray = array.map(String);
  return strArray.includes(String(value));
});

// Import routes dan middleware
const pagesRoutes = require('./routes/pages');
const authRoutes = require('./routes/auth');
const cartRoutes = require('./routes/cart');

app.use('/api/cart', cartRoutes);
app.use('/', pagesRoutes);
app.use('/auth', authRoutes);

// Start server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

module.exports = pool; // Optional, jika perlu diimport di file lain untuk query
