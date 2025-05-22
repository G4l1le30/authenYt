const express = require('express');
const router = express.Router();
const mysql = require('mysql');

const authMiddleware = require('../middleware/auth');
const authController = require('../controllers/auth');
const productController = require('../controllers/product');

// MySQL connection setup
const db = mysql.createConnection({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE
});

// Apply middleware to inject user for all routes
router.use(authMiddleware.getUser);

// Home page route
router.get('/', (req, res) => {
  db.query('SELECT * FROM products', (err, products) => {
    if (err) return res.render('index', { products: [] });

    if (!req.user) {
      return res.render('index', { products, wishlistProductIds: [] });
    }

    const userId = req.user.id;
    db.query('SELECT product_id FROM wishlist WHERE user_id = ?', [userId], (err2, wishlistRows) => {
      if (err2) return res.render('index', { products, wishlistProductIds: [] });

      const wishlistProductIds = wishlistRows.map(row => row.product_id);
      res.render('index', { products, wishlistProductIds });
    });
  });
});

// All products page
router.get('/allProduk', (req, res) => {
  db.query('SELECT * FROM products', (err, products) => {
    if (err) return res.render('allProduk', { products: [] });

    if (!req.user) {
      return res.render('allProduk', { products, wishlistProductIds: [] });
    }

    const userId = req.user.id;
    db.query('SELECT product_id FROM wishlist WHERE user_id = ?', [userId], (err2, wishlistRows) => {
      if (err2) return res.render('allProduk', { products, wishlistProductIds: [] });

      const wishlistProductIds = wishlistRows.map(row => row.product_id.toString());
      res.render('allProduk', { products, wishlistProductIds, user: req.user });
    });
  });
});

// Auth pages
router.get('/register', (req, res) => {
  res.render('register');
});

router.get('/login', (req, res) => {
  res.render('login');
});

// Dashboard (protected route)
router.get('/dashboard', authMiddleware.protect, authController.getWishlist);

// Wishlist toggle (protected API)
router.post('/api/wishlist/toggle', authMiddleware.protect, productController.toggleWishlist);

// Product detail API (JSON)
router.get('/api/product/:id', productController.getProductDetail);

// Product detail render (HTML)
router.get('/product/:id', productController.showProductDetailPage);

<<<<<<< HEAD
// Sell page (upload product form)
router.get('/sell', authMiddleware.protect, (req, res) => {
  res.render('sell', { user: req.user });
});

// Handle product upload (form submission)
router.post('/sell', authMiddleware.protect, productController.uploadProduct);

=======

>>>>>>> 3629e9e47ad51d94603c983fb545bc36485ac248
module.exports = router;
