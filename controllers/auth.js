const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../db');  // mysql2/promise pool
const { fetchUserCartDetails } = require('./cart');
require('dotenv').config();

exports.register = async (req, res) => {
  const { name, email, password, passwordConfirm } = req.body;

  // Basic validation
  if (!name || !email || !password || !passwordConfirm) {
    return res.render('register', {
      message: { type: 'danger', text: 'Please fill in all fields' }
    });
  }

  if (password !== passwordConfirm) {
    return res.render('register', {
      message: { type: 'danger', text: 'Passwords do not match' }
    });
  }

  if (password.length < 6) {
    return res.render('register', {
      message: { type: 'danger', text: 'Password must be at least 6 characters long' }
    });
  }

  try {
    // Check if user already exists
    const [existingUsers] = await pool.query('SELECT email FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.render('register', {
        message: { type: 'danger', text: 'That email is already in use' }
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 8);

    // Insert user
    const [result] = await pool.query('INSERT INTO users SET ?', {
      name,
      email,
      password: hashedPassword
    });

    return res.render('register', {
      message: { type: 'success', text: 'User registered successfully!' }
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.render('register', {
      message: { type: 'danger', text: 'Registration failed. Please try again.' }
    });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.render('login', {
      message: { type: 'danger', text: 'Please provide an email and password' }
    });
  }

  try {
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.render('login', {
        message: { type: 'danger', text: 'Email or Password is incorrect' }
      });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.render('login', {
        message: { type: 'danger', text: 'Email or Password is incorrect' }
      });
    }

    // Create JWT
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN
    });

const cookieOptions = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000),
    httpOnly: true,
    path: '/' 
};

res.cookie('jwt', token, cookieOptions);
res.redirect('/dashboard');
  } catch (error) {
    console.error('Login error:', error);
    return res.render('login', {
      message: { type: 'danger', text: 'Login failed. Please try again.' }
    });
  }
};

exports.logout = (req, res) => {
  res.cookie('jwt', 'logout', {
    expires: new Date(Date.now() + 2 * 1000), // Atau new Date(0) untuk langsung expired
    httpOnly: true,
    path: '/' // 
  });
  res.redirect('/');
};

exports.wishlist = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Anda harus login terlebih dahulu' });
  }

  const userId = req.user.id;
  const { product_id } = req.body;

  try {
    const [existing] = await pool.query(
      'SELECT * FROM wishlist WHERE user_id = ? AND product_id = ?',
      [userId, product_id]
    );

    if (existing.length > 0) {
      // Sudah ada: hapus
      await pool.query(
        'DELETE FROM wishlist WHERE user_id = ? AND product_id = ?',
        [userId, product_id]
      );
      return res.status(200).json({ message: 'Dihapus dari wishlist' });
    } else {
      // Belum ada: tambahkan
      await pool.query(
        'INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)',
        [userId, product_id]
      );
      return res.status(200).json({ message: 'Berhasil ditambahkan ke wishlist!' });
    }
  } catch (error) {
    console.error('Wishlist toggle error:', error);
    return res.status(500).json({ message: 'Gagal memproses wishlist' });
  }
};

exports.getWishlist = async (req, res) => {
  if (!req.user) return res.redirect('/login');

  const userId = req.user.id;
  try {
    const [results] = await pool.query(`
      SELECT products.* FROM wishlist
      JOIN products ON wishlist.product_id = products.id
      WHERE wishlist.user_id = ?
    `, [userId]);

    return res.render('dashboard', {
      user: req.user,
      wishlist: results
    });
  } catch (error) {
    console.error('Get wishlist error:', error);
    return res.render('dashboard', {
      user: req.user,
      wishlist: []
    });
  }
};

exports.removeFromWishlist = async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Anda harus login terlebih dahulu' });

  const productId = req.params.id;
  try {
    const [result] = await pool.query('DELETE FROM wishlist WHERE product_id = ? AND user_id = ?', [productId, req.user.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Item wishlist tidak ditemukan' });
    }

    return res.json({ success: true, message: 'Berhasil menghapus dari wishlist' });
  } catch (error) {
    console.error('Remove wishlist error:', error);
    return res.status(500).json({ message: 'Gagal menghapus dari wishlist' });
  }
};

// controllers/auth.js

// controllers/auth.js


