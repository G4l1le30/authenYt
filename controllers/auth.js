const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../db');  // mysql2/promise pool
const { fetchUserCartDetails } = require('./cart'); // Pastikan path ini benar
// require('dotenv').config(); // Seharusnya sudah di-load di app.js utama Anda

exports.register = async (req, res) => {
  const { name, email, password, passwordConfirm } = req.body;
  if (!name || !email || !password || !passwordConfirm) {
    return res.render('register', { message: { type: 'danger', text: 'Please fill in all fields' } });
  }
  if (password !== passwordConfirm) {
    return res.render('register', { message: { type: 'danger', text: 'Passwords do not match' } });
  }
  if (password.length < 6) {
    return res.render('register', { message: { type: 'danger', text: 'Password must be at least 6 characters long' } });
  }
  try {
    const [existingUsers] = await pool.query('SELECT email FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.render('register', { message: { type: 'danger', text: 'That email is already in use' } });
    }
    const hashedPassword = await bcrypt.hash(password, 8);
    await pool.query('INSERT INTO users SET ?', { name, email, password: hashedPassword });
    return res.render('register', { message: { type: 'success', text: 'User registered successfully! Please log in.' } });
  } catch (error) {
    console.error('Register error:', error);
    return res.render('register', { message: { type: 'danger', text: 'Registration failed. Please try again.' } });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.render('login', { message: { type: 'danger', text: 'Please provide an email and password' } });
  }
  try {
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.render('login', { message: { type: 'danger', text: 'Email or Password is incorrect' } });
    }
    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.render('login', { message: { type: 'danger', text: 'Email or Password is incorrect' } });
    }
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    const cookieOptions = {
      expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000),
      httpOnly: true,
      path: '/'
    };
    res.cookie('jwt', token, cookieOptions);
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Login error:', error);
    return res.render('login', { message: { type: 'danger', text: 'Login failed. Please try again.' } });
  }
};

exports.logout = (req, res) => {
  res.cookie('jwt', 'logout', {
    expires: new Date(Date.now() + 2 * 1000),
    httpOnly: true,
    path: '/'
  });
  res.redirect('/');
};

exports.wishlist = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Anda harus login terlebih dahulu' });
  }
  const userId = req.user.id;
  const { product_id } = req.body;
  if (!product_id) {
    return res.status(400).json({ success: false, message: 'Product ID diperlukan.' });
  }
  try {
    const [existing] = await pool.query('SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?', [userId, product_id]);
    if (existing.length > 0) {
      await pool.query('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?', [userId, product_id]);
      return res.status(200).json({ success: true, wishlisted: false, message: 'Produk dihapus dari wishlist.' });
    } else {
      await pool.query('INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)', [userId, product_id]);
      return res.status(200).json({ success: true, wishlisted: true, message: 'Produk ditambahkan ke wishlist!' });
    }
  } catch (error) {
    console.error('Wishlist toggle error:', error);
    return res.status(500).json({ success: false, message: 'Gagal memproses wishlist.' });
  }
};

exports.removeFromWishlist = async (req, res) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Anda harus login.' });
  const productId = req.params.id;
  const userId = req.user.id;
  try {
    const [result] = await pool.query('DELETE FROM wishlist WHERE product_id = ? AND user_id = ?', [productId, userId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Item wishlist tidak ditemukan.' });
    }
    return res.json({ success: true, message: 'Berhasil menghapus dari wishlist.' });
  } catch (error) {
    console.error('Remove wishlist error:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus dari wishlist.' });
  }
};

