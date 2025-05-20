const express=require('express')
const authController=require('../controllers/auth')
const router=express.Router()
router.post('/register', authController.register)
router.post('/login', authController.login);
router.get('/logout', authController.logout);
// In your auth routes file
router.post('/wishlist', isAuthenticated, async (req, res) => {
    try {
        const { product_id } = req.body;
        const userId = req.user.id;

        // Check if product exists
        const product = await Product.findByPk(product_id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
        }

        // Check if already in wishlist
        const existing = await Wishlist.findOne({
            where: { user_id: userId, product_id }
        });

        if (existing) {
            // Remove from wishlist
            await existing.destroy();
            return res.json({ success: true, message: 'Produk dihapus dari wishlist' });
        } else {
            // Add to wishlist
            await Wishlist.create({
                user_id: userId,
                product_id
            });
            return res.json({ success: true, message: 'Produk ditambahkan ke wishlist' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
module.exports=router
