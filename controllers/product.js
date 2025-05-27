// controllers/product.js
const pool = require('../db');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Impor konfigurasi dan fungsi helper dari utils
const {
    PREDEFINED_COLORS_CONFIG,
    PREDEFINED_SIZES,
    getColorDetails
} = require('../utils/productOptions.js'); // Pastikan path ini benar

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
    cb(null, `product-${uniqueSuffix}${ext}`);
  }
});

function checkFileType(req, file, cb) {
    if (!file || typeof file.originalname !== 'string') {
        return cb(new Error('Filename is invalid or no file selected.'));
    }
    const filetypes = /jpeg|jpg|png|gif/;
    const extnameValid = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetypeValid = filetypes.test(file.mimetype);

    if (mimetypeValid && extnameValid) {
        return cb(null, true);
    } else {
        cb(new Error('Error: Images Only! (jpeg, jpg, png, gif)'));
    }
}

exports.upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 2 }, // Batas file 2MB
    fileFilter: checkFileType
});

// Ambil semua produk (biasanya untuk API atau halaman admin)
exports.getAllProducts = async (req, res) => {
  try {
    const [products] = await pool.query(`
      SELECT p.*, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.created_at DESC
    `);
    res.json(products);
  } catch (err) {
    console.error('Error in getAllProducts:', err);
    res.status(500).json({ message: 'Database error while fetching all products.' });
  }
};

