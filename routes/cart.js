// routes/cart.js
const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cart');
const { protect } = require('../middleware/auth');  // assuming you have auth middleware

// Add product to cart
router.post('/add', protect, cartController.addToCart);

// Get cart items for logged-in user
//router.get('/', protect, cartController.getCart);

// Update cart item quantity
router.put('/:id', protect, cartController.updateCartItem);

// Delete cart item
router.delete('/:id', protect, cartController.deleteCartItem);

module.exports = router;
