// controllers/cart.js
const pool = require('../db');

// Add to cart (dengan penanganan warna dan ukuran)
exports.addToCart = async (req, res) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'Silakan login untuk menambahkan ke keranjang.' });
    }
    const user_id = req.user.id;
    // Ambil color dan size dari req.body
    const { product_id, quantity, color, size } = req.body;
    const numQuantity = parseInt(quantity);

    if (!product_id || isNaN(numQuantity) || numQuantity <= 0) {
        return res.status(400).json({ success: false, message: 'ID produk atau kuantitas tidak valid.' });
    }

    // Normalisasi color dan size (null jika kosong/undefined)
    const itemColor = color || null;
    const itemSize = size || null;

    try {
        // Cek apakah produk ada dan stok mencukupi
        const [productRows] = await pool.query('SELECT stock, name FROM products WHERE id = ? AND is_visible = TRUE', [product_id]);
        if (productRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Produk tidak ditemukan atau tidak tersedia.' });
        }
        const productStock = productRows[0].stock;
        const productName = productRows[0].name;

        // Cek apakah item dengan varian yang sama sudah ada di keranjang
        const [existing] = await pool.query(
            `SELECT id, quantity FROM carts 
             WHERE user_id = ? AND product_id = ? 
             AND (color IS NULL AND ? IS NULL OR color = ?) 
             AND (size IS NULL AND ? IS NULL OR size = ?)`,
            [user_id, product_id, itemColor, itemColor, itemSize, itemSize]
        );

        let totalQuantityInCart = 0;
        if (existing.length > 0) {
            totalQuantityInCart = existing[0].quantity;
        }
        
        // Jangan izinkan total kuantitas (yang sudah ada + baru) melebihi stok
        if ((totalQuantityInCart + numQuantity) > productStock) {
             return res.status(400).json({ 
                success: false, 
                message: `Stok produk "${productName}" tidak mencukupi. Sisa stok: ${productStock}. Anda sudah memiliki ${totalQuantityInCart} di keranjang.`
            });
        }

        if (existing.length > 0) {
            // Item dengan varian yang sama sudah ada, update kuantitasnya
            await pool.query(
                'UPDATE carts SET quantity = quantity + ? WHERE id = ?',
                [numQuantity, existing[0].id]
            );
        } else {
            // Item baru atau varian baru, insert baris baru
            await pool.query(
                'INSERT INTO carts (user_id, product_id, quantity, color, size) VALUES (?, ?, ?, ?, ?)',
                [user_id, product_id, numQuantity, itemColor, itemSize]
            );
        }
        
        // Ambil jumlah total item di keranjang pengguna untuk update UI navbar
        const [cartCountResult] = await pool.query(
            'SELECT SUM(quantity) as totalItems FROM carts WHERE user_id = ?',
            [user_id]
        );
        const cartItemCount = cartCountResult[0] ? cartCountResult[0].totalItems : 0;

        res.status(200).json({ success: true, message: 'Produk ditambahkan ke keranjang!', cartItemCount });

    } catch (err) {
        console.error('Error in addToCart:', err);
        res.status(500).json({ success: false, message: 'Internal server error saat menambahkan ke keranjang.' });
    }
};

// Get cart for logged-in user (Fungsi ini akan menjadi basis untuk data di dashboard dan halaman checkout)
async function fetchUserCartDetails(userId, connection = pool) { // Tambahkan parameter connection opsional
    const [cartItemsRaw] = await connection.query(`
        SELECT 
            c.id AS cart_item_id, 
            c.quantity, 
            c.color,      -- Ambil warna dari keranjang
            c.size,       -- Ambil ukuran dari keranjang
            p.id AS product_id, 
            p.name AS product_name, 
            p.price AS product_price, 
            p.image_url AS product_image_url,
            p.stock AS product_stock,
            p.is_visible AS product_is_visible
        FROM carts c
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ? 
        ORDER BY c.created_at DESC 
    `, [userId]); // Jangan filter is_visible di sini, biarkan user lihat apa yang ada di cartnya dulu, validasi saat checkout

    let cartTotal = 0;
    const itemsWithSubtotal = cartItemsRaw.map(item => {
        const price = parseFloat(item.product_price);
        const quantity = parseInt(item.quantity);
        let subtotal = (isNaN(price) || isNaN(quantity)) ? 0 : price * quantity;
        let itemErrorMessage = null;

        if (!item.product_is_visible) {
            itemErrorMessage = "Produk ini sudah tidak tersedia.";
            subtotal = 0; // Tidak dihitung jika tidak tersedia
        } else if (quantity > item.product_stock) {
            itemErrorMessage = `Stok tidak cukup (tersisa ${item.product_stock}). Kuantitas akan disesuaikan.`;
            // Opsi: sesuaikan kuantitas di sini atau biarkan checkout yang menangani
            // Jika disesuaikan di sini, subtotal juga perlu dihitung ulang.
            // Untuk tampilan, lebih baik biarkan kuantitas asli dan beri pesan.
            // subtotal = price * item.product_stock; // Contoh jika kuantitas disesuaikan
        }
        
        cartTotal += item.product_is_visible ? subtotal : 0; // Hanya tambahkan subtotal jika produk visible

        return {
            ...item,
            name: item.product_name,
            price: item.product_price,
            image_url: item.product_image_url,
            stock: item.product_stock,
            is_visible: item.product_is_visible,
            quantity: quantity,
            subtotal: subtotal, // Kirim angka, format di Handlebars
            errorMessage: itemErrorMessage
        };
    });

    return { itemsWithSubtotal, cartTotal };
}
exports.fetchUserCartDetails = fetchUserCartDetails; // Ekspor fungsi ini

