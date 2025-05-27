const pool = require('../db'); 

// Add to cart
exports.addToCart = async (req, res) => {
  console.log('addToCart called with body:', req.body);

  const user_id = req.user.id;
  const { product_id, quantity } = req.body;

  if (!product_id || !quantity) {
    console.log('Missing product_id or quantity');
    return res.status(400).json({ message: 'Missing product_id or quantity' });
  }

  try {
    console.log('Checking existing cart item');
    const [existing] = await pool.query(
      'SELECT * FROM carts WHERE user_id = ? AND product_id = ?',
      [user_id, product_id]
    );
    console.log('Existing cart items:', existing);

    if (existing.length > 0) {
      console.log('Updating quantity of existing item');
      await pool.query(
        'UPDATE carts SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?',
        [quantity, user_id, product_id]
      );
      console.log('Update query succeeded');
    } else {
      console.log('Inserting new cart item');
      await pool.query(
        'INSERT INTO carts (user_id, product_id, quantity) VALUES (?, ?, ?)',
        [user_id, product_id, quantity]
      );
      console.log('Insert query succeeded');
    }

    res.status(200).json({ message: 'Product added to cart' });
  } catch (err) {
    console.error('Error in addToCart:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get cart for logged-in user

exports.getCart = async (req, res) => {
    if (!req.user) { // Sebenarnya sudah diproteksi oleh middleware di routes/pages.js
        return res.redirect('/login');
    }
    const userId = req.user.id;

    try {
        const [cartItemsRaw] = await pool.query(`
            SELECT 
                c.id AS cart_item_id,         -- ID item di tabel carts
                c.quantity, 
                p.id AS product_id, 
                p.name AS product_name,       -- Menggunakan alias agar jelas
                p.price AS product_price, 
                p.image_url AS product_image_url,
                p.stock AS product_stock      -- Ambil stok produk juga
            FROM carts c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = ?
            ORDER BY c.created_at DESC
        `, [userId]);

        let cartTotal = 0;
        const itemsWithSubtotal = cartItemsRaw.map(item => {
            const price = parseFloat(item.product_price);
            const quantity = parseInt(item.quantity);
            const subtotal = (isNaN(price) || isNaN(quantity)) ? 0 : price * quantity;
            cartTotal += subtotal;
            return { 
                ...item,
                // Menggunakan nama properti yang konsisten dengan alias di query
                name: item.product_name, 
                price: item.product_price,
                image_url: item.product_image_url,
                stock: item.product_stock,
                quantity: quantity, // Pastikan quantity adalah angka
                subtotal: subtotal.toFixed(2) // Format subtotal menjadi 2 desimal
            };
        });

        console.log(`[GET CART PAGE] User ID: ${userId}, Cart Items Fetched: ${itemsWithSubtotal.length}, Total: ${cartTotal}`);
        if (itemsWithSubtotal.length > 0) {
            console.log('[GET CART PAGE] First cart item:', JSON.stringify(itemsWithSubtotal[0], null, 2));
        }

        res.render('cart', { // Merender template cart.hbs
            pageTitle: 'My Shopping Cart',
            cartItems: itemsWithSubtotal, // Ganti nama variabel ini agar lebih jelas
            cartTotal: cartTotal.toFixed(2), // Format total menjadi 2 desimal
            user: req.user 
        });

    } catch (error) {
        console.error('Error fetching cart page:', error);
        res.status(500).render('cart', {
            pageTitle: 'My Shopping Cart',
            cartItems: [],
            cartTotal: 0,
            user: req.user,
            errorMessage: 'Failed to load your cart. Please try again.'
        });
    }
};

// Update cart item quantity
exports.updateCartItem = async (req, res) => {
  const user_id = req.user.id;
  const cartItemId = req.params.id;
  const { quantity } = req.body;

  if (!quantity || quantity < 1) {
    return res.status(400).json({ message: 'Invalid quantity' });
  }

  try {
    const [check] = await pool.query('SELECT * FROM carts WHERE id = ? AND user_id = ?', [cartItemId, user_id]);

    if (check.length === 0) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    await pool.query('UPDATE carts SET quantity = ? WHERE id = ? AND user_id = ?', [quantity, cartItemId, user_id]);

    res.status(200).json({ message: 'Cart item updated' });
  } catch (err) {
    console.error('Error in updateCartItem:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete item from cart
exports.deleteCartItem = async (req, res) => {
  const user_id = req.user.id;
  const cartItemId = req.params.id;

  try {
    const [check] = await pool.query('SELECT * FROM carts WHERE id = ? AND user_id = ?', [cartItemId, user_id]);

    if (check.length === 0) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    await pool.query('DELETE FROM carts WHERE id = ? AND user_id = ?', [cartItemId, user_id]);

    res.status(200).json({ message: 'Cart item removed' });
  } catch (err) {
    console.error('Error in deleteCartItem:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
