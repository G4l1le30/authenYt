// routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const path = require('path'); // Pastikan ini di-require
const fs = require('fs');   // Pastikan ini di-require

// Konfigurasi Multer untuk upload avatar ke disk
const avatarStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../public/img/avatars');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const userId = req.user ? req.user.id : 'unknownuser_filename_fallback'; // req.user dari authMiddleware.protect
        console.log(`[MULTER FILENAME] Attempting to use userId: ${userId} for filename`);
        cb(null, `avatar-${userId}-${uniqueSuffix}${ext}`);
    }
});

function checkFileType(req, file, cb) { // Tambahkan req jika Anda ingin set req.fileValidationError
    if (!file || typeof file.originalname !== 'string') {
        return cb(new Error('Filename is invalid or no file selected.')); 
    }
    const filetypes = /jpeg|jpg|png|gif/;
    const extnameValid = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetypeValid = filetypes.test(file.mimetype);

    if (mimetypeValid && extnameValid) {
        return cb(null, true);
    } else {
        cb(new Error('Error: Images Only! Please upload a valid image file (jpeg, jpg, png, gif).'));
    }
}

const avatarUpload = multer({ 
    storage: avatarStorage,
    limits: { fileSize: 1024 * 1024 * 1 }, // 1MB
    fileFilter: checkFileType
});

// === Rute Autentikasi Dasar ===
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

// === Rute Wishlist ===
router.post('/wishlist', authMiddleware.protect, authController.wishlist);
router.delete('/wishlist/:id', authMiddleware.protect, authController.removeFromWishlist);

// === Rute Update Profil Pengguna (dengan upload avatar) ===
router.post(
    '/profile/update', 
    authMiddleware.protect,         
    avatarUpload.single('avatar'),  // Gunakan konfigurasi Multer yang menyimpan ke disk
    (req, res, next) => { // Middleware debug
        console.log('[ROUTES/AUTH - AFTER DISK MULTER] req.body:', req.body);
        console.log('[ROUTES/AUTH - AFTER DISK MULTER] req.file:', req.file);
        // Jika fileFilter mengirim error dengan cb(new Error(...)), itu akan ditangkap oleh error handler Express
        // atau try-catch di controller. Jika tidak, file akan diupload atau req.file akan undefined.
        next(); 
    },
    authController.updateProfile      
);

module.exports = router;