-- thrifts seed (opsional)
-- Insert: 2 users, 3 categories, 4 styles, 5 products
-- Password untuk kedua user: 'demo1234'
--
-- Cara pakai: mysql -u root -p thrifts < seed.sql

-- Users
INSERT INTO users (id, name, email, password, balance) VALUES
  (1, 'Demo Seller', 'seller@demo.test', '$2b$08$vRJrsIZ26C7syMCvDlxd.uviGuno/EJE3AlqkwXX6WooxFy4CItNS', 1000000.00),
  (2, 'Demo Buyer',  'buyer@demo.test',  '$2b$08$vRJrsIZ26C7syMCvDlxd.uviGuno/EJE3AlqkwXX6WooxFy4CItNS', 500000.00);

-- Categories
INSERT INTO categories (id, name, slug) VALUES
  (1, 'Dress',   'dress'),
  (2, 'Top',     'top'),
  (3, 'Bottom',  'bottom');

-- Styles
INSERT INTO styles (id, name, slug, image_url) VALUES
  (1, 'Casual',  'casual',  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80'),
  (2, 'Formal',  'formal',  'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80'),
  (3, 'Sporty',  'sporty',  'https://images.unsplash.com/photo-1483721310020-03333e577078?auto=format&fit=crop&w=800&q=80'),
  (4, 'Vintage', 'vintage', 'https://images.unsplash.com/photo-1550614000-4b95f269a910?auto=format&fit=crop&w=800&q=80');

-- Products (seller = user id 1)
INSERT INTO products (id, user_id, category_id, style_id, name, description, price, stock, image_url, available_colors, available_sizes, rating, review_count) VALUES
  (1, 1, 1, 1, 'Floral Summer Dress',  'Bahan adem, motif floral.',     149000.00,  20, 'https://images.unsplash.com/photo-1572804013309-82a89b4f945a?auto=format&fit=crop&w=800&q=80', 'Red,Blue,Yellow',  'S,M,L',   4.5, 0),
  (2, 1, 2, 2, 'White Formal Blouse',  'Cocok untuk kerja & meeting.',   99000.00,  35, 'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?auto=format&fit=crop&w=800&q=80', 'White,Black',      'S,M,L,XL',4.2, 0),
  (3, 1, 3, 3, 'Slim Fit Chino Pants','Stretch, tidak mudah kusut.',   179000.00,  15, 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=800&q=80', 'Khaki,Navy,Black', '30,32,34',4.7, 0),
  (4, 1, 1, 4, 'Vintage Midi Dress',   'Motif retro tahun 70-an.',     199000.00,  10, 'https://images.unsplash.com/photo-1612336307429-8a898d10e223?auto=format&fit=crop&w=800&q=80', 'Brown,Cream',      'M,L',     4.8, 0),
  (5, 1, 2, 1, 'Casual T-Shirt',       'Bahan cotton combed 30s.',       49000.00, 100, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80', 'Red,Black,White',  'S,M,L',   4.3, 0);
