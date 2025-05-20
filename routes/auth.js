const express = require('express');
const authController = require('../controllers/auth');
const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

// Wishlist routes
router.post('/wishlist', authController.addToWishlist);
router.delete('/wishlist/:id', authController.removeFromWishlist);
router.get('/wishlist', authController.getWishlist);

module.exports = router;