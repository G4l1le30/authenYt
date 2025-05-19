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