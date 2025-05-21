const dotenv = require('dotenv')
const mysql=require('mysql')
const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
})
// Ambil semua produk lengkap thumbnail
exports.getAllProducts = (req, res) => {
  const sql = `
    SELECT p.*, c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
  `;
  db.query(sql, (err, products) => {
    if (err) return res.status(500).send('Database error');
    res.json(products);
  });
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
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const userId = req.user.id;
  const { productId } = req.body;

  // Cek apakah sudah ada di wishlist
  const checkQuery = 'SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?';
  db.query(checkQuery, [userId, productId], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });

    if (results.length > 0) {
      // Jika ada, hapus dari wishlist
      const deleteQuery = 'DELETE FROM wishlist WHERE user_id = ? AND product_id = ?';
      db.query(deleteQuery, [userId, productId], (err) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        return res.json({ inWishlist: false });
      });
    } else {
      // Jika belum ada, tambah ke wishlist
      const insertQuery = 'INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)';
      db.query(insertQuery, [userId, productId], (err) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        return res.json({ inWishlist: true });
      });
    }
  });
};