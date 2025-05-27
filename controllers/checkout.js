// controllers/checkoutController.js
const pool = require('../db');
// Impor fungsi fetchUserCartDetails dari cartController Anda
const { fetchUserCartDetails } = require('./cart'); // Pastikan path ini benar

exports.processCheckout = async (req, res) => {
    if (!req.user || !req.user.id) { // Pengecekan req.user.id juga penting
        return res.status(401).json({ success: false, message: 'Mohon login untuk melanjutkan checkout.' });
    }

    const userId = req.user.id;
    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Ambil item dari keranjang pengguna MENGGUNAKAN FUNGSI HELPER DARI cart.js
        //    Fungsi fetchUserCartDetails sudah mengambil dari tabel 'carts'
        //    dan juga melakukan join dengan produk untuk mendapatkan detail terkini.
        //    Kita melewatkan 'connection' agar query ini menjadi bagian dari transaksi.
        const { itemsWithSubtotal: cartItems, cartTotal: totalAmountFromHelper } = await fetchUserCartDetails(userId, connection);

        if (cartItems.length === 0) {
            await connection.rollback(); // Tidak ada perubahan, tapi untuk keamanan
            connection.release();
            return res.status(400).json({ success: false, message: 'Keranjang Anda kosong.' });
        }

        // 2. Validasi ulang stok, visibilitas produk, dan hitung ulang total amount
        //    Ini adalah langkah keamanan penting untuk memastikan data konsisten saat checkout.
        let calculatedTotalAmount = 0;
        const itemsToProcessInCheckout = [];

        for (const item of cartItems) { // 'item' di sini adalah hasil dari fetchUserCartDetails
            // Tidak perlu query produk lagi karena fetchUserCartDetails sudah melakukannya.
            // Cukup validasi berdasarkan data yang sudah diambil.
            if (!item.product_is_visible) {
                await connection.rollback();
                connection.release();
                return res.status(400).json({ success: false, message: `Produk "${item.product_name}" sudah tidak tersedia.` });
            }
            // item.product_stock adalah stok yang diambil oleh fetchUserCartDetails
            if (item.quantity > item.product_stock) {
                await connection.rollback();
                connection.release();
                return res.status(400).json({ 
                    success: false, 
                    message: `Stok produk "${item.product_name}" tidak mencukupi (tersisa ${item.product_stock}). Harap perbarui keranjang Anda.` 
                });
            }
            
            calculatedTotalAmount += parseFloat(item.product_price) * parseInt(item.quantity);
            itemsToProcessInCheckout.push({
                product_id: item.product_id,
                quantity: parseInt(item.quantity),
                color: item.color,
                size: item.size,
                price_at_purchase: parseFloat(item.product_price), // Harga saat ini dari DB
                current_stock_before_deduction: parseInt(item.product_stock),
                product_name: item.product_name
            });
        }
        
        // Total yang akan digunakan adalah hasil kalkulasi ulang yang paling akurat
        const finalTotalAmount = calculatedTotalAmount;

        // 3. Cek saldo pengguna (gunakan FOR UPDATE untuk locking row)
        const [userRows] = await connection.query('SELECT balance FROM users WHERE id = ? FOR UPDATE', [userId]);
        const currentUserBalance = parseFloat(userRows[0].balance);

        if (currentUserBalance < finalTotalAmount) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({ 
                success: false, 
                message: 'Saldo Anda tidak mencukupi untuk transaksi ini.',
                requiredAmount: finalTotalAmount,
                currentBalance: currentUserBalance
            });
        }

        // 4. Kurangi saldo pengguna
        await connection.query('UPDATE users SET balance = balance - ? WHERE id = ?', [finalTotalAmount, userId]);

        // 5. Buat record di tabel 'orders'
        const orderStatus = 'completed'; 
        const [orderResult] = await connection.query(
            'INSERT INTO orders (user_id, total_amount, status, payment_method) VALUES (?, ?, ?, ?)',
            [userId, finalTotalAmount, orderStatus, 'user_balance']
        );
        const newOrderId = orderResult.insertId;

        // 6. Kurangi stok produk, update visibilitas jika stok habis, dan buat record di 'order_items'
        for (const item of itemsToProcessInCheckout) {
            const newStock = item.current_stock_before_deduction - item.quantity;
            await connection.query('UPDATE products SET stock = ? WHERE id = ?', [newStock, item.product_id]);

            if (newStock === 0) {
                await connection.query('UPDATE products SET is_visible = FALSE WHERE id = ?', [item.product_id]);
            }

            await connection.query(
                'INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase, color, size) VALUES (?, ?, ?, ?, ?, ?)',
                [newOrderId, item.product_id, item.quantity, item.price_at_purchase, item.color, item.size]
            );
        }

        // 7. Kosongkan keranjang pengguna (dari tabel 'carts')
        await connection.query('DELETE FROM carts WHERE user_id = ?', [userId]); // <<< Pastikan nama tabel 'carts'

        // 8. Commit transaksi
        await connection.commit();

        connection.release(); // Release koneksi setelah commit
        res.status(200).json({ 
            success: true, 
            message: 'Checkout berhasil! Pesanan Anda sedang diproses.',
            orderId: newOrderId,
            redirectUrl: `/order/success/${newOrderId}` // Kirim URL redirect ke frontend
        });

    } catch (error) {
        if (connection) {
            await connection.rollback(); // Rollback jika ada error
            connection.release(); // Selalu release koneksi di blok catch jika sudah didapatkan
        }
        console.error('Checkout process error:', error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server saat proses checkout.' });
    } 
    // Tidak perlu 'finally' jika sudah di-handle di try dan catch
};