const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Apply middleware to retrieve user for all routes
router.use(authMiddleware.getUser);

router.get('/', (req, res) => {
    res.render('index');
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

// Protected route - only accessible when logged in
router.get('/dashboard', authMiddleware.isLoggedIn, (req, res) => {
    res.render('dashboard');
});

module.exports = router;