const express = require('express');
const router = express.Router();
//const mysql = require('mysql');
const pool=require('../db')
// Middleware dan Controller
const authMiddleware = require('../middleware/auth');
const authController = require('../controllers/auth');
const productController = require('../controllers/product');
const cartController = require('../controllers/cart');

// MySQL Connection
/*
const db = mysql.createConnection({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE
});
*/
// Middleware untuk attach user jika login
router.use(authMiddleware.getUser);

/**
 * ====================
 *      PUBLIC ROUTES
 * ====================
 */

// Homepage - daftar produk + wishlist jika login
router.get('/', async (req, res) => {
    try {
        // 1. Fetch New Arrivals Products (dengan rating)
        const [newArrivalProducts] = await pool.query(
            'SELECT id, name, price, image_url, rating FROM products ORDER BY created_at DESC LIMIT 8'
        );

        // 2. Fetch Top Sellers (berdasarkan rata-rata rating produk mereka)
        const [topSellers] = await pool.query(`
            SELECT 
                u.id, 
                u.name, 
                u.profile_image_url, 
                AVG(p.rating) as average_seller_rating,
                COUNT(p.id) as product_count 
            FROM users u 
            JOIN products p ON u.id = p.user_id 
            WHERE p.rating IS NOT NULL
            GROUP BY u.id 
            HAVING COUNT(p.id) > 0
            ORDER BY average_seller_rating DESC 
            LIMIT 4
        `);

        // 3. Fetch Dress Styles
        const [dressStyles] = await pool.query(
            'SELECT id, name, image_url, slug FROM styles ORDER BY id'
        );

        // ==============================================================
        // DEBUGGING LOGS SEBELUM RENDER (PENEMPATAN YANG BENAR)
        // ==============================================================
        console.log('[ROUTE /] req.user sebelum render (jika ada dari ensureAuth/isLoggedIn):', req.user); 
        console.log('[ROUTE /] res.locals.user sebelum render (dari getUser middleware):', res.locals.user);

        // HANYA SATU KALI PANGGILAN res.render untuk route ini
        res.render('index', {
            products: newArrivalProducts,        // Untuk New Arrivals
            top_sellers: topSellers,            // Untuk Top Sellers
            dress_styles: dressStyles,          // Untuk Browse by Dress Style
            user: req.user                      // Mengirimkan req.user (yang mungkin diisi oleh ensureAuth atau undefined)
                                                // atau bisa juga user: res.locals.user jika Anda mau eksplisit mengambil dari sana
                                                // Jika authMiddleware.getUser sudah jalan, 'user' juga sudah ada di res.locals
                                                // dan akan otomatis tersedia di template.
        });
        // ==============================================================

    } catch (error) {
        console.error("Error fetching data for homepage:", error);
        // Pertimbangkan untuk merender halaman error yang lebih baik
        res.status(500).render('500', { user: req.user, message: 'Failed to load homepage data.'}); // Kirim user juga ke halaman error
    }
    // HAPUS console.log dan res.render yang ada di sini sebelumnya, karena sudah ada di dalam blok try
});

// routes/pages.js
router.get('/seller/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const [sellerRows] = await pool.query(
            'SELECT id, name, email, profile_image_url, bio FROM users WHERE id = ?',
            [userId]
        );
        
        if (sellerRows.length === 0) {
            // Jika user tidak ditemukan, render halaman 404
            // Tambahkan req.user agar navbar tetap bisa render jika ada
            return res.status(404).render('404', { user: req.user, message: 'Seller not found.' });
        }
        const seller = sellerRows[0];

        const [productsByThisSeller] = await pool.query(
            'SELECT id, name, price, image_url, description, stock, rating FROM products WHERE user_id = ? ORDER BY created_at DESC', 
            [userId] 
        );
            
        res.render('sellerProfile', {
            profile_user: seller,
            seller_products: productsByThisSeller, // PERBAIKI DI SINI
            user: req.user
        });

    } catch (error) {
        console.error('Error fetching seller profile:', error); // Cetak error yang sebenarnya
        // Jika terjadi error lain, render halaman 500
        // Tambahkan req.user agar navbar tetap bisa render jika ada
        res.status(500).render('500', { user: req.user, message: 'Error loading seller profile.' });
    }
});
// Halaman semua produk
router.get('/allProduk', async (req, res) => {
  try {
// Ganti menjadi:
const [products] = await pool.query('SELECT id, name, price, image_url, description, stock, rating FROM products'); // Tambahkan rating
    let wishlistProductIds = [];

    if (req.user) {
      const [wishlistRows] = await pool.query('SELECT product_id FROM wishlist WHERE user_id = ?', [req.user.id]);
      wishlistProductIds = wishlistRows.map(r => r.product_id.toString());
    }

    res.render('allProduk', { products, wishlistProductIds, user: req.user });
  } catch (err) {
    console.error(err);
    res.render('allProduk', { products: [], wishlistProductIds: [] });
  }
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
router.get('/dashboard', authMiddleware.ensureAuth, authController.getDashboard);

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

/**
 * ====================
 *      PRODUCT ROUTES
 * ====================
 */

// Rute untuk menerima form produk yang di-upload

// Tambahkan multer upload middleware ke route POST /sell
router.get('/sell', authMiddleware.protect, async (req, res) => {
  // Ambil kategori dari DB pakai db.js mysql2 (async/await)
  try {
    const [categories] = await require('../db').query('SELECT * FROM categories');
    res.render('sell', { categories, user: req.user });
  } catch (err) {
    console.error(err);
    res.render('sell', { categories: [], user: req.user, error: 'Failed to load categories' });
  }
});

router.post('/sell', authMiddleware.protect, productController.upload.array('images', 5), productController.uploadProduct);


module.exports = router;