// Proses upload produk baru
exports.uploadProduct = async (req, res) => {
    if (!req.user) {
        return res.status(401).redirect('/login');
    }

    let connection;
    try {
        const userId = req.user.id;
        let { name, price, description, stock, category_id, style_id, available_colors, available_sizes } = req.body;
        const files = req.files;

        if (Array.isArray(available_colors)) {
            available_colors = available_colors.join(',');
        }
        if (Array.isArray(available_sizes)) {
            available_sizes = available_sizes.join(',');
        }

        let categories = [];
        let styles = [];
        try {
            [categories] = await pool.query('SELECT * FROM categories ORDER BY name');
            [styles] = await pool.query('SELECT * FROM styles ORDER BY name');
        } catch(dbError) {
            console.error('Error fetching categories/styles for sell page during validation:', dbError);
        }

        // Menggunakan PREDEFINED_COLORS_CONFIG dan PREDEFINED_SIZES dari utils
        const predefinedColorsForSell = PREDEFINED_COLORS_CONFIG.map(color => ({
            ...color,
            name_dashed_lowercase: color.name.toLowerCase().replace(/\s+/g, '-'),
            isSelected: (available_colors || '').split(',').map(c => c.trim()).includes(color.name)
        }));
        const predefinedSizesForSell = PREDEFINED_SIZES.map(size => ({
            name: size,
            name_dashed_lowercase: size.toLowerCase().replace(/\s+/g, '-'),
            isSelected: (available_sizes || '').split(',').map(s => s.trim()).includes(size)
        }));

        if (!name || !price || !category_id || !stock || !style_id) {
            return res.status(400).render('sell', {
                categories, styles,
                availableColorsList: predefinedColorsForSell,
                availableSizesList: predefinedSizesForSell,
                user: req.user, currentValues: req.body,
                message: { type: 'danger', text: 'Name, price, category, style, and stock are required.' }
            });
        }
        if (!files || files.length === 0) {
             return res.status(400).render('sell', {
                categories, styles,
                availableColorsList: predefinedColorsForSell,
                availableSizesList: predefinedSizesForSell,
                user: req.user, currentValues: req.body,
                message: { type: 'danger', text: 'At least one product image is required.' }
            });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        const mainImageUrl = '/img/uploaded/' + files[0].filename;

        const [result] = await connection.query(
            `INSERT INTO products (name, price, description, stock, category_id, style_id, available_colors, available_sizes, image_url, user_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, parseFloat(price), description || null, parseInt(stock), parseInt(category_id), parseInt(style_id), available_colors || null, available_sizes || null, mainImageUrl, userId]
        );
        const productId = result.insertId;

        if (files.length > 0) {
            const imagePromises = files.map(file => {
                const url = '/img/uploaded/' + file.filename;
                return connection.query(`INSERT INTO product_images (product_id, image_url) VALUES (?, ?)`, [productId, url]);
            });
            await Promise.all(imagePromises);
        }

        await connection.commit();
        if (req.session && req.session.sellFormValues) { // Hapus form values dari session setelah berhasil
            req.session.sellFormValues = null;
        }
        res.redirect(`/product/${productId}?status=uploaded`);

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error uploading product:', error);

        let categories = [];
        let styles = [];
        try {
            [categories] = await pool.query('SELECT * FROM categories ORDER BY name');
            [styles] = await pool.query('SELECT * FROM styles ORDER BY name');
        } catch(dbErrorForCatch) {
            console.error('Error fetching categories/styles for error rendering in uploadProduct:', dbErrorForCatch);
        }

        const available_colors_from_body = req.body.available_colors;
        const available_sizes_from_body = req.body.available_sizes;

        const predefinedColorsForError = PREDEFINED_COLORS_CONFIG.map(color => ({
            ...color,
            name_dashed_lowercase: color.name.toLowerCase().replace(/\s+/g, '-'),
            isSelected: (Array.isArray(available_colors_from_body) ? available_colors_from_body.includes(color.name) : (available_colors_from_body || '').split(',').map(c=>c.trim()).includes(color.name))
        }));
        const predefinedSizesForError = PREDEFINED_SIZES.map(size => ({
            name: size,
            name_dashed_lowercase: size.toLowerCase().replace(/\s+/g, '-'),
            isSelected: (Array.isArray(available_sizes_from_body) ? available_sizes_from_body.includes(size) : (available_sizes_from_body || '').split(',').map(s=>s.trim()).includes(size))
        }));

        let errorMessage = 'Failed to upload product. Please try again.';
        if (error.message && error.message.startsWith('Error: Images Only!')) {
            errorMessage = error.message;
        } else if (error.code === 'LIMIT_FILE_SIZE') {
            errorMessage = 'File is too large. Maximum size is 2MB.';
        }

        res.status(error.message && error.message.includes('Images Only') ? 400 : 500).render('sell', {
            categories, styles,
            availableColorsList: predefinedColorsForError,
            availableSizesList: predefinedSizesForError,
            user: req.user, currentValues: req.body,
            message: { type: 'danger', text: errorMessage }
        });
    } finally {
        if (connection) connection.release();
    }
};

// Ambil detail produk untuk API (JSON response)
exports.getProductDetail = async (req, res) => {
    const productId = req.params.id;
    try {
        const sqlProduct = `
            SELECT p.*,
                   c.name AS category_name, c.id AS category_id,
                   s.name as style_name, s.id as style_id, s.slug as style_slug,
                   u.name as seller_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN styles s ON p.style_id = s.id
            LEFT JOIN users u ON p.user_id = u.id
            WHERE p.id = ?
        `;
        const [productRows] = await pool.query(sqlProduct, [productId]);

        if (productRows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        const product = productRows[0];

        const sqlImages = `SELECT id, image_url FROM product_images WHERE product_id = ? ORDER BY id ASC`;
        const [images] = await pool.query(sqlImages, [productId]);

        product.images = images;
        res.json(product);

    } catch (error) {
        console.error('Error in getProductDetail API:', error);
        res.status(500).json({ message: 'Database error or internal server error' });
    }
};

// Menampilkan halaman detail produk (HTML)
exports.showProductDetailPage = async (req, res) => {
    try {
        const productId = req.params.id;
        const loggedInUser = req.user;
        const uploadStatus = req.query.status;

        const [productRows] = await pool.query(`
            SELECT p.*,
                   c.name as category_name, c.id as category_id,
                   s.name as style_name, s.slug as style_slug,
                   u.name as seller_name, u.id as seller_id
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN styles s ON p.style_id = s.id
            LEFT JOIN users u ON p.user_id = u.id
            WHERE p.id = ?
        `, [productId]);

        if (productRows.length === 0) {
            return res.status(404).render('404', { user: loggedInUser, message: 'Product not found.' });
        }
        const product = productRows[0];

        const [images] = await pool.query('SELECT id, image_url FROM product_images WHERE product_id = ? ORDER BY id ASC', [productId]);
        product.images = images;

        let processedColorOptions = [];
        if (product.available_colors && product.available_colors.trim() !== '') {
            const colorNames = product.available_colors.split(',').map(name => name.trim()).filter(name => name);
            processedColorOptions = colorNames.map((name, index) => {
                const colorDetail = getColorDetails(name); // Menggunakan getColorDetails dari utils
                let styleString = `background-color: ${colorDetail.hex};`;
                if (colorDetail.border) {
                    styleString += ` border: 1px solid #777;`;
                }
                return {
                    name: colorDetail.name,
                    style: styleString,
                    dataColor: colorDetail.name,
                    isActive: index === 0
                };
            });
        }
        product.colorOptions = processedColorOptions;

        let processedSizeOptions = [];
        if (product.available_sizes && product.available_sizes.trim() !== '') {
            const sizeNames = product.available_sizes.split(',').map(size => size.trim()).filter(size => size);
            processedSizeOptions = sizeNames.map((name, index) => ({
                name: name,
                name_sanitized: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                isActive: index === 0
            }));
        }
        product.sizeOptions = processedSizeOptions;

        let isWishlisted = false;
        if (loggedInUser) {
            const [wishlistCheck] = await pool.query(
                'SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?',
                [loggedInUser.id, productId]
            );
            if (wishlistCheck.length > 0) {
                isWishlisted = true;
            }
        }

        const [reviews] = await pool.query(`
            SELECT r.id as review_id, r.rating, r.review_text, r.created_at,
                   u.id as reviewer_id, u.name as reviewer_name, u.profile_image_url as reviewer_avatar
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.product_id = ?
            ORDER BY r.created_at DESC
        `, [productId]);

        product.review_count = reviews.length;

        let successMessage = null;
        if (uploadStatus === 'uploaded') {
            successMessage = 'Product uploaded successfully!';
        } else if (req.flash && req.flash('successMessage') && req.flash('successMessage').length > 0) {
            successMessage = req.flash('successMessage')[0];
        }

        // console.log(`[SHOW PRODUCT DETAIL] Rendering singleProduct for ID: ${productId}`); // Debug log
        res.render('singleProduct', {
            product: product,
            isWishlisted: isWishlisted,
            reviews: reviews,
            user: loggedInUser,
            successMessage: successMessage
        });

    } catch (error) {
        console.error('Error fetching product detail page:', error);
        res.status(500).render('500', { user: req.user, message: 'Error loading product details.' });
    }
};

module.exports = exports;