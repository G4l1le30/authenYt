
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const { isLoggedIn } = require('../middleware/auth');

// Authentication routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

// Wishlist routes
router.post('/wishlist', isLoggedIn, authController.toggleWishlist);
router.post('/wishlist/remove', isLoggedIn, authController.removeFromWishlist);

module.exports = router;