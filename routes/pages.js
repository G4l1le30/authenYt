const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const authController = require('../controllers/auth');


// Apply middleware to retrieve user for all routes
router.use(authMiddleware.getUser);

router.get('/', (req, res) => {
    db.query('SELECT * FROM products', (err, results) => {
        if (err) {
            console.log(err);
            return res.render('index', { products: [] });
        }
        res.render('index', { products: results });
    });
});

router.get('/allProduk', (req, res)=>{
    res.render('allProduk')
})

router.get('/register', (req, res) => {
    res.render('register');
});

router.get('/login', (req, res) => {
    res.render('login');
});
/*
// Protected route - only accessible when logged in
router.get('/dashboard', authMiddleware.isLoggedIn, (req, res) => {
    res.render('dashboard');
});
*/
router.get('/dashboard', authMiddleware.protect, authController.getWishlist);

module.exports = router;