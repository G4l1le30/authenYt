const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../db');  // mysql2/promise pool
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
      httpOnly: true
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
    expires: new Date(Date.now() + 2 * 1000),
    httpOnly: true
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

exports.getDashboard = async (req, res) => {
  if (!req.user) return res.redirect('/login');

  const userId = req.user.id;

  try {
    const [wishlist] = await pool.query(`
      SELECT products.* FROM wishlist
      JOIN products ON wishlist.product_id = products.id
      WHERE wishlist.user_id = ?
    `, [userId]);

    const [yourProducts] = await pool.query('SELECT * FROM products WHERE user_id = ?', [userId]);

    res.render('dashboard', {
      user: req.user,
      wishlist,
      yourProducts
    });
  } catch (error) {
    console.error('Dashboard load error:', error);
    res.render('dashboard', {
      user: req.user,
      wishlist: [],
      yourProducts: [],
      error: 'Failed to load dashboard data'
    });
  }
};
