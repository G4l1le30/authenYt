// controllers/orderController.js
const pool = require('../db');

exports.getOrderDetailPage = async (req, res) => {
    if (!req.user) {
        return res.redirect('/login');
    }
    const userId = req.user.id;
    const orderId = req.params.orderId;

    try {
        // 1. Ambil data pesanan utama
        const [orderRows] = await pool.query(
            `SELECT 
                o.id, 
                o.total_amount, 
                o.status, 
                DATE_FORMAT(o.order_date, '%d %M %Y, %H:%i WIB') as formatted_order_date,
                o.shipping_address, 
                o.payment_method,
                u.name as user_name, 
                u.email as user_email
             FROM orders o
             JOIN users u ON o.user_id = u.id
             WHERE o.id = ? AND o.user_id = ?`, // Pastikan pesanan milik user yang login
            [orderId, userId]
        );

        if (orderRows.length === 0) {
            // Pesanan tidak ditemukan atau bukan milik user
            if (req.flash) req.flash('error_msg', 'Pesanan tidak ditemukan.');
            return res.redirect('/dashboard#my-orders-pane'); // Arahkan kembali ke daftar pesanan
        }
        const order = orderRows[0];

        // 2. Ambil item-item dalam pesanan tersebut
        const [orderItems] = await pool.query(
            `SELECT 
                oi.quantity, 
                oi.price_at_purchase, 
                oi.color, 
                oi.size,
                p.name as product_name,
                p.image_url as product_image_url,
                p.id as product_id
             FROM order_items oi
             JOIN products p ON oi.product_id = p.id
             WHERE oi.order_id = ?`,
            [orderId]
        );

        // Memproses status pesanan untuk tampilan yang lebih baik (jika belum dilakukan global)
        let status_display = order.status.charAt(0).toUpperCase() + order.status.slice(1);
        let status_class = 'secondary';
        switch (order.status.toLowerCase()) {
            case 'completed': status_class = 'success'; status_display = 'Selesai'; break;
            case 'pending': status_class = 'warning'; status_display = 'Menunggu Pembayaran'; break;
            case 'shipped': status_class = 'info'; status_display = 'Dikirim'; break;
            case 'cancelled': status_class = 'danger'; status_display = 'Dibatalkan'; break;
            case 'failed': status_class = 'danger'; status_display = 'Gagal'; break;
        }
        order.status_display = status_display;
        order.status_class = status_class;

        res.render('order-detail', {
            user: req.user,
            pageTitle: `Detail Pesanan #${order.id}`,
            order: order,
            items: orderItems
        });

    } catch (error) {
        console.error('Error fetching order detail:', error);
        if (req.flash) req.flash('error_msg', 'Gagal memuat detail pesanan.');
        res.redirect('/dashboard#my-orders-pane');
    }
};

module.exports = exports;