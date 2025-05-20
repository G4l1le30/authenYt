const jwt = require('jsonwebtoken');
const mysql = require('mysql');

// Database connection
const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
});

exports.isLoggedIn = (req, res, next) => {
    // Check if token exists
    if (!req.cookies.jwt) {
        return res.redirect('/login');
    }

    try {
        // Verify token
        const decoded = jwt.verify(req.cookies.jwt, process.env.JWT_SECRET);
        
        // Check if user still exists
        db.query('SELECT * FROM users WHERE id = ?', [decoded.id], (error, result) => {
            if (error) {
                console.log(error);
                return res.redirect('/login');
            }

            if (result.length === 0) {
                return res.redirect('/login');
            }

            // User exists, store user data in request
            req.user = result[0];
            return next();
        });
    } catch (error) {
        console.log(error);
        return res.redirect('/login');
    }
};

exports.getUser = (req, res, next) => {
    if (!req.cookies.jwt) {
        res.locals.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(req.cookies.jwt, process.env.JWT_SECRET);
        
        db.query('SELECT * FROM users WHERE id = ?', [decoded.id], (error, result) => {
            if (error || result.length === 0) {
                res.locals.user = null;
                return next();
            }

            // Pass user data to template
            res.locals.user = result[0];
            return next();
        });
    } catch (error) {
        console.log(error);
        res.locals.user = null;
        return next();
    }
};

exports.protect = (req, res, next) => {
    const token = req.cookies.jwt;

    if (!token) {
        return res.redirect('/login');
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.redirect('/login');
        }

        db.query('SELECT * FROM users WHERE id = ?', [decoded.id], (err, results) => {
            if (!results || results.length === 0) {
                return res.redirect('/login');
            }

            req.user = results[0];
            next();
        });
    });
};