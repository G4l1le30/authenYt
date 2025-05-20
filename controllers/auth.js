const mysql = require('mysql')
const jwt=require('jsonwebtoken')
const bcrypt = require('bcrypt') // GANTI dari bcryptjs ke bcrypt
const dotenv = require('dotenv')

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
//wishlist
exports.wishlist = (req, res) => {
    const { product_id } = req.body;

    if (!req.user) {
        return res.status(401).json({ message: 'Anda harus login terlebih dahulu' });
    }

    const userId = req.user.id;

    const query = 'INSERT IGNORE INTO wishlist (user_id, product_id) VALUES (?, ?)';
    db.query(query, [userId, product_id], (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).json({ message: 'Gagal menambahkan ke wishlist' });
        }
        return res.status(200).json({ message: 'Berhasil ditambahkan ke wishlist!' });
    });
};

exports.getWishlist = (req, res) => {
    if (!req.user) return res.redirect('/login');

    const userId = req.user.id;

    const query = `
        SELECT products.* FROM wishlist
        JOIN products ON wishlist.product_id = products.id
        WHERE wishlist.user_id = ?
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error(err);
            return res.render('dashboard', { wishlist: [] });
        }

        return res.render('dashboard', {
            user: req.user,
            wishlist: results
        });
    });
};
