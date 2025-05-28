// routes/pages.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // Menggunakan 'pool' agar konsisten
// Middleware dan Controller
const authMiddleware = require('../middleware/auth');
const authController = require('../controllers/auth');
const productController = require('../controllers/product'); // productController diimpor tapi tidak semua fungsinya dipakai di sini
const cartController = require('../controllers/cart');
const orderController = require('../controllers/order'); 

// Impor konfigurasi produk dari utils
const {
    PREDEFINED_COLORS_CONFIG, // Digunakan untuk fallback atau jika DB error di /allProduk & untuk /sell
    PREDEFINED_SIZES,         // Digunakan untuk /sell & /allProduk
    SORT_OPTIONS,             // Untuk /allProduk
    getColorDetails           // Untuk memproses warna di /allProduk
} = require('../utils/productOptions.js'); // Pastikan path ini benar

// Middleware untuk attach user jika login
router.use(authMiddleware.getUser);

/**
 * ====================
 * PUBLIC ROUTES
 * ====================
 */

// Homepage - daftar produk + wishlist jika login
router.get('/', async (req, res) => {
    try {
        const [newArrivalProducts] = await pool.query(
            'SELECT id, name, price, image_url, rating FROM products ORDER BY created_at DESC LIMIT 6'
        );
        const [topSellers] = await pool.query(`
            SELECT u.id, u.name, u.profile_image_url, AVG(p.rating) as average_seller_rating, COUNT(p.id) as product_count
            FROM users u JOIN products p ON u.id = p.user_id WHERE p.rating IS NOT NULL
            GROUP BY u.id HAVING COUNT(p.id) > 0 ORDER BY average_seller_rating DESC LIMIT 4
        `);
        const [dressStyles] = await pool.query(
            'SELECT id, name, image_url, slug FROM styles ORDER BY id'
        );
        // console.log('[ROUTE /] req.user sebelum render:', req.user); // Debug log
        res.render('index', {
            products: newArrivalProducts,
            top_sellers: topSellers,
            dress_styles: dressStyles,
            user: req.user
        });
    } catch (error) {
        console.error("Error fetching data for homepage:", error);
        res.status(500).render('500', { user: req.user, message: 'Failed to load homepage data.' });
    }
});

// Halaman profil seller
router.get('/seller/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const [sellerRows] = await pool.query('SELECT id, name, email, profile_image_url, bio FROM users WHERE id = ?', [userId]);
        if (sellerRows.length === 0) {
            return res.status(404).render('404', { user: req.user, message: 'Seller not found.' });
        }
        const seller = sellerRows[0];
        const [sellerStats] = await pool.query('SELECT AVG(p.rating) as average_seller_rating, COUNT(p.id) as product_count FROM products p WHERE p.user_id = ? AND p.rating IS NOT NULL', [userId]);
        seller.average_seller_rating = sellerStats[0] ? sellerStats[0].average_seller_rating : null;
        seller.product_count = sellerStats[0] ? sellerStats[0].product_count : 0;
        const [productsByThisSeller] = await pool.query('SELECT id, name, price, image_url, description, stock, rating FROM products WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        res.render('sellerProfile', { profile_user: seller, seller_products: productsByThisSeller, user: req.user });
    } catch (error) {
        console.error('Error fetching seller profile:', error);
        res.status(500).render('500', { user: req.user, message: 'Error loading seller profile.' });
    }
});
// ===================================
// RUTE BARU UNTUK DETAIL PESANAN
// ===================================
router.get('/order/detail/:orderId', authMiddleware.protect, orderController.getOrderDetailPage);
// ===================================

