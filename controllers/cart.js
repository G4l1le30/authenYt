const db = require('../db');

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
    const [existing] = await db.query(
      'SELECT * FROM carts WHERE user_id = ? AND product_id = ?',
      [user_id, product_id]
    );
    console.log('Existing cart items:', existing);

    if (existing.length > 0) {
      console.log('Updating quantity of existing item');
      await db.query(
        'UPDATE carts SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?',
        [quantity, user_id, product_id]
      );
      console.log('Update query succeeded');
    } else {
      console.log('Inserting new cart item');
      await db.query(
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
  const user_id = req.user.id;

  try {
    const [items] = await db.query(`
      SELECT c.id, c.product_id, p.name, p.price, p.image, c.quantity
      FROM carts c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
    `, [user_id]);

    res.render('cart', { cartItems: items });
  } catch (err) {
    console.error('Error in getCart:', err);
    res.status(500).json({ message: 'Internal server error' });
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
    const [check] = await db.query('SELECT * FROM carts WHERE id = ? AND user_id = ?', [cartItemId, user_id]);

    if (check.length === 0) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    await db.query('UPDATE carts SET quantity = ? WHERE id = ? AND user_id = ?', [quantity, cartItemId, user_id]);

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
    const [check] = await db.query('SELECT * FROM carts WHERE id = ? AND user_id = ?', [cartItemId, user_id]);

    if (check.length === 0) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    await db.query('DELETE FROM carts WHERE id = ? AND user_id = ?', [cartItemId, user_id]);

    res.status(200).json({ message: 'Cart item removed' });
  } catch (err) {
    console.error('Error in deleteCartItem:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
