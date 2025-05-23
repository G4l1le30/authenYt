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


// Ambil detail produk lengkap dengan semua gambar
exports.getProductDetail = (req, res) => {
  const productId = req.params.id;
  const sqlProduct = `
    SELECT p.*, c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `;
  const sqlImages = `SELECT * FROM product_images WHERE product_id = ?`;

  db.query(sqlProduct, [productId], (err, productRows) => {
    if (err) return res.status(500).send('Database error');
    if (productRows.length === 0) return res.status(404).send('Product not found');

    db.query(sqlImages, [productId], (err2, images) => {
      if (err2) return res.status(500).send('Database error');
      const product = productRows[0];
      product.images = images;
      res.json(product);
    });
  });
};
exports.toggleWishlist = (req, res) => {
  if (!req.user) {
    console.log('Unauthorized user trying to add to wishlist');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const userId = req.user.id;
  const { productId } = req.body;

  console.log(`User ${userId} is toggling wishlist for product ${productId}`); // Log user dan productId

  // Cek apakah sudah ada di wishlist
  const checkQuery = 'SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?';
  db.query(checkQuery, [userId, productId], (err, results) => {
    if (err) {
      console.log('Error checking wishlist:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    if (results.length > 0) {
      console.log('Product already in wishlist, removing it');
      // Jika ada, hapus dari wishlist
      const deleteQuery = 'DELETE FROM wishlist WHERE user_id = ? AND product_id = ?';
      db.query(deleteQuery, [userId, productId], (err) => {
        if (err) {
          console.log('Error removing product from wishlist:', err);
          return res.status(500).json({ message: 'Database error' });
        }
        return res.json({ inWishlist: false });
      });
    } else {
      console.log('Product not in wishlist, adding it');
      // Jika belum ada, tambah ke wishlist
      const insertQuery = 'INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)';
      db.query(insertQuery, [userId, productId], (err) => {
        if (err) {
          console.log('Error adding product to wishlist:', err);
          return res.status(500).json({ message: 'Database error' });
        }
        return res.json({ inWishlist: true });
      });
    }
  });
};
// controllers/product.js
exports.showProductDetailPage = (req, res) => {
  const productId = req.params.id;
  const sqlProduct = `
    SELECT p.*, c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `;
  const sqlImages = `SELECT * FROM product_images WHERE product_id = ?`;

  db.query(sqlProduct, [productId], (err, productRows) => {
    if (err) return res.status(500).send('Database error');
    if (productRows.length === 0) return res.status(404).send('Product not found');

    db.query(sqlImages, [productId], (err2, images) => {
      if (err2) return res.status(500).send('Database error');

      const product = productRows[0];
      product.images = images; // <-- ini yang bikin 'product.images' bisa di-loop di template

      res.render('singleproduct', {
        product,
        user: res.locals.user
      });
    });
  });
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