// Halaman semua produk (dengan filter dan sortir yang diperbarui)
router.get('/allProduk', async (req, res) => {
    try {
        const {
            category_id: currentCategoryIdQuery,
            style: currentStyleSlugQuery,
            sizes: selectedSizesQuery,      // ?sizes=S,M
            colors: selectedColorsQuery,    // ?colors=Red,Blue (nama warna)
            min_price: minPriceQuery,
            max_price: maxPriceQuery,
            sort: currentSortValueQuery
        } = req.query;

        let productQuery = `
            SELECT p.id, p.name, p.price, p.image_url, p.description, p.stock, p.rating,
                   p.available_colors, p.available_sizes,
                   c.name as category_name, c.id as actual_category_id, -- Alias untuk menghindari konflik
                   s.name as style_name, s.id as actual_style_id, s.slug as actual_style_slug -- Alias
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN styles s ON p.style_id = s.id`;
        let conditions = [];
        let queryParams = [];

        let pageTitle = "All Products";
        let filterDescription = "Explore our complete product collection";
        let currentCategoryName = null;
        let currentStyleName = null;
        let currentCategoryIdForView = currentCategoryIdQuery || null; // Untuk dikirim kembali ke view
        let currentStyleSlugForView = currentStyleSlugQuery || null;   // Untuk dikirim kembali ke view

        // Filter Kategori & Style
        if (currentCategoryIdQuery) {
            conditions.push('p.category_id = ?');
            queryParams.push(currentCategoryIdQuery);
            const [catRows] = await pool.query('SELECT name FROM categories WHERE id = ?', [currentCategoryIdQuery]);
            if (catRows.length > 0) {
                currentCategoryName = catRows[0].name;
                pageTitle = `Category: ${currentCategoryName}`;
            }
        }
        if (currentStyleSlugQuery) {
            const [styleRows] = await pool.query('SELECT id, name FROM styles WHERE slug = ?', [currentStyleSlugQuery]);
            if (styleRows.length > 0) {
                conditions.push('p.style_id = ?');
                queryParams.push(styleRows[0].id);
                currentStyleName = styleRows[0].name;
                pageTitle = currentCategoryName ? `${pageTitle} - ${currentStyleName} Style` : `${currentStyleName} Style`;
            }
        }

        // Ambil warna unik dari DB untuk opsi filter
        const [productColorRows] = await pool.query('SELECT DISTINCT available_colors FROM products WHERE available_colors IS NOT NULL AND available_colors != ""');
        const uniqueColorNamesInDB = new Set();
        productColorRows.forEach(row => {
            row.available_colors.split(',').forEach(name => {
                const trimmedName = name.trim();
                if (trimmedName) {
                    const mappedColorDetail = getColorDetails(trimmedName); // Fungsi dari utils
                    uniqueColorNamesInDB.add(mappedColorDetail.name); // Gunakan nama standar jika ada di map
                }
            });
        });
        const sortedUniqueActualColorNames = Array.from(uniqueColorNamesInDB).sort();
        const currentSelectedColorNames = selectedColorsQuery ? selectedColorsQuery.split(',').map(c => c.trim()).filter(c => c) : [];
        const filterColorOptions = sortedUniqueActualColorNames.map(name => {
            const colorDetail = getColorDetails(name); // Fungsi dari utils
            return {
                name: colorDetail.name, hex: colorDetail.hex, border: colorDetail.border,
                name_dashed: colorDetail.name.toLowerCase().replace(/\s+/g, '-'),
                isActive: currentSelectedColorNames.includes(colorDetail.name)
            };
        });

        // Filter Ukuran (dari query string, berupa nama ukuran)
        const currentSelectedSizes = selectedSizesQuery ? selectedSizesQuery.split(',').map(s => s.trim()).filter(s => s) : [];
        if (currentSelectedSizes.length > 0) {
            const sizeConditions = currentSelectedSizes.map(sizeName => {
                queryParams.push(sizeName); return `FIND_IN_SET(?, p.available_sizes)`;
            });
            conditions.push(`(${sizeConditions.join(' OR ')})`);
        }

        // Filter Warna (dari query string, berupa nama warna)
        if (currentSelectedColorNames.length > 0) {
            const colorNameConditions = currentSelectedColorNames.map(colorName => {
                queryParams.push(colorName); return `FIND_IN_SET(?, p.available_colors)`;
            });
            conditions.push(`(${colorNameConditions.join(' OR ')})`);
        }

        // Filter Harga
        const currentMinPrice = parseFloat(minPriceQuery);
        const currentMaxPrice = parseFloat(maxPriceQuery);
        if (!isNaN(currentMinPrice) && currentMinPrice >= 0) {
            conditions.push('p.price >= ?'); queryParams.push(currentMinPrice);
        }
        if (!isNaN(currentMaxPrice) && currentMaxPrice > 0 && (isNaN(currentMinPrice) || currentMaxPrice >= currentMinPrice)) {
            conditions.push('p.price <= ?'); queryParams.push(currentMaxPrice);
        }

        if (conditions.length > 0) productQuery += ' WHERE ' + conditions.join(' AND ');

        const activeSortOption = SORT_OPTIONS.find(opt => opt.value === currentSortValueQuery) || SORT_OPTIONS[0];
        productQuery += ` ORDER BY ${activeSortOption.orderBy}`;

        const [products] = await pool.query(productQuery, queryParams);
        const [allCategories] = await pool.query('SELECT id, name FROM categories ORDER BY name');
        const [allStyles] = await pool.query('SELECT id, name, slug FROM styles ORDER BY name');
        const filterSizeOptions = PREDEFINED_SIZES.map(size => ({
            name: size, name_dashed: size.toLowerCase().replace(/\s+/g, '-'),
            isActive: currentSelectedSizes.includes(size)
        }));

        res.render('allProduk', {
            products, pageTitle, filterDescription, allCategories, allStyles, user: req.user,
            currentCategoryId: currentCategoryIdForView, currentCategoryName,
            currentStyleSlug: currentStyleSlugForView, currentStyleName,
            filterColorOptions, filterSizeOptions,
            currentSelectedSizes, currentSelectedColors: currentSelectedColorNames,
            currentMinPrice: !isNaN(currentMinPrice) ? currentMinPrice : null,
            currentMaxPrice: !isNaN(currentMaxPrice) ? currentMaxPrice : null,
            sortOptions: SORT_OPTIONS.map(opt => ({ ...opt, isSelected: opt.value === activeSortOption.value })),
            currentSortValue: activeSortOption.value,
        });
    } catch (err) {
        console.error('Error fetching /allProduk:', err);
        const [fallbackCategories] = await pool.query('SELECT id, name FROM categories ORDER BY name').catch(() => [[]]);
        const [fallbackStyles] = await pool.query('SELECT id, name, slug FROM styles ORDER BY name').catch(() => [[]]);
        res.status(500).render('allProduk', {
            products: [], pageTitle: "Error Loading Products", filterDescription: "An error occurred.",
            allCategories: fallbackCategories, allStyles: fallbackStyles, user: req.user,
            filterColorOptions: PREDEFINED_COLORS_CONFIG.map(c => ({...c, name_dashed:c.name.toLowerCase().replace(/\s+/g, '-'), isActive: false})),
            filterSizeOptions: PREDEFINED_SIZES.map(s => ({name: s, name_dashed: s.toLowerCase().replace(/\s+/g, '-'), isActive: false})),
            sortOptions: SORT_OPTIONS.map(opt => ({ ...opt, isSelected: opt.value === SORT_OPTIONS[0].value })),
            message: { type: 'danger', text: 'Failed to load product data.' }
        });
    }
});

