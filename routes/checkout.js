const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkout');
const authMiddleware = require('../middleware/auth');

router.post('/process', authMiddleware.protect, checkoutController.processCheckout);

module.exports = router;