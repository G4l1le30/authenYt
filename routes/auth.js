const express=require('express')
const authController=require('../controllers/auth')
const authMiddleware = require('../middleware/auth');

const router=express.Router()
router.post('/register', authController.register)
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.post('/wishlist', authMiddleware.protect, authController.wishlist);
router.delete('/wishlist/:id', authMiddleware.protect, authController.removeFromWishlist);
module.exports=router
