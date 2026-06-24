// app.js
const express = require('express');
const app = express();
const path = require('path');
const cookieParser = require('cookie-parser');
const hbs = require('hbs');
const helmet = require('helmet');

const pool = require('./db');
const authMiddleware = require('./middleware/auth');
const registerHelpers = require('./views/helpers');

// Routes
const pagesRoutes = require('./routes/pages');
const authRoutes = require('./routes/auth');
const productApiRoutes = require('./routes/product');
const cartRoutes = require('./routes/cart');
const checkoutRoutes = require('./routes/checkout');
const reviewApiRoutes = require('./routes/reviewRoutes');

// Middleware dan parsers
app.use(helmet({
  contentSecurityPolicy: false // Menonaktifkan pemblokiran resource eksternal untuk development
}));
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Static files folder
const publicDirectory = path.join(__dirname, './public/');
app.use(express.static(publicDirectory));

// View engine setup
const viewsPath = path.join(__dirname, './views');
const partialsPath = path.join(__dirname, './views/partials');
app.set('view engine', 'hbs');
app.set('view cache', false); // Disable view cache for development hot-reload
app.set('views', viewsPath);
hbs.registerPartials(partialsPath);

// Handlebars helpers
registerHelpers();

// Inject user ke semua views (untuk HTTP requests)
app.use(authMiddleware.getUser);

// Healthcheck
app.get('/health', async (req, res) => {
  try {
    await pool.ping();
    res.json({ status: 'ok', db: 'up' });
  } catch (err) {
    res.status(503).json({ status: 'degraded', db: 'down', error: err.code || err.message });
  }
});

// Mount Routes
app.use('/auth', authRoutes); // authRoutes hanya dimount satu kali dengan '/auth'
app.use('/api/products', productApiRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api', reviewApiRoutes);
app.use('/', pagesRoutes); 

module.exports = app;
