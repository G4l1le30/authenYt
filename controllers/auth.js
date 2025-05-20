const mysql = require('mysql')
const jwt=require('jsonwebtoken')
const bcrypt = require('bcrypt') // GANTI dari bcryptjs ke bcrypt
const dotenv = require('dotenv')
dotenv.config()

// Database connection - gunakan konfigurasi yang sama seperti di app.js
const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
})

exports.register = async (req, res) => {
    console.log(req.body)
    
    const { name, email, password, passwordConfirm } = req.body
    
    // Basic validation
    if (!name || !email || !password || !passwordConfirm) {
        return res.render('register', {
            message: {
                type: 'danger',
                text: 'Please fill in all fields'
            }
        })
    }
    
    // Password confirmation check
    if (password !== passwordConfirm) {
        return res.render('register', {
            message: {
                type: 'danger',
                text: 'Passwords do not match'
            }
        })
    }
    
    // Password length check
    if (password.length < 6) {
        return res.render('register', {
            message: {
                type: 'danger',
                text: 'Password must be at least 6 characters long'
            }
        })
    }
    
    // Check if user already exists
    db.query('SELECT email FROM users WHERE email = ?', [email], async (error, results) => {
        if (error) {
            console.log(error)
            return res.render('register', {
                message: {
                    type: 'danger',
                    text: 'Database error occurred'
                }
            })
        }
        
        if (results.length > 0) {
            return res.render('register', {
                message: {
                    type: 'danger',
                    text: 'That email is already in use'
                }
            })
        }
        
        // Hash the password
        let hashedPassword = await bcrypt.hash(password, 8)
        
        // Insert new user
        db.query('INSERT INTO users SET ?', {
            name: name,
            email: email,
            password: hashedPassword
        }, (error, results) => {
            if (error) {
                console.log(error)
                return res.render('register', {
                    message: {
                        type: 'danger',
                        text: 'Registration failed. Please try again.'
                    }
                })
            } else {
                console.log(results)
                return res.render('register', {
                    message: {
                        type: 'success',
                        text: 'User registered successfully!'
                    }
                })
            }
        })
    })
}
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Basic validation
        if (!email || !password) {
            return res.render('login', {
                message: {
                    type: 'danger',
                    text: 'Please provide an email and password'
                }
            });
        }

        // Check if user exists and password is correct
        db.query('SELECT * FROM users WHERE email = ?', [email], async (error, results) => {
            if (error) {
                console.log(error);
                return res.render('login', {
                    message: {
                        type: 'danger',
                        text: 'Database error occurred'
                    }
                });
            }

            // If no user found or password doesn't match
            if (results.length === 0 || !(await bcrypt.compare(password, results[0].password))) {
                return res.render('login', {
                    message: {
                        type: 'danger',
                        text: 'Email or Password is incorrect'
                    }
                });
            }

            // User authenticated, create JWT token
            const user = results[0];
            const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
                expiresIn: process.env.JWT_EXPIRES_IN
            });

            // Set cookie options
            const cookieOptions = {
                expires: new Date(
                    Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000
                ),
                httpOnly: true
            };

            // Send token as cookie
            res.cookie('jwt', token, cookieOptions);
            
            // Send success response
            return res.redirect('/dashboard');
        });
    } catch (error) {
        console.log(error);
    }
};

exports.logout = (req, res) => {
    // Clear JWT cookie
    res.cookie('jwt', 'logout', {
        expires: new Date(Date.now() + 2 * 1000),
        httpOnly: true
    });

    res.redirect('/');
};

// Get user data
exports.getUserData = async (req, res, next) => {
  try {
    if (req.user) {
      const [userData] = await db.query('SELECT id, name, email FROM users WHERE id = ?', [req.user.id]);
      req.userData = userData[0];
    }
    next();
  } catch (error) {
    console.error(error);
    next();
  }
};

// Wishlist functions
exports.toggleWishlist = async (req, res) => {
  try {
    // Ensure user is logged in
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Please login to add items to your wishlist' 
      });
    }

    const { product_id } = req.body;
    const user_id = req.user.id;

    // Check if item already exists in wishlist
    const [existing] = await db.query(
      'SELECT * FROM wishlist WHERE user_id = ? AND product_id = ?', 
      [user_id, product_id]
    );

    if (existing.length > 0) {
      // Item exists, remove from wishlist
      await db.query(
        'DELETE FROM wishlist WHERE user_id = ? AND product_id = ?', 
        [user_id, product_id]
      );
      
      return res.json({ 
        success: true, 
        message: 'Item removed from wishlist',
        action: 'removed'
      });
    } else {
      // Item doesn't exist, add to wishlist
      await db.query(
        'INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)', 
        [user_id, product_id]
      );
      
      return res.json({ 
        success: true, 
        message: 'Item added to wishlist',
        action: 'added'
      });
    }
  } catch (error) {
    console.error('Wishlist error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error while updating wishlist' 
    });
  }
};

// Get user's wishlist
exports.getWishlist = async (req, res, next) => {
  try {
    if (req.user) {
      // Join wishlist with products to get full product details
      const [wishlist] = await db.query(`
        SELECT w.id, w.product_id, p.name, p.price, p.image_url, p.description 
        FROM wishlist w
        JOIN products p ON w.product_id = p.id
        WHERE w.user_id = ?
      `, [req.user.id]);
      
      req.wishlist = wishlist;
    } else {
      req.wishlist = [];
    }
    next();
  } catch (error) {
    console.error('Get wishlist error:', error);
    req.wishlist = [];
    next();
  }
};

// Remove item from wishlist
exports.removeFromWishlist = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Please login to manage your wishlist' 
      });
    }

    const { wishlist_id } = req.body;

    await db.query('DELETE FROM wishlist WHERE id = ? AND user_id = ?', [wishlist_id, req.user.id]);
    
    return res.json({ 
      success: true, 
      message: 'Item removed from wishlist' 
    });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error while removing from wishlist' 
    });
  }
};