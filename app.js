const express = require('express');
const app = express();
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });
const cookieParser = require('cookie-parser');
const mysql = require('mysql');

// Database connection
const db = mysql.createConnection({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE
});

// Middleware and parsers
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Static files folder
const publicDirectory = path.join(__dirname, './public/');
app.use(express.static(publicDirectory));

// View engine setup
app.set('view engine', 'hbs');

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.log(err);
  } else {
    console.log('MySQL connected');
  }
});

// Handlebars helper
const hbs = require('hbs');
hbs.registerHelper('includes', function (array, value) {
  if (!array) return false;
  const strArray = array.map(String);
  return strArray.includes(String(value));
});

// Import routes and middleware
const pagesRoutes = require('./routes/pages');
const authRoutes = require('./routes/auth');
// You DO NOT have ./routes/cart, so don't require it!
const cartRoutes = require('./routes/cart');
app.use('/api/cart', cartRoutes);

// Use routes
app.use('/', pagesRoutes);
app.use('/auth', authRoutes);

// Start server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
