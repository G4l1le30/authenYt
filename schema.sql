-- thrifts schema
-- Restore: mysql -u root -p thrifts < schema.sql
-- Idempotent: aman dijalankan berulang.

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS conversations;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS carts;
DROP TABLE IF EXISTS wishlist;
DROP TABLE IF EXISTS product_images;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS styles;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- users
-- ============================================================
CREATE TABLE users (
  id                INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  name              VARCHAR(100)     NOT NULL,
  email             VARCHAR(190)     NOT NULL,
  password          VARCHAR(255)     NOT NULL COMMENT 'bcrypt hash',
  profile_image_url VARCHAR(500)     NULL,
  bio               TEXT             NULL,
  balance           DECIMAL(12, 2)   NOT NULL DEFAULT 0.00,
  created_at        DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- categories
-- ============================================================
CREATE TABLE categories (
  id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name       VARCHAR(100)  NOT NULL,
  slug       VARCHAR(100)  NULL,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- styles (e.g. "Casual", "Formal")
-- ============================================================
CREATE TABLE styles (
  id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name       VARCHAR(100)  NOT NULL,
  slug       VARCHAR(100)  NOT NULL,
  image_url  VARCHAR(500)  NULL,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_styles_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- products
-- available_colors / available_sizes = CSV string (e.g. "Red,Blue")
-- ============================================================
CREATE TABLE products (
  id               INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  user_id          INT UNSIGNED     NOT NULL COMMENT 'seller',
  category_id      INT UNSIGNED     NULL,
  style_id         INT UNSIGNED     NULL,
  name             VARCHAR(255)     NOT NULL,
  description      TEXT             NULL,
  price            DECIMAL(12, 2)   NOT NULL DEFAULT 0.00,
  stock            INT              NOT NULL DEFAULT 0,
  image_url        VARCHAR(500)     NULL,
  available_colors VARCHAR(500)     NULL COMMENT 'CSV: "Red,Blue,Green"',
  available_sizes  VARCHAR(500)     NULL COMMENT 'CSV: "S,M,L"',
  rating           DECIMAL(3, 1)    NULL,
  review_count     INT              NOT NULL DEFAULT 0,
  is_visible       TINYINT(1)       NOT NULL DEFAULT 1,
  created_at       DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_products_user_id (user_id),
  KEY idx_products_category_id (category_id),
  KEY idx_products_style_id (style_id),
  KEY idx_products_is_visible (is_visible),
  CONSTRAINT fk_products_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_products_category
    FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL,
  CONSTRAINT fk_products_style
    FOREIGN KEY (style_id) REFERENCES styles (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- product_images (multiple images per product)
-- ============================================================
CREATE TABLE product_images (
  id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  product_id INT UNSIGNED  NOT NULL,
  image_url  VARCHAR(500)  NOT NULL,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_product_images_product_id (product_id),
  CONSTRAINT fk_product_images_product
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- wishlist
-- ============================================================
CREATE TABLE wishlist (
  id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED  NOT NULL,
  product_id INT UNSIGNED  NOT NULL,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wishlist_user_product (user_id, product_id),
  CONSTRAINT fk_wishlist_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_wishlist_product
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- carts (nama tabel: carts, BUKAN cart)
-- (user_id, product_id, color, size) adalah variant identifier
-- ============================================================
CREATE TABLE carts (
  id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED  NOT NULL,
  product_id INT UNSIGNED  NOT NULL,
  quantity   INT           NOT NULL DEFAULT 1,
  color      VARCHAR(50)   NULL,
  size       VARCHAR(50)   NULL,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_carts_user_id (user_id),
  KEY idx_carts_product_id (product_id),
  CONSTRAINT fk_carts_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_carts_product
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- orders
-- status values used in code: 'completed', 'pending', 'shipped', 'cancelled', 'failed'
-- ============================================================
CREATE TABLE orders (
  id               INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  user_id          INT UNSIGNED     NOT NULL,
  total_amount     DECIMAL(12, 2)   NOT NULL DEFAULT 0.00,
  status           VARCHAR(20)      NOT NULL DEFAULT 'pending',
  payment_method   VARCHAR(50)      NOT NULL DEFAULT 'user_balance',
  shipping_address TEXT             NULL,
  order_date       DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_orders_user_id (user_id),
  KEY idx_orders_status (status),
  KEY idx_orders_order_date (order_date),
  CONSTRAINT fk_orders_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- order_items
-- price_at_purchase = snapshot harga saat checkout
-- ============================================================
CREATE TABLE order_items (
  id                INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  order_id          INT UNSIGNED     NOT NULL,
  product_id        INT UNSIGNED     NOT NULL,
  quantity          INT              NOT NULL DEFAULT 1,
  price_at_purchase DECIMAL(12, 2)   NOT NULL DEFAULT 0.00,
  color             VARCHAR(50)      NULL,
  size              VARCHAR(50)      NULL,
  PRIMARY KEY (id),
  KEY idx_order_items_order_id (order_id),
  KEY idx_order_items_product_id (product_id),
  CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- conversations
-- INVARIANT: user_one_id < user_two_id (enforced di app.js:227)
-- ============================================================
CREATE TABLE conversations (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_one_id     INT UNSIGNED  NOT NULL,
  user_two_id     INT UNSIGNED  NOT NULL,
  last_message_at DATETIME      NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_conversations_pair (user_one_id, user_two_id),
  KEY idx_conversations_user_one (user_one_id),
  KEY idx_conversations_user_two (user_two_id),
  CONSTRAINT fk_conversations_user_one
    FOREIGN KEY (user_one_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_conversations_user_two
    FOREIGN KEY (user_two_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT chk_conversations_order
    CHECK (user_one_id < user_two_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- chat_messages
-- ============================================================
CREATE TABLE chat_messages (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  conversation_id INT UNSIGNED  NOT NULL,
  sender_id       INT UNSIGNED  NOT NULL,
  receiver_id     INT UNSIGNED  NOT NULL,
  message_text    TEXT          NOT NULL,
  sent_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_chat_messages_conversation_id (conversation_id),
  KEY idx_chat_messages_sender_id (sender_id),
  KEY idx_chat_messages_receiver_id (receiver_id),
  CONSTRAINT fk_chat_messages_conversation
    FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
  CONSTRAINT fk_chat_messages_sender
    FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_chat_messages_receiver
    FOREIGN KEY (receiver_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- reviews (rating 1-5)
-- ============================================================
CREATE TABLE reviews (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  product_id  INT UNSIGNED  NOT NULL,
  user_id     INT UNSIGNED  NOT NULL,
  rating      TINYINT       NOT NULL,
  review_text TEXT          NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reviews_product_id (product_id),
  KEY idx_reviews_user_id (user_id),
  CONSTRAINT fk_reviews_product
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT chk_reviews_rating
    CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
