// routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const path = require('path'); // Pastikan ini di-require jika menggunakan diskStorage
const fs = require('fs');   // Pastikan ini di-require jika menggunakan diskStorage

// Konfigurasi Multer (Pilih salah satu: simpleAvatarUpload atau avatarUpload dengan diskStorage)

// --- OPSI 1: Multer Sederhana (memoryStorage) ---
// const simpleAvatarUpload = multer({ storage: multer.memoryStorage() }); 

// --- OPSI 2: Multer Lengkap (diskStorage dengan filter) ---
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
        const userId = req.user ? req.user.id : 'unknownuser';
        cb(null, `avatar-${userId}-${uniqueSuffix}${ext}`);
    }
});

// Fungsi checkFileType yang DIPERBAIKI
function checkFileType(req, file, cb) { // Tambahkan 'req' sebagai parameter pertama jika ingin set req.fileValidationError
    // Pengecekan awal jika tidak ada file sama sekali yang terkirim (meskipun Multer biasanya menghandle ini)
    if (!file) {
        return cb(null, false); // Jangan terima jika tidak ada file
    }
    // Pengecekan penting untuk originalname
    if (typeof file.originalname !== 'string') {
        // Jika originalname bukan string (misalnya undefined), kirim error atau tolak file
        return cb(new Error('Filename is invalid.')); 
    }

    const filetypes = /jpeg|jpg|png|gif/;
    const extnameValid = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetypeValid = filetypes.test(file.mimetype);

    if (mimetypeValid && extnameValid) {
        return cb(null, true); // Terima file
    } else {
        // Simpan pesan error di request agar bisa diakses di middleware berikutnya (opsional)
        // req.fileValidationError = 'Error: Images Only! (jpeg, jpg, png, gif)';
        // return cb(null, false); 
        
        // Cara yang lebih standar untuk menolak file dengan pesan error:
        cb(new Error('Error: Images Only! Please upload a valid image file (jpeg, jpg, png, gif).'));
    }
}

const avatarUpload = multer({ 
    storage: avatarStorage, // Gunakan avatarStorage jika ingin menyimpan ke disk
    // storage: multer.memoryStorage(), // Atau memoryStorage jika itu yang Anda gunakan untuk tes
    limits: { fileSize: 1024 * 1024 * 1 }, // 1MB
    fileFilter: checkFileType // fileFilter sekarang menerima (req, file, cb) jika Anda butuh req
});


// === Rute Autentikasi Dasar ===
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

// === Rute Wishlist ===
router.post('/wishlist', authMiddleware.protect, authController.wishlist);
router.delete('/wishlist/:id', authMiddleware.protect, authController.removeFromWishlist);

// === Rute Update Profil Pengguna (dengan upload avatar) ===
// Pastikan HANYA SATU definisi rute ini yang aktif
router.post(
    '/profile/update', 
    authMiddleware.protect,         
    avatarUpload.single('avatar'),  // Gunakan konfigurasi Multer yang sudah diperbaiki
    // Middleware debug opsional (bisa dihapus jika sudah yakin)
    (req, res, next) => {
        console.log('[ROUTES/AUTH - AFTER MULTER] req.body:', req.body);
        console.log('[ROUTES/AUTH - AFTER MULTER] req.file:', req.file);
        // Jika fileFilter di Multer mengirim error dengan cb(new Error(...)), 
        // error tersebut akan ditangkap oleh error handler Express atau try-catch di controller.
        next(); 
    },
    authController.updateProfile      
);

module.exports = router;