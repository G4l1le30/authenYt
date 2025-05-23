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
exports.getUser = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      res.locals.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [decoded.id]);
    if (rows.length === 0) {
      res.locals.user = null;
      return next();
    }

    res.locals.user = rows[0];
    next();
  } catch (error) {
    console.log('Auth getUser error:', error);
    res.locals.user = null;
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
