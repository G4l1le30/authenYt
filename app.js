const express = require('express');
const app = express();
const path = require('path');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const mysql = require('mysql');
const hbs = require('hbs');

// Konfigurasi .env
dotenv.config({ path: './.env' });

// Middleware
app.use(cookieParser());
app.use(express.static(path.join(__dirname, './public')));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Set view engine
app.set('view engine', 'hbs');

// Helper untuk format harga
hbs.registerHelper('formatPrice', function(price) {
  return new Intl.NumberFormat('id-ID').format(price);
});

// Koneksi MySQL
const db = mysql.createConnection({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE
});

db.connect((err) => {
  if (err) {
    console.log(err);
  } else {
    console.log("MySQL connected");
  }
});

// Routes
app.use('/', require('./routes/pages'));
app.use('/auth', require('./routes/auth'));

// Port
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});