// Auth pages
router.get('/register', (req, res) => res.render('register', { user: req.user }));
router.get('/login', (req, res) => res.render('login', { user: req.user }));

/**
 * ====================
 * PROTECTED ROUTES
 * ====================
 */
router.get('/dashboard', authMiddleware.ensureAuth, authController.getDashboard);

/**
 * ====================
 * PRODUCT ROUTES
 * ====================
 */
// Halaman detail produk
// Menggunakan productController yang diimpor di atas
router.get('/product/:id', productController.showProductDetailPage);

/**
 * ====================
 * CART ROUTES
 * ====================
 */
router.post('/api/cart/add', authMiddleware.protect, cartController.addToCart);
//router.get('/cart', authMiddleware.protect, cartController.getCart);
router.put('/api/cart/:id', authMiddleware.protect, cartController.updateCartItem);
router.delete('/api/cart/:id', authMiddleware.protect, cartController.deleteCartItem);

/**
 * ====================
 * SELL PRODUCT ROUTES
 * ====================
 */
// Rute untuk menampilkan halaman jual produk
router.get('/sell', authMiddleware.protect, async (req, res) => {
    try {
        const [categories] = await pool.query('SELECT id, name FROM categories ORDER BY name');
        const [styles] = await pool.query('SELECT id, name FROM styles ORDER BY name');

        // Menggunakan PREDEFINED_COLORS_CONFIG dan PREDEFINED_SIZES dari utils
        const currentValues = (req.session && req.session.sellFormValues) ? req.session.sellFormValues : {};
        const previouslySelectedColors = currentValues.available_colors ? currentValues.available_colors.split(',').map(c => c.trim()) : [];
        
        // Menggunakan PREDEFINED_COLORS_CONFIG dari utils/productOptions.js
        const availableColorsListWithSelection = PREDEFINED_COLORS_CONFIG.map(color => ({
            ...color,
            name_dashed_lowercase: color.name.toLowerCase().replace(/\s+/g, '-'),
            isSelected: previouslySelectedColors.includes(color.name)
        }));
        
        const previouslySelectedSizes = currentValues.available_sizes ? currentValues.available_sizes.split(',').map(s => s.trim()) : [];
        // Menggunakan PREDEFINED_SIZES dari utils/productOptions.js
        const availableSizesListWithSelection = PREDEFINED_SIZES.map(size => ({
            name: size,
            name_dashed_lowercase: size.toLowerCase().replace(/\s+/g, '-'),
            isSelected: previouslySelectedSizes.includes(size)
        }));

        res.render('sell', {
            categories, styles,
            availableColorsList: availableColorsListWithSelection,
            availableSizesList: availableSizesListWithSelection,
            user: req.user, currentValues,
            message: req.flash ? req.flash('sellMessage') : null // Menggunakan flash message jika ada
        });
        if (req.session && req.session.sellFormValues) req.session.sellFormValues = null;
    } catch (err) {
        console.error('Error fetching data for sell page:', err);
        res.status(500).render('sell', {
            categories: [], styles: [], user: req.user, currentValues: {},
            availableColorsList: PREDEFINED_COLORS_CONFIG.map(c => ({ ...c, name_dashed_lowercase: c.name.toLowerCase().replace(/\s+/g, '-'), isSelected: false })),
            availableSizesList: PREDEFINED_SIZES.map(s => ({ name: s, name_dashed_lowercase: s.toLowerCase().replace(/\s+/g, '-'), isSelected: false })),
            message: { type: 'danger', text: 'Failed to load page data.' }
        });
    }
});

