const jwt = require('jsonwebtoken');
const pool = require('../db');  // pastikan app.js export pool dengan benar

// Middleware cek apakah user sudah login dan inject data user ke req.user
exports.isLoggedIn = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;
    if (!token) return res.redirect('/login');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Query user dari database dengan promise
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [decoded.id]);
    if (rows.length === 0) return res.redirect('/login');

    req.user = rows[0];
    next();
  } catch (error) {
    console.log('Auth isLoggedIn error:', error);
    return res.redirect('/login');
  }
};

// Middleware untuk inject data user ke template/view (res.locals.user)
// middleware/auth.js
exports.getUser = async (req, res, next) => {
  //console.log(`[AUTH MIDDLEWARE - getUser] Path: ${req.path}`); // Log path yang diakses
  try {
    const token = req.cookies.jwt;
    //console.log(`[AUTH MIDDLEWARE - getUser] Token from cookie: ${token ? 'Ada Token' : 'Tidak Ada Token'}`); // Cek token

    if (!token || token === 'logout') { // Tambahkan pengecekan 'logout' jika Anda mengaturnya seperti itu
      //console.log('[AUTH MIDDLEWARE - getUser] No valid token, setting res.locals.user to null.');
      res.locals.user = null;
      return next();
    }

    //console.log('[AUTH MIDDLEWARE - getUser] Verifying token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    //console.log('[AUTH MIDDLEWARE - getUser] Token decoded. User ID:', decoded.id);

    const [rows] = await pool.query('SELECT id, name, email, profile_image_url, balance FROM users WHERE id = ?', [decoded.id]); // Ambil kolom yang relevan
    if (rows.length === 0) {
      //console.log('[AUTH MIDDLEWARE - getUser] User not found in DB for ID:', decoded.id, '- Setting res.locals.user to null.');
      res.locals.user = null;
      req.user=null;
      return next();
    }

    //console.log('[AUTH MIDDLEWARE - getUser] User found in DB. Setting res.locals.user:', rows[0].name);
    res.locals.user = rows[0];
     req.user = rows[0];
    next();
  } catch (error) {
    // Kesalahan pada jwt.verify (misalnya token expired, signature salah) akan masuk ke sini
    /*console.error('[AUTH MIDDLEWARE - getUser] Error:', error.message);
    console.log('[AUTH MIDDLEWARE - getUser] Error occurred, setting res.locals.user to null.');
    */
    res.locals.user = null;
    req.user = null;
    next();
  }
};
// Middleware untuk proteksi route (harus login)
exports.ensureAuth = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;
    if (!token) return res.redirect('/login');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [decoded.id]);
    if (rows.length === 0) return res.redirect('/login');

    req.user = rows[0];
    next();
  } catch (error) {
    console.log('Auth ensureAuth error:', error);
    return res.redirect('/login');
  }
};

exports.protect = exports.ensureAuth;
