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
const checkoutRoutes = require('./routes/checkout');

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
      starsHtml += '<i class="bi bi-star-fill"></i>'; // Bintang penuh
    } else if (i - ratingValue > 0 && i - ratingValue < 1) { 
      // Untuk setengah bintang, bisa pakai : starsHtml += '<i class="bi bi-star-half"></i>'; 
      starsHtml += '<i class="bi bi-star"></i>'; // Saat ini bintang kosong
    } else {
      starsHtml += '<i class="bi bi-star"></i>'; // Bintang kosong
    }
  }
  starsHtml += `<span class="rating-value ms-1">(${ratingValue.toFixed(1)}/5)</span>`;
  return new hbs.SafeString(starsHtml);
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
hbs.registerHelper('join', function(arr, separator) {
  if (Array.isArray(arr)) {
    return arr.join(separator);
  }
  return '';
});

hbs.registerHelper('formatDate', function(dateString) {
  if (!dateString) {
    return '';
  }
  try {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options); // Format bahasa Indonesia
  } catch (e) {
    console.error('Error formatting date:', e);
    return dateString; // Kembalikan string asli jika ada error
  }
});
hbs.registerHelper('truncate', function (str, len) {
  if (str && str.length > len && str.length > 0) {
    let new_str = str.substr(0, len);
    new_str = str.substr(0, new_str.lastIndexOf(" "));
    new_str = (new_str.length > 0) ? new_str : str.substr(0, len);
    return new hbs.SafeString(new_str +'...'); 
  }
  return str;
});

hbs.registerHelper('gte', function (a, b, options) {
  const valA = parseFloat(a);
  const valB = parseFloat(b);
  const result = valA >= valB;

  // Cek apakah helper dipanggil sebagai block helper atau subexpression
  if (options && typeof options.fn === 'function' && typeof options.inverse === 'function') {
    // Dipanggil sebagai block helper: {{#gte a b}} ... {{else}} ... {{/gte}}
    return result ? options.fn(this) : options.inverse(this);
  } else {
    // Dipanggil sebagai subexpression: (gte a b)
    return result; // Kembalikan boolean langsung
  }
});

hbs.registerHelper('subtract', function (a, b) {
  // Pastikan operasi dilakukan sebagai angka
  const valA = parseFloat(a);
  const valB = parseFloat(b);
  if (!isNaN(valA) && !isNaN(valB)) {
    return valA - valB;
  }
  return 0; // Kembalikan 0 atau nilai default jika input tidak valid
});

hbs.registerHelper('gt', function (a, b) { // Helper 'gt'  sudah benar untuk subexpression
  const numA = parseFloat(a);
  const numB = parseFloat(b);
  if (!isNaN(numA) && !isNaN(numB)) {
    return numA > numB;
  }
  return false;
});

hbs.registerHelper('toFixed', function (number, digits) {
  if (typeof number === 'number' || (typeof number === 'string' && number.trim() !== '')) {
    return parseFloat(number).toFixed(digits);
  }
  return 'N/A'; // Atau nilai default lain
});
hbs.registerHelper('multiply', function(a, b) {
    return parseFloat(a) * parseFloat(b);
});
hbs.registerHelper('add', function(a, b) {
  return Number(a) + Number(b);
});

hbs.registerHelper('formatRupiah', function (number) {
  if (number === null || number === undefined || isNaN(parseFloat(number))) {
    return 'Rp 0'; // Atau tampilkan string kosong atau pesan lain
  }
  // Pastikan number adalah angka untuk toLocaleString
  const num = parseFloat(number);
  return new Intl.NumberFormat('id-ID', { 
    style: 'currency', 
    currency: 'IDR', 
    minimumFractionDigits: 0, // Tidak menampilkan desimal jika 00
    maximumFractionDigits: 2  // Maksimal 2 desimal jika ada
  }).format(num);
});
hbs.registerHelper('hasUserReviewed', function (reviews, userId) { // Hapus 'options' dari parameter
    if (!reviews || !Array.isArray(reviews) || userId === undefined || userId === null) {
        return false; // Data tidak valid atau pengguna tidak login, anggap belum mereview
    }
    for (let i = 0; i < reviews.length; i++) {
        if (reviews[i] && String(reviews[i].reviewer_id) === String(userId)) {
            return true; // Pengguna sudah mereview
        }
    }
    return false; // Pengguna belum mereview
});

//kalo produk kosong
hbs.registerHelper('hasProblematicItems', function (cartItems, options) {
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
        // Jika tidak ada item, atau bukan array, anggap tidak ada masalah
        // Jika dipanggil sebagai block helper, render 'else' block
        return options && options.inverse ? options.inverse(this) : false;
    }

    for (let i = 0; i < cartItems.length; i++) {
        // Cek berdasarkan properti 'hasIssue' atau 'errorMessage'
        // Sesuaikan dengan properti yang Anda set di backend (fetchUserCartDetails)
        if (cartItems[i] && (cartItems[i].hasIssue === true || (cartItems[i].errorMessage && cartItems[i].errorMessage.length > 0))) {
            // Ditemukan item bermasalah
            // Jika dipanggil sebagai block helper, render 'if' block
            return options && options.fn ? options.fn(this) : true;
        }
    }

    // Tidak ada item bermasalah
    // Jika dipanggil sebagai block helper, render 'else' block
    return options && options.inverse ? options.inverse(this) : false;
});
// ===
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
app.use('/api', authRoutes); 

app.use('/api/products', productApiRoutes); // Jika productApiRoutes untuk /:id/reviews juga, maka reviewApiRoutes tidak perlu prefix /api/products lagi
app.use('/api', reviewApiRoutes);          // <-- DAFTARKAN INI. Endpoint menjadi /api/products/:productId/reviews


app.use('/api/cart', cartRoutes);
app.use('/', pagesRoutes);
app.use('/auth', authRoutes);


//checkout
app.use('/api/checkout', checkoutRoutes);
//order 
hbs.registerHelper('nl2br', function(text) {
    if (typeof text === 'string') {
        const escapedText = hbs.Utils.escapeExpression(text); // Escape HTML dulu
        return new hbs.SafeString(escapedText.replace(/(\r\n|\n|\r)/gm, '<br>'));
    }
    return '';
});
// Start server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

module.exports = pool;