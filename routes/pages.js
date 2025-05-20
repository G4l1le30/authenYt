const express = require('express');
const router = express.Router();
const db = require('../database'); // Pastikan Anda sudah membuat file ini

// Route test untuk melihat produk
router.get('/test-products', (req, res) => {
  db.query('SELECT * FROM products', (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Database error');
    }
    res.json(results);
  });
});

module.exports = router;