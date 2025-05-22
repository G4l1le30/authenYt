const express = require('express');
const router = express.Router();
const mysql = require('mysql');

// Middleware dan Controller
const authMiddleware = require('../middleware/auth');
const authController = require('../controllers/auth');
const productController = require('../controllers/product');
const cartController = require('../controllers/cart');

// MySQL Connection
const db = mysql.createConnection({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE
});

// Middleware untuk attach user jika login
router.use(authMiddleware.getUser);

/**
 * ====================
 *      PUBLIC ROUTES
 * ====================
 */

// Homepage - daftar produk + wishlist jika login
router.get('/', (req, res) => {
  db.query('SELECT * FROM products', (err, products) => {
    if (err) return res.render('index', { products: [], wishlistProductIds: [] });

    if (!req.user) {
      return res.render('index', { products, wishlistProductIds: [] });
    }

    db.query('SELECT product_id FROM wishlist WHERE user_id = ?', [req.user.id], (err2, wishlistRows) => {
      if (err2) return res.render('index', { products, wishlistProductIds: [] });

      const wishlistProductIds = wishlistRows.map(r => r.product_id.toString());
      res.render('index', { products, wishlistProductIds });
    });
  });
});

// Halaman semua produk
router.get('/allProduk', (req, res) => {
  db.query('SELECT * FROM products', (err, products) => {
    if (err) return res.render('allProduk', { products: [], wishlistProductIds: [] });

    if (!req.user) {
      return res.render('allProduk', { products, wishlistProductIds: [] });
    }

    db.query('SELECT product_id FROM wishlist WHERE user_id = ?', [req.user.id], (err2, wishlistRows) => {
      if (err2) return res.render('allProduk', { products, wishlistProductIds: [] });

      const wishlistProductIds = wishlistRows.map(r => r.product_id.toString());
      res.render('allProduk', { products, wishlistProductIds, user: req.user });
    });
  });
});

// Auth pages
router.get('/register', (req, res) => res.render('register'));
router.get('/login', (req, res) => res.render('login'));

/**
 * ====================
 *      PROTECTED ROUTES
 * ====================
 */

// Wishlist dashboard
router.get('/dashboard', authMiddleware.ensureAuth, authController.getWishlist);

// Toggle wishlist
router.post('/api/wishlist/toggle', authMiddleware.ensureAuth, productController.toggleWishlist);

/**
 * ====================
 *      PRODUCT ROUTES
 * ====================
 */

// API untuk ambil detail produk (JSON)
router.get('/api/product/:id', productController.getProductDetail);

// Halaman detail produk
router.get('/product/:id', productController.showProductDetailPage);

/**
 * ====================
 *      CART ROUTES
 * ====================
 */

// Tambah ke cart
router.post('/api/cart/add', authMiddleware.protect, cartController.addToCart);

// Tampilkan isi cart
router.get('/cart', authMiddleware.protect, cartController.getCart);

// Update item cart
router.put('/api/cart/:id', authMiddleware.protect, cartController.updateCartItem);

// Hapus item cart
router.delete('/api/cart/:id', authMiddleware.protect, cartController.deleteCartItem);

module.exports = router;
