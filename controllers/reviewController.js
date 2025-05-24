// controllers/reviewController.js
const pool = require('../db'); 
exports.addReview = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Anda harus login untuk memberikan ulasan.' });
    }

    const { rating, review_text } = req.body;
    const productId = req.params.productId; // Ambil productId dari parameter URL
    const userId = req.user.id;

    // Validasi dasar
    const numericRating = parseInt(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
        return res.status(400).json({ success: false, message: 'Rating harus berupa angka antara 1 dan 5.' });
    }
    if (review_text && review_text.length > 1000) {
        return res.status(400).json({ success: false, message: 'Ulasan terlalu panjang (maksimal 1000 karakter).' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Simpan ulasan baru ke tabel 'reviews'
        // Periksa apakah user sudah pernah mereview produk ini sebelumnya (opsional, tergantung kebijakan Anda)
        // kalau mau user hanya bisa mereview satu kali per produk, tambahkan logika cek di sini.
        // Untuk sekarang, kita izinkan multiple reviews dari user yang sama untuk produk yang sama.

        const [reviewResult] = await connection.query(
            'INSERT INTO reviews (product_id, user_id, rating, review_text) VALUES (?, ?, ?, ?)',
            [productId, userId, numericRating, review_text || null]
        );
        console.log('[REVIEW CONTROLLER] Review inserted, ID:', reviewResult.insertId);

        // 2. Hitung ulang rata-rata rating dan jumlah review untuk produk ini
        const [productStatsRows] = await connection.query( // Ganti nama variabel agar tidak konflik
            'SELECT AVG(rating) as averageRating, COUNT(*) as reviewCount FROM reviews WHERE product_id = ?',
            [productId]
        );
        
        let averageRating = 0;
        let reviewCount = 0;
        if (productStatsRows.length > 0 && productStatsRows[0].averageRating !== null) {
            averageRating = parseFloat(productStatsRows[0].averageRating).toFixed(1);
            reviewCount = productStatsRows[0].reviewCount;
        }
        console.log(`[REVIEW CONTROLLER] Product ID ${productId} new stats - AvgRating: ${averageRating}, ReviewCount: ${reviewCount}`);
        
        // 3. Update tabel 'products' dengan rating baru dan jumlah review
        await connection.query(
            'UPDATE products SET rating = ?, review_count = ? WHERE id = ?',
            [averageRating, reviewCount, productId]
        );
        console.log(`[REVIEW CONTROLLER] Product ID ${productId} updated in products table.`);
        
        // (Opsional Lanjutan - Update Rating Penjual)
        // ... (logika update rating penjual jika diperlukan) ...

        await connection.commit();
        console.log('[REVIEW CONTROLLER] Transaction committed.');

        res.status(201).json({ success: true, message: 'Ulasan berhasil dikirim!' });

    } catch (error) {
        if (connection) {
            console.log('[REVIEW CONTROLLER] Rolling back transaction due to error.');
            await connection.rollback();
        }
        console.error('Error adding review:', error);
        res.status(500).json({ success: false, message: 'Gagal menyimpan ulasan. Terjadi kesalahan server.' });
    } finally {
        if (connection) {
            console.log('[REVIEW CONTROLLER] Releasing database connection.');
            connection.release();
        }
    }
};

// bisa ditambain fungsi lain terkait review di sini di masa depan,
// misalnya getReviewsByProduct, deleteReview, updateReview, dll.