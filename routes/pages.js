const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Apply middleware to retrieve user for all routes
router.use(authMiddleware.getUser);

router.get('/', (req, res) => {
    res.render('index');
});
// Di routes/pages.js
router.get('/dashboard', isLoggedIn, (req, res) => {
  db.query(
    `SELECT w.id, p.* 
     FROM wishlist w 
     JOIN products p ON w.product_id = p.id 
     WHERE w.user_id = ?`,
    [req.user.id],
    (error, wishlist) => {
      if (error) {
        console.log(error);
        return res.render('dashboard', { wishlist: [] });
      }
      res.render('dashboard', { 
        user: req.user,
        wishlist 
      });
    }
  );
});
router.get('/register', (req, res) => {
    res.render('register');
});

router.get('/login', (req, res) => {
    res.render('login');
});

// Protected route - only accessible when logged in
router.get('/dashboard', authMiddleware.isLoggedIn, (req, res) => {
    res.render('dashboard');
});

module.exports = router;