exports.getDashboard = async (req, res) => {
    if (!req.user) {
        return res.redirect('/login');
    }
    try {
        const userId = req.user.id;
        console.log(`[AuthCtrl - getDashboard] START: Fetching dashboard data for userId: ${userId}`);

        const sqlYourProducts = 'SELECT id, name, price, image_url, stock, rating FROM products WHERE user_id = ? AND is_visible = TRUE ORDER BY created_at DESC';
        // console.log('[AuthCtrl - getDashboard DEBUG] SQL for yourProducts:', sqlYourProducts);
        const [yourProducts] = await pool.query(sqlYourProducts, [userId]);
        console.log(`[AuthCtrl - getDashboard] Fetched ${yourProducts.length} user products.`);

        const sqlWishlist = `SELECT p.id, p.name, p.price, p.image_url, p.rating, w.created_at as wishlist_added_at 
                             FROM wishlist w 
                             JOIN products p ON w.product_id = p.id 
                             WHERE w.user_id = ? AND p.is_visible = TRUE ORDER BY w.created_at DESC`;
        // console.log('[AuthCtrl - getDashboard DEBUG] SQL for wishlist:', sqlWishlist);
        const [wishlist] = await pool.query(sqlWishlist, [userId]);
        console.log(`[AuthCtrl - getDashboard] Fetched ${wishlist.length} wishlist items.`);

        console.log(`[AuthCtrl - getDashboard] Calling fetchUserCartDetails for userId: ${userId}`);
        const { itemsWithSubtotal: cartItemsDetailed, cartTotal } = await fetchUserCartDetails(userId);
        console.log(`[AuthCtrl - getDashboard] Fetched ${cartItemsDetailed.length} cart items. Total: ${cartTotal}`);
        
        const sqlSellerStats = 'SELECT AVG(rating) as average_seller_rating FROM products WHERE user_id = ? AND rating IS NOT NULL';
        // console.log('[AuthCtrl - getDashboard DEBUG] SQL for sellerStats:', sqlSellerStats);
        const [sellerStats] = await pool.query(sqlSellerStats, [userId]);
        
        const userForView = { ...req.user };
        if (sellerStats.length > 0 && sellerStats[0].average_seller_rating) {
            userForView.average_seller_rating = sellerStats[0].average_seller_rating;
        }
        console.log(`[AuthCtrl - getDashboard] Prepared userForView.`);

        const sqlOrders = `SELECT id, total_amount, status, DATE_FORMAT(order_date, '%d %M %Y, %H:%i WIB') as formatted_order_date 
                           FROM orders 
                           WHERE user_id = ? 
                           ORDER BY order_date DESC`;
        // console.log('[AuthCtrl - getDashboard DEBUG] SQL for ordersFromDB:', sqlOrders);
        const [ordersFromDB] = await pool.query(sqlOrders, [userId]);
        console.log(`[AuthCtrl - getDashboard] Fetched ${ordersFromDB.length} orders.`);

        const processedOrders = ordersFromDB.map(order => {
            let status_display = order.status.charAt(0).toUpperCase() + order.status.slice(1);
            let status_class = 'secondary';
            switch (order.status.toLowerCase()) {
                case 'completed': status_class = 'success'; status_display = 'Selesai'; break;
                case 'pending': status_class = 'warning'; status_display = 'Menunggu'; break;
                case 'shipped': status_class = 'info'; status_display = 'Dikirim'; break;
                case 'cancelled': status_class = 'danger'; status_display = 'Dibatalkan'; break;
                case 'failed': status_class = 'danger'; status_display = 'Gagal'; break;
            }
            return { ...order, status_display, status_class };
        });

        // ==================== AMBIL DATA PERCAKAPAN ====================
        const sqlConversations = `
            SELECT
                c.id as conversationId,
                c.last_message_at as lastMessageTimestamp,
                CASE WHEN c.user_one_id = ? THEN c.user_two_id ELSE c.user_one_id END as otherUserId,
                otherUser.name as otherUserName,
                otherUser.profile_image_url as otherUserAvatar,
                (SELECT cm.message_text FROM chat_messages cm WHERE cm.conversation_id = c.id ORDER BY cm.sent_at DESC LIMIT 1) as lastMessageText,
                (SELECT cm.sent_at FROM chat_messages cm WHERE cm.conversation_id = c.id ORDER BY cm.sent_at DESC LIMIT 1) as lastMessageActualTimestamp
            FROM conversations c
            JOIN users otherUser ON otherUser.id = (CASE WHEN c.user_one_id = ? THEN c.user_two_id ELSE c.user_one_id END)
            WHERE (c.user_one_id = ? OR c.user_two_id = ?)
            ORDER BY c.last_message_at DESC`;
        
        console.log(`[AuthCtrl - getDashboard] EXECUTING SQL for conversations with userId: ${userId}. SQL: ${sqlConversations.substring(0,200)}...`); // Log sebagian SQL
        const [conversationsFromDB] = await pool.query(sqlConversations, [userId, userId, userId, userId]); // userId diulang untuk setiap ?

        console.log(`[AuthCtrl - getDashboard] Raw conversationsFromDB (count: ${conversationsFromDB.length}):`, JSON.stringify(conversationsFromDB.slice(0,2), null, 2)); // Log beberapa data mentah

        const processedConversations = conversationsFromDB.map(conv => {
            let lastMsgTime = 'No messages yet';
            if (conv.lastMessageActualTimestamp) {
                const date = new Date(conv.lastMessageActualTimestamp);
                const today = new Date();
                if (!isNaN(date.getTime())) { 
                    if (date.toDateString() === today.toDateString()) {
                        lastMsgTime = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                    } else {
                        lastMsgTime = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                    }
                }
            }
            return {
                ...conv,
                formattedLastMessageTime: lastMsgTime,
                lastMessagePreview: conv.lastMessageText ? 
                    (conv.lastMessageText.length > 35 ? conv.lastMessageText.substring(0, 35) + '...' : conv.lastMessageText) 
                    : (conv.conversationId ? 'Belum ada pesan.' : '') // Tampilkan "Belum ada pesan" hanya jika ada percakapan
            };
        });
        console.log(`[AuthCtrl - getDashboard] Processed conversations for template (count: ${processedConversations.length}):`, JSON.stringify(processedConversations.slice(0,2), null, 2));
        // ==================================================================

        let activeTab = req.query.tab || 
                        (req.headers.referer && req.headers.referer.includes('#') ? req.headers.referer.split('#')[1] : null) || 
                        (req.originalUrl.includes('#') ? req.originalUrl.split('#')[1] : 'my-profile-pane');
        
        const validTabs = ['my-profile-pane', 'my-products-pane', 'my-orders-pane', 'chat-dash-pane', 'wishlist-pane-dash', 'cart-pane-dash'];

        if (!validTabs.includes(activeTab)) {
            const simplifiedActiveTab = activeTab.replace('-dash', '').replace('-pane', '');
            const matchedTab = validTabs.find(vt => vt.includes(simplifiedActiveTab));
            activeTab = matchedTab || 'my-profile-pane';
        }

        console.log('[AuthCtrl - getDashboard] Rendering dashboard with activeTab:', activeTab);
        res.render('dashboard', {
            user: userForView,
            yourProducts,
            wishlist,
            cartItemsDetailed,
            cartTotal,
            orders: processedOrders,
            conversations: processedConversations, // Pastikan ini dikirim
            pageTitle: 'My Dashboard',
            activeTab: activeTab
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
    // console.log('[UPDATE PROFILE CONTROLLER] req.body:', req.body);
    // console.log('[UPDATE PROFILE CONTROLLER] req.file:', req.file);

    const { name, email, bio } = req.body;
    const userId = req.user.id;
    let newAvatarPath = req.user.profile_image_url; 
    if (req.file) {
        newAvatarPath = '/img/avatars/' + req.file.filename;
    }

    if (!name || name.trim() === '' || !email || email.trim() === '') {
        return res.status(400).json({ success: false, message: 'Name and Email are required.' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format.' });
    }

    try {
        if (email !== req.user.email) {
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
            return res.status(404).json({ success: false, message: 'User not found or no changes made.' });
        }
        const [updatedUserRows] = await pool.query('SELECT id, name, email, profile_image_url, bio, balance FROM users WHERE id = ?', [userId]);
        // console.log('[PROFILE UPDATE CONTROLLER] Profile updated successfully for user ID:', userId);
        res.status(200).json({ 
            success: true, 
            message: 'Profile updated successfully!',
            user: updatedUserRows[0]
        });
    } catch (error) {
        console.error('[PROFILE UPDATE CONTROLLER] Error updating profile:', error);
         if (req.file && error.message && error.message.includes('Images Only')) {
            return res.status(400).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'Server error while updating profile.' });
    }
};

module.exports = exports;