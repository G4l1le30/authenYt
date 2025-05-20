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

// Middleware to check user status for all routes
exports.checkUser = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;

    if (!token) {
      req.user = null;
      return next();
    }

    try {
      // Verify token
      const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
      
      // Add user ID to request object
      req.user = { id: decoded.id };
    } catch (error) {
      req.user = null;
    }
    
    next();
  } catch (error) {
    console.error(error);
    req.user = null;
    next();
  }
};