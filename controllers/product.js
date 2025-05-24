const dotenv = require('dotenv')
const mysql=require('mysql')
const db = require('../db')
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Setup multer untuk upload gambar produk
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../public/img/uploaded');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
exports.upload = multer({ storage: storage });



// Ambil semua produk lengkap thumbnail (async/await)
exports.getAllProducts = async (req, res) => {
  try {
    const [products] = await db.query(`
      SELECT p.*, c.name AS category_name 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
    `);
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error');
  }
};

exports.uploadProduct = async (req, res) => {
  try {
    const userId = req.user.id; // Dari middleware auth
    const { name, price, description, stock, category_id } = req.body;
    const files = req.files;

    if (!name || !price || !category_id || !stock) {
      return res.status(400).json({ error: 'Name, price, category and stock are required' });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'At least one product image is required' });
    }

    // Simpan produk, set image_url ke gambar pertama
    const mainImageUrl = '/img/uploaded/' + files[0].filename;

    // Tambahkan user_id di query INSERT
    const [result] = await db.query(
      `INSERT INTO products (name, price, description, stock, category_id, image_url, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, price, description, stock, category_id, mainImageUrl, userId]
    );

    const productId = result.insertId;

    // Simpan gambar produk lain ke product_images
    const imagePromises = files.map(file => {
      const url = '/img/uploaded/' + file.filename;
      return db.query(`INSERT INTO product_images (product_id, image_url) VALUES (?, ?)`, [productId, url]);
    });

    await Promise.all(imagePromises);

    res.status(201).json({ message: 'Product uploaded successfully', productId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload product' });
  }
};


// Ambil detail produk lengkap dengan semua gambar (API JSON) - PERBAIKI INI
exports.getProductDetail = async (req, res) => { // Jadikan async
    const productId = req.params.id;
    try {
        const sqlProduct = `
            SELECT p.*, c.name AS category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = ?
        `;
        const [productRows] = await db.query(sqlProduct, [productId]); // Gunakan await db.query

        if (productRows.length === 0) {
            return res.status(404).json({ message: 'Product not found' }); // Kirim JSON error
        }

        const product = productRows[0];

        const sqlImages = `SELECT image_url FROM product_images WHERE product_id = ?`;
        const [images] = await db.query(sqlImages, [productId]); // Gunakan await db.query
        
        product.images = images;
        res.json(product); // Kirim JSON sukses

    } catch (error) {
        console.error('Error in getProductDetail API:', error);
        res.status(500).json({ message: 'Database error or internal server error' }); // Kirim JSON error
    }
};
// Toggle Wishlist (jika masih ada atau sebagai referensi) - PERBAIKI INI
exports.toggleWishlist = async (req, res) => { // Jadikan async
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = req.user.id;
    // Pastikan nama properti di body sesuai dengan yang dikirim klien
    // Jika klien mengirim { productId: ... }, maka di sini const { productId } = req.body;
    // Jika klien mengirim { product_id: ...}, maka const { product_id: productId } = req.body; atau ambil langsung product_id
    const { product_id: productId } = req.body; // Mengambil product_id dan menamainya productId

    if (!productId) {
        return res.status(400).json({ message: 'Product ID is required' });
    }

    try {
        const checkQuery = 'SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?';
        const [existing] = await db.query(checkQuery, [userId, productId]);

        if (existing.length > 0) {
            const deleteQuery = 'DELETE FROM wishlist WHERE user_id = ? AND product_id = ?';
            await db.query(deleteQuery, [userId, productId]);
            return res.json({ success: true, inWishlist: false, message: 'Dihapus dari wishlist' }); // Kirim status baru
        } else {
            const insertQuery = 'INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)';
            await db.query(insertQuery, [userId, productId]);
            return res.json({ success: true, inWishlist: true, message: 'Berhasil ditambahkan ke wishlist!' }); // Kirim status baru
        }
    } catch (error) {
        console.error('Error toggling wishlist:', error);
        return res.status(500).json({ success: false, message: 'Database error while toggling wishlist' });
    }
};

// controllers/product.js


exports.showProductDetailPage = async (req, res) => {
    try {
        const productId = req.params.id;
        const loggedInUser = req.user;

        // Ambil detail produk
        const [productRows] = await db.query(`
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            WHERE p.id = ?
        `, [productId]);

        if (productRows.length === 0) {
            return res.status(404).render('404', { user: loggedInUser, message: 'Product not found.' });
        }
        const product = productRows[0];

        // Ambil semua gambar untuk produk ini
        const [images] = await db.query('SELECT image_url FROM product_images WHERE product_id = ?', [productId]);
        product.images = images;

        let isWishlisted = false;
        if (loggedInUser) {
            const [wishlistCheck] = await db.query(
                'SELECT * FROM wishlist WHERE user_id = ? AND product_id = ?',
                [loggedInUser.id, productId]
            );
            if (wishlistCheck.length > 0) {
                isWishlisted = true;
            }
        }

        // === AMBIL DAFTAR ULASAN UNTUK PRODUK INI ===
        const [reviews] = await db.query(`
            SELECT r.rating, r.review_text, r.created_at, u.name as reviewer_name 
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.product_id = ?
            ORDER BY r.created_at DESC 
        `, [productId]);
        // ============================================
        
        res.render('singleProduct', {
            product: product,
            isWishlisted: isWishlisted,
            reviews: reviews, // <-- KIRIM DATA ULASAN KE TEMPLATE
            user: loggedInUser 
        });

    } catch (error) {
        console.error('Error fetching product detail page:', error);
        res.status(500).render('500', { user: req.user, message: 'Error loading product details.' });
    }
};
/*
// Add this to your product.js controller
exports.uploadProduct = (req, res) => {
    // Your product upload logic here
    console.log('Upload product functionality');
    res.status(200).json({ message: 'Product upload endpoint' });

    // Example implementation:
   
    const { name, price, description } = req.body;
    const userId = req.user.id; // From auth middleware

    const sql = 'INSERT INTO products (name, price, description, user_id) VALUES (?, ?, ?, ?)';
    db.query(sql, [name, price, description, userId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.status(201).json({ message: 'Product created', productId: result.insertId });
    });
};
    */