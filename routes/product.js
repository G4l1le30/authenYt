// routes/product.js

const express = require('express');
const router = express.Router();
const productController = require('../controllers/product'); // Pastikan path ini benar
const authMiddleware = require('../middleware/auth');     // Untuk proteksi rute

/**
 * =============================
 * PRODUCT API ROUTES
 * =============================
 * Semua rute di sini akan di-mount dengan prefix, misalnya '/api/products' di app.js
 */

// GET /api/products/:id
// Rute API untuk mengambil detail satu produk (JSON response)
router.get('/:id', productController.getProductDetail); 

// POST /api/products/sell  (atau bisa juga POST /api/products/ jika Anda anggap 'sell' adalah membuat produk baru)
// Rute API untuk memproses upload/penjualan produk baru
router.post('/sell', 
    authMiddleware.protect, // Pastikan hanya user yang login bisa upload
    productController.upload.array('images', 5), // Middleware multer untuk upload gambar
    productController.uploadProduct // Controller untuk menyimpan info produk
);

// --- Contoh Rute API Produk Lainnya (bisa Anda tambahkan di masa depan) ---

// PUT /api/products/:id 
// Untuk mengupdate produk yang sudah ada
// router.put('/:id', authMiddleware.protect, productController.updateProduct);

// DELETE /api/products/:id
// Untuk menghapus produk
// router.delete('/:id', authMiddleware.protect, productController.deleteProduct);

module.exports = router;