// Rute untuk memproses form produk yang di-upload
// Menggunakan productController yang diimpor di atas
router.post('/sell',
    authMiddleware.protect,
    (req, res, next) => {
        if (req.body && Object.keys(req.body).length > 0 && req.session) {
            req.session.sellFormValues = req.body;
        }
        next();
    },
    productController.upload.array('images', 5),
    productController.uploadProduct
);


//checkout
// Rute untuk menampilkan halaman checkout
router.get('/checkout', authMiddleware.protect, async (req, res) => {
    if (!req.user) {
        return res.redirect('/login');
    }

    const userId = req.user.id;

    try {
        // Ambil item dari keranjang pengguna beserta detail produk terkini
        // PERBAIKAN: Ubah 'cart_items ci' menjadi 'carts c'
        const [cartItemsDetails] = await pool.query(
            `SELECT 
                c.id as cart_item_id,         -- Menggunakan alias 'c'
                c.product_id, 
                c.quantity, 
                c.color,                      -- Pastikan kolom ini ada di tabel 'carts'
                c.size,                       -- Pastikan kolom ini ada di tabel 'carts'
                p.name AS product_name, 
                p.price AS current_price, 
                p.image_url AS product_image_url,
                p.stock AS current_stock,
                p.is_visible AS product_is_visible -- Tambahkan ini untuk validasi
             FROM carts c                     -- <<< DIUBAH DARI cart_items ci KE carts c
             JOIN products p ON c.product_id = p.id 
             WHERE c.user_id = ? AND p.is_visible = TRUE`, // Hanya checkout produk yang masih visible
            [userId]
        );

        if (cartItemsDetails.length === 0) {
            if (req.flash) req.flash('info_msg', 'Keranjang Anda kosong. Silakan tambahkan produk terlebih dahulu.');
            return res.redirect('/dashboard#cart-pane-dash'); // Arahkan ke tab keranjang di dashboard
        }

        let grandTotal = 0;
        const itemsForView = cartItemsDetails.map(item => {
            if (!item.product_is_visible) {
                item.hasStockIssue = true;
                item.errorMessage = `Produk "${item.product_name}" sudah tidak tersedia.`;
                // Jangan hitung subtotal jika produk tidak visible
            } else if (item.quantity > item.current_stock) {
                item.hasStockIssue = true;
                item.errorMessage = `Stok tidak cukup (tersisa ${item.current_stock}). Harap kurangi kuantitas di keranjang.`;
                // Jangan hitung subtotal jika stok tidak cukup untuk kuantitas saat ini
                // Atau, biarkan subtotal dihitung dengan kuantitas saat ini, tapi tombol bayar di-disable
            }
            
            const subtotal = item.product_is_visible && item.quantity <= item.current_stock 
                           ? item.current_price * item.quantity 
                           : 0; // Hanya hitung subtotal jika valid
            grandTotal += subtotal;

            return {
                ...item,
                subtotal,
            };
        });
        
        const userBalance = req.user.balance;

        // Cek apakah ada item yang bermasalah untuk ditampilkan di checkout page
        const hasAnyProblematicItem = itemsForView.some(item => item.hasStockIssue && !item.product_is_visible);
        const canProceedToPayment = !itemsForView.some(item => item.hasStockIssue); // Tombol bayar aktif jika semua item OK

        res.render('checkout', {
            user: req.user,
            cartItems: itemsForView,
            grandTotal,
            userBalance,
            pageTitle: 'Checkout Pesanan',
            hasAnyProblematicItem, // Kirim flag ini ke template
            canProceedToPayment // Kirim flag ini ke template
        });

    } catch (error) {
        console.error('Error rendering checkout page:', error);
        if (req.flash) req.flash('error_msg', 'Gagal memuat halaman checkout. Silakan coba lagi.');
        // PERBAIKAN: Ubah redirect ke tab keranjang di dashboard
        res.redirect('/dashboard#cart-pane-dash');
    }
});
router.get('/order/success/:orderId', authMiddleware.protect, (req, res) => {
    // authMiddleware.protect memastikan hanya user yang login bisa mengakses
    // misalnya mengecek apakah orderId tersebut memang milik user yang login.
    // Untuk saat ini, kita buat sederhana:
    res.render('order-success', {
        user: req.user,
        orderId: req.params.orderId,
        pageTitle: `Pesanan #${req.params.orderId} Berhasil Dibuat`
        // Anda bisa menambahkan pesan flash sukses di sini jika mau,
        // atau mengambil detail pesanan dari DB untuk ditampilkan.
    });
});


