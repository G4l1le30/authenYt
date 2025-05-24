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
  let starsHtml = '';
  const totalStars = 5;
  let ratingValue = parseFloat(rating);

  if (isNaN(ratingValue) || ratingValue === null || ratingValue < 0) {
    for (let i = 0; i < totalStars; i++) {
        starsHtml += '<i class="bi bi-star"></i>';
    }
    starsHtml += '<span class="rating-value ms-1 text-muted small">(N/A)</span>';
    return new hbs.SafeString(starsHtml);
  }

  for (let i = 1; i <= totalStars; i++) {
    if (i <= ratingValue) {
      starsHtml += '<i class="bi bi-star-fill"></i>'; 
    } else if (i - ratingValue > 0 && i - ratingValue < 1) {
      starsHtml += '<i class="bi bi-star"></i>'; 
    } else {
      starsHtml += '<i class="bi bi-star"></i>'; 
    }
  }
  starsHtml += `<span class="rating-value ms-1">(${ratingValue.toFixed(1)}/5)</span>`;
  return new hbs.SafeString(starsHtml);
});

hbs.registerHelper('currentYear', function() { 
  return new Date().getFullYear();
});

// PINDAHKAN HELPER 'eq' KE SINI, SEJAJAR DENGAN HELPER LAIN
hbs.registerHelper('eq', function (a, b) {
  return a === b;
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

app.use('/api/cart', cartRoutes);
app.use('/', pagesRoutes);
app.use('/auth', authRoutes);

// Start server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

module.exports = pool;