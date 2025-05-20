const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const authController = require('../controllers/auth');
const authMiddleware = require('../middleware/auth');
const { isLoggedIn, checkUser } = require('../middleware/auth');

// Apply middleware to retrieve user for all routes
router.use(authMiddleware.getUser);
// Apply middleware to check user status and get user data
router.use(checkUser);
router.use(authController.getUserData);
router.use(authController.getWishlist);

// Homepage route
router.get('/', async (req, res) => {
  try {
    // Get all products with categories
    const [products] = await pool.query(`
      SELECT p.*, c.name as category_name 
      FROM products p
      JOIN categories c ON p.category_id = c.id
    `);
    
    // If user is logged in, mark products in user's wishlist
    if (req.user) {
      const [wishlistItems] = await pool.query(
        'SELECT product_id FROM wishlist WHERE user_id = ?', 
        [req.user.id]
      );
      
      const wishlistProductIds = wishlistItems.map(item => item.product_id);
      
      // Add inWishlist flag to each product
      products.forEach(product => {
        product.inWishlist = wishlistProductIds.includes(product.id);
      });
    }
    
    res.render('index', { 
      products,
      user: req.userData
    });
  } catch (error) {
    console.error(error);
    res.render('index', { message: 'Error loading products' });
  }
});

// Dashboard route (protected)
router.get('/dashboard', isLoggedIn, async (req, res) => {
  try {
    res.render('dashboard', { 
      user: req.userData,
      wishlist: req.wishlist
    });
  } catch (error) {
    console.error(error);
    res.render('dashboard', { 
      user: req.userData,
      wishlist: [],
      message: 'Error loading dashboard' 
    });
  }
});
router.get('/register', (req, res) => {
    res.render('register');
});

router.get('/login', (req, res) => {
    res.render('login');
});


module.exports = router;