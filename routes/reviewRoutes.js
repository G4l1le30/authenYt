// routes/reviewRoutes.js
const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController'); // Panggil reviewController
const authMiddleware = require('../middleware/auth'); // Untuk proteksi

// Route API untuk menambah ulasan baru ke produk
// Path akan menjadi /api/reviews/product/:productId/new (contoh)
// atau /api/products/:productId/reviews seperti yang kita diskusikan
// Kita akan gunakan yang kedua agar konsisten dengan panggilan fetch Anda

// POST /api/products/:productId/reviews
router.post('/products/:productId/reviews', authMiddleware.protect, reviewController.addReview);


module.exports = router;