// Fungsi ini tidak lagi merender view, tapi bisa dipanggil oleh controller lain
// Atau, jika Anda masih punya rute API GET /api/cart, ini bisa digunakan
exports.getCartData = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: "Silakan login." });
    }
    const userId = req.user.id;
    try {
        const { itemsWithSubtotal, cartTotal } = await fetchUserCartDetails(userId);
        res.status(200).json({
            success: true,
            cartItems: itemsWithSubtotal,
            cartTotal: cartTotal
        });
    } catch (error) {
        console.error('Error fetching cart data API:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil data keranjang.' });
    }
};


// Update cart item quantity
exports.updateCartItem = async (req, res) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'Silakan login.' });
    }
    const user_id = req.user.id;
    const cartItemId = req.params.id; // Ini adalah ID dari tabel 'carts'
    const { quantity, product_id } = req.body; // product_id diperlukan untuk cek stok
    const numQuantity = parseInt(quantity);

    if (isNaN(numQuantity) || numQuantity <= 0) {
        return res.status(400).json({ success: false, message: 'Kuantitas tidak valid.' });
    }

    try {
        const [cartItemRows] = await pool.query('SELECT product_id FROM carts WHERE id = ? AND user_id = ?', [cartItemId, user_id]);
        if (cartItemRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Item keranjang tidak ditemukan.' });
        }
        // const actualProductId = product_id || cartItemRows[0].product_id; // Gunakan product_id dari body jika ada, jika tidak dari DB
        
        const [productRows] = await pool.query('SELECT stock, name FROM products WHERE id = ?', [cartItemRows[0].product_id]);
        if (productRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
        }
        const productStock = productRows[0].stock;
        const productName = productRows[0].name;

        if (numQuantity > productStock) {
            return res.status(400).json({ 
                success: false, 
                message: `Stok produk "${productName}" tidak mencukupi (tersisa ${productStock}). Kuantitas tidak diubah.` 
            });
        }

        await pool.query('UPDATE carts SET quantity = ? WHERE id = ? AND user_id = ?', [numQuantity, cartItemId, user_id]);
        
        // Ambil jumlah total item di keranjang pengguna untuk update UI navbar
        const [cartCountResult] = await pool.query(
            'SELECT SUM(quantity) as totalItems FROM carts WHERE user_id = ?',
            [user_id]
        );
        const cartItemCount = cartCountResult[0] ? cartCountResult[0].totalItems : 0;

        res.status(200).json({ success: true, message: 'Kuantitas item keranjang diperbarui!', cartItemCount });
    } catch (err) {
        console.error('Error in updateCartItem:', err);
        res.status(500).json({ success: false, message: 'Internal server error saat update keranjang.' });
    }
};

// Delete item from cart
exports.deleteCartItem = async (req, res) => {
     if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'Silakan login.' });
    }
    const user_id = req.user.id;
    const cartItemId = req.params.id; // ID dari tabel 'carts'

    try {
        const [result] = await pool.query('DELETE FROM carts WHERE id = ? AND user_id = ?', [cartItemId, user_id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Item keranjang tidak ditemukan atau Anda tidak berhak menghapusnya.' });
        }
        
        // Ambil jumlah total item di keranjang pengguna untuk update UI navbar
        const [cartCountResult] = await pool.query(
            'SELECT SUM(quantity) as totalItems FROM carts WHERE user_id = ?',
            [user_id]
        );
        const cartItemCount = cartCountResult[0] ? cartCountResult[0].totalItems : 0;

        res.status(200).json({ success: true, message: 'Item berhasil dihapus dari keranjang!', cartItemCount });
    } catch (err) {
        console.error('Error in deleteCartItem:', err);
        res.status(500).json({ success: false, message: 'Internal server error saat menghapus item keranjang.' });
    }
};