// BARU: Rute untuk menampilkan halaman chat terpisah
router.get('/chat/:sellerId', authMiddleware.protect, async (req, res) => {
    if (!req.user) { // Seharusnya sudah ditangani oleh authMiddleware.protect
        return res.redirect('/login');
    }

    const buyer = req.user; // Pengguna yang login adalah pembeli
    const sellerId = parseInt(req.params.sellerId);

    if (isNaN(sellerId)) {
        if(req.flash) req.flash('error_msg', 'ID Penjual tidak valid.');
        return res.redirect('back'); // Kembali ke halaman sebelumnya
    }

    if (buyer.id === sellerId) {
        if(req.flash) req.flash('error_msg', 'Anda tidak dapat chat dengan diri sendiri.');
        return res.redirect('back');
    }

    try {
        // Ambil detail penjual
        const [sellerRows] = await pool.query(
            'SELECT id, name, profile_image_url FROM users WHERE id = ?',
            [sellerId]
        );

        if (sellerRows.length === 0) {
            if(req.flash) req.flash('error_msg', 'Penjual tidak ditemukan.');
            return res.redirect('back');
        }
        const seller = sellerRows[0];

        // Anda akan merender halaman chat baru di sini
        // Data yang dikirim akan digunakan oleh JavaScript di halaman chat untuk menginisialisasi Socket.IO
        res.render('chatPage', { // Nama file template baru: chatPage.hbs
            user: buyer, // Info pengguna yang login (pembeli)
            receiver: seller, // Info pengguna yang akan diajak chat (penjual)
            pageTitle: `Chat dengan ${seller.name}`,
            layout: 'chatPage' // (Opsional) Jika Anda ingin layout khusus untuk halaman chat
        });

    } catch (error) {
        console.error("Error rendering chat page:", error);
        if(req.flash) req.flash('error_msg', 'Gagal memuat halaman chat.');
        res.redirect('/');
    }
});


module.exports = router;