exports.getDashboard = async (req, res) => {
    if (!req.user) {
        return res.redirect('/login');
    }
    try {
        const userId = req.user.id;

        // Ambil produk yang dijual oleh user
        const [yourProducts] = await pool.query(
            'SELECT id, name, price, image_url, stock, rating FROM products WHERE user_id = ? AND is_visible = TRUE ORDER BY created_at DESC',
            [userId]
        );

        // Ambil wishlist user
        const [wishlist] = await pool.query(
            `SELECT p.id, p.name, p.price, p.image_url, p.rating, w.created_at as wishlist_added_at 
             FROM wishlist w 
             JOIN products p ON w.product_id = p.id 
             WHERE w.user_id = ? AND p.is_visible = TRUE ORDER BY w.created_at DESC`,
            [userId]
        );

        // Ambil data keranjang pengguna
        const { itemsWithSubtotal: cartItemsDetailed, cartTotal } = await fetchUserCartDetails(userId);
        
        // Ambil rata-rata rating seller
        const [sellerStats] = await pool.query(
            'SELECT AVG(rating) as average_seller_rating FROM products WHERE user_id = ? AND rating IS NOT NULL',
            [userId]
        );
        const userForView = { ...req.user };
        if (sellerStats.length > 0 && sellerStats[0].average_seller_rating) {
            userForView.average_seller_rating = sellerStats[0].average_seller_rating;
        }

        // --- BARU: Ambil Riwayat Pesanan Pengguna ---
        const [ordersFromDB] = await pool.query(
            `SELECT 
                id, 
                total_amount, 
                status, 
                DATE_FORMAT(order_date, '%d %M %Y, %H:%i WIB') as formatted_order_date 
                -- Anda bisa menambahkan kolom lain yang relevan dari tabel 'orders'
             FROM orders 
             WHERE user_id = ? 
             ORDER BY order_date DESC`, // Pesanan terbaru di atas
            [userId]
        );

        // Memproses status pesanan untuk tampilan yang lebih baik
        const processedOrders = ordersFromDB.map(order => {
            let status_display = order.status.charAt(0).toUpperCase() + order.status.slice(1);
            let status_class = 'secondary'; // default Bootstrap class
            switch (order.status.toLowerCase()) {
                case 'completed':
                    status_class = 'success';
                    status_display = 'Selesai';
                    break;
                case 'pending':
                    status_class = 'warning';
                    status_display = 'Menunggu Pembayaran'; // Atau 'Diproses' jika user_balance langsung mengurangi
                    break;
                case 'shipped':
                    status_class = 'info';
                    status_display = 'Dikirim';
                    break;
                case 'cancelled':
                    status_class = 'danger';
                    status_display = 'Dibatalkan';
                    break;
                case 'failed':
                    status_class = 'danger';
                    status_display = 'Gagal';
                    break;
                // Tambahkan case lain jika ada status berbeda
            }
            return { ...order, status_display, status_class };
        });
        // --- AKHIR BAGIAN BARU ---

        // Tentukan tab aktif (pastikan 'my-orders-pane' ada di validTabs)
        let activeTab = req.query.tab || (req.headers.referer && req.headers.referer.includes('#') ? req.headers.referer.split('#')[1] : 'my-profile-pane');
        const validTabs = ['my-profile-pane', 'my-products-pane', 'my-orders-pane', 'wishlist-pane-dash', 'cart-pane-dash']; // TAMBAHKAN 'my-orders-pane'
        if (!validTabs.includes(activeTab) && !validTabs.includes(activeTab.replace('-dash', ''))) { // Penyesuaian untuk -dash
             activeTab = 'my-profile-pane';
        }


        res.render('dashboard', {
            user: userForView,
            yourProducts,
            wishlist,
            cartItemsDetailed,
            cartTotal,
            orders: processedOrders, // Kirim data pesanan yang sudah diproses ke template
            pageTitle: 'My Dashboard',
            activeTab: activeTab // Ini akan digunakan oleh template untuk mengaktifkan tab yang benar
        });
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        res.status(500).render('500', { user: req.user, message: 'Failed to load dashboard data.' });
    }
};
exports.updateProfile = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized. Please login.' });
    }

    // DEBUGGING: Lihat apa isi req.body dan req.file
    console.log('[UPDATE PROFILE CONTROLLER] req.body:', req.body);
    console.log('[UPDATE PROFILE CONTROLLER] req.file:', req.file);

    const { name, email, bio } = req.body; // Error terjadi di sini jika req.body tidak sesuai
    const userId = req.user.id;
    let newAvatarPath = req.user.profile_image_url; 
    if (req.file) {
        newAvatarPath = '/img/avatars/' + req.file.filename;
        // Opsional: Hapus file avatar lama jika ada dan bukan default avatar
        // if (req.user.profile_image_url && req.user.profile_image_url !== '/img/avatars/default.png') {
        //     const oldAvatarPath = path.join(__dirname, '../public', req.user.profile_image_url);
        //     fs.unlink(oldAvatarPath, (err) => {
        //         if (err) console.error("Error deleting old avatar:", err);
        //     });
        // }
    }

    // Validasi Sederhana (bisa diperkuat)
    if (!name || name.trim() === '' || !email || email.trim() === '') {
        return res.status(400).json({ success: false, message: 'Name and Email are required.' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format.' });
    }

    try {
        // Cek jika email baru (jika diubah) sudah dipakai user lain
        if (email !== req.user.email) { // Cek jika email memang diubah
            const [existingUsers] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
            if (existingUsers.length > 0) {
                return res.status(400).json({ success: false, message: 'That email is already in use by another account.' });
            }
        }

        const [result] = await pool.query(
            'UPDATE users SET name = ?, email = ?, bio = ?, profile_image_url = ? WHERE id = ?',
            [name, email, bio || null, newAvatarPath, userId]
        );
        if (result.affectedRows === 0) {
            // Seharusnya tidak terjadi jika user ada (karena req.user.id dari token yang valid)
            return res.status(404).json({ success: false, message: 'User not found or no changes made.' });
        }

        // Ambil data user yang sudah diupdate untuk dikirim kembali dan untuk update sesi/token jika perlu
        const [updatedUserRows] = await pool.query('SELECT id, name, email, profile_image_url, bio FROM users WHERE id = ?', [userId]);

        console.log('[PROFILE UPDATE CONTROLLER] Profile updated successfully for user ID:', userId);
        res.status(200).json({ 
            success: true, 
            message: 'Profile updated successfully!',
            user: updatedUserRows[0] // Kirim user yang sudah diupdate (termasuk profile_image_url baru)
        });

    } catch (error) {
        console.error('[PROFILE UPDATE CONTROLLER] Error updating profile:', error);
         if (req.file && error.message.includes('Images Only')) {
             return res.status(400).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'Server error while updating profile.' });
    }
};