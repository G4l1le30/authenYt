const express=require('express')
const authController=require('../controllers/auth')
const authMiddleware = require('../middleware/auth');
const router=express.Router()
router.post('/register', authController.register)
router.post('/login', authController.login);
router.get('/logout', authController.logout);

// Wishlist routes
router.post('/wishlist', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false });
  }

  const { product_id } = req.body;
  
  db.query(
    'INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)',
    [req.user.id, product_id],
    (error, result) => {
      if (error) {
        console.log(error);
        return res.status(500).json({ success: false });
      }
      res.json({ 
        success: true, 
        wishlist_id: result.insertId 
      });
    }
  );
});

router.delete('/wishlist/:id', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false });
  }

  db.query(
    'DELETE FROM wishlist WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id],
    (error) => {
      if (error) {
        console.log(error);
        return res.status(500).json({ success: false });
      }
      res.json({ success: true });
    }
  );
});

router.get('/wishlist', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false });
  }

  db.query(
    `SELECT w.id, p.* 
     FROM wishlist w 
     JOIN products p ON w.product_id = p.id 
     WHERE w.user_id = ?`,
    [req.user.id],
    (error, results) => {
      if (error) {
        console.log(error);
        return res.status(500).json({ success: false });
      }
      res.json({ success: true, wishlist: results });
    }
  );
});
module.exports = router;
