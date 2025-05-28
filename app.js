// app.js
const express = require('express');
const app = express();
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });
const cookieParser = require('cookie-parser'); // Untuk Express HTTP requests
const hbs = require('hbs');
const pool = require('./db');
const authMiddleware = require('./middleware/auth');
const productApiRoutes = require('./routes/product');
const checkoutRoutes = require('./routes/checkout');

// Setup untuk Socket.IO
const http = require('http'); // Modul http bawaan Node.js
const server = http.createServer(app); // Buat server HTTP dari aplikasi Express
const { Server } = require("socket.io");
const io = new Server(server); // Inisialisasi Socket.IO dengan server HTTP

// Import 'cookie' dan 'jsonwebtoken' untuk autentikasi socket
const cookie = require('cookie');
const jwt = require('jsonwebtoken');

// Middleware dan parsers
app.use(cookieParser()); // Middleware cookie-parser untuk Express
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Static files folder
const publicDirectory = path.join(__dirname, './public/');
app.use(express.static(publicDirectory));

// View engine setup
const viewsPath = path.join(__dirname, './views');
const partialsPath = path.join(__dirname, './views/partials');
app.set('view engine', 'hbs');
app.set('views', viewsPath);
hbs.registerPartials(partialsPath);

// Handlebars helpers (SALIN SEMUA HELPER ANDA YANG SUDAH ADA KE SINI)
hbs.registerHelper('includes', function (array, value) {
  if (!array) return false;
  const strArray = array.map(String);
  return strArray.includes(String(value));
});
hbs.registerHelper('generateStars', function(rating) {
  let starsHtml = '';
  const totalStars = 5;
  let ratingValue = parseFloat(rating);
  if (isNaN(ratingValue) || ratingValue === null || ratingValue < 0) {
    for (let i = 0; i < totalStars; i++) { starsHtml += '<i class="bi bi-star"></i>'; }
    starsHtml += '<span class="rating-value ms-1 text-muted small">(N/A)</span>';
    return new hbs.SafeString(starsHtml);
  }
  for (let i = 1; i <= totalStars; i++) {
    if (i <= ratingValue) { starsHtml += '<i class="bi bi-star-fill"></i>'; }
    else if (i - ratingValue > 0 && i - ratingValue < 1) { starsHtml += '<i class="bi bi-star"></i>';}
    else { starsHtml += '<i class="bi bi-star"></i>'; }
  }
  starsHtml += `<span class="rating-value ms-1">(${ratingValue.toFixed(1)}/5)</span>`;
  return new hbs.SafeString(starsHtml);
});
hbs.registerHelper('currentYear', function() { return new Date().getFullYear(); });
hbs.registerHelper('eq', function (a, b) { return a === b; });
hbs.registerHelper('neq', function (a, b) { return a !== b; });
hbs.registerHelper('join', function(arr, separator) {
  if (Array.isArray(arr)) { return arr.join(separator); }
  return '';
});
hbs.registerHelper('formatDate', function(dateString) {
  if (!dateString) { return ''; }
  try {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  } catch (e) { console.error('Error formatting date:', e); return dateString; }
});
hbs.registerHelper('truncate', function (str, len) {
  if (str && str.length > len && str.length > 0) {
    let new_str = str.substr(0, len);
    new_str = str.substr(0, new_str.lastIndexOf(" "));
    new_str = (new_str.length > 0) ? new_str : str.substr(0, len);
    return new hbs.SafeString(new_str +'...');
  }
  return str;
});
hbs.registerHelper('gte', function (a, b, options) {
  const valA = parseFloat(a); const valB = parseFloat(b); const result = valA >= valB;
  if (options && typeof options.fn === 'function' && typeof options.inverse === 'function') {
    return result ? options.fn(this) : options.inverse(this);
  } else { return result; }
});
hbs.registerHelper('subtract', function (a, b) {
  const valA = parseFloat(a); const valB = parseFloat(b);
  if (!isNaN(valA) && !isNaN(valB)) { return valA - valB; }
  return 0;
});
hbs.registerHelper('gt', function (a, b) {
  const numA = parseFloat(a); const numB = parseFloat(b);
  if (!isNaN(numA) && !isNaN(numB)) { return numA > numB; }
  return false;
});
hbs.registerHelper('toFixed', function (number, digits) {
  if (typeof number === 'number' || (typeof number === 'string' && number.trim() !== '')) {
    return parseFloat(number).toFixed(digits);
  } return 'N/A';
});
hbs.registerHelper('multiply', function(a, b) { return parseFloat(a) * parseFloat(b); });
hbs.registerHelper('add', function(a, b) { return Number(a) + Number(b); });
hbs.registerHelper('formatRupiah', function (number) {
  if (number === null || number === undefined || isNaN(parseFloat(number))) { return 'Rp 0'; }
  const num = parseFloat(number);
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num);
});
hbs.registerHelper('hasUserReviewed', function (reviews, userId) {
    if (!reviews || !Array.isArray(reviews) || userId === undefined || userId === null) { return false; }
    for (let i = 0; i < reviews.length; i++) {
        if (reviews[i] && String(reviews[i].reviewer_id) === String(userId)) { return true; }
    } return false;
});
hbs.registerHelper('hasProblematicItems', function (cartItems, options) {
    let problematic = false;
    if (cartItems && Array.isArray(cartItems) && cartItems.length > 0) {
        for (let i = 0; i < cartItems.length; i++) {
            if (cartItems[i] && (cartItems[i].hasIssue === true || (cartItems[i].errorMessage && cartItems[i].errorMessage.length > 0))) {
                problematic = true; break;
            }
        }
    }
    if (options && typeof options.fn === 'function' && typeof options.inverse === 'function') {
        return problematic ? options.fn(this) : options.inverse(this);
    } else { return problematic; }
});
hbs.registerHelper('nl2br', function(text) {
    if (typeof text === 'string') {
        const escapedText = hbs.Utils.escapeExpression(text);
        return new hbs.SafeString(escapedText.replace(/(\r\n|\n|\r)/gm, '<br>'));
    } return '';
});
// -------------------------------------------------------------

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('MySQL connected');
    conn.release();
  } catch (err) {
    console.error('Database connection failed:', err);
  }
}
testConnection();

// Inject user ke semua views (untuk HTTP requests)
app.use(authMiddleware.getUser);

// ==================== SOCKET.IO AUTHENTICATION MIDDLEWARE ====================
io.use(async (socket, next) => {
    try {
        let token;
        if (socket.handshake.headers.cookie) {
            const cookies = cookie.parse(socket.handshake.headers.cookie);
            token = cookies.jwt; // Asumsi cookie JWT Anda bernama 'jwt'
        }

        // Fallback ke auth header jika tidak ada di cookie (berguna untuk beberapa jenis klien)
        if (!token && socket.handshake.auth && socket.handshake.auth.token) {
            token = socket.handshake.auth.token;
        }

        if (token && token !== 'logout') {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            // Ambil hanya data user yang esensial untuk socket (id, name, email)
            const [userRows] = await pool.query(
                'SELECT id, name, email FROM users WHERE id = ?',
                [decoded.id]
            );
            if (userRows.length > 0) {
                socket.user = userRows[0]; // Lampirkan info user ke objek socket
                return next(); // Lanjutkan ke event connection
            }
        }
        // Jika tidak ada token, token tidak valid, atau user tidak ditemukan
        return next(new Error('Authentication error: User not authenticated for WebSocket.'));
    } catch (error) { // Termasuk error dari jwt.verify (token expired, dll.)
        // console.error('[Socket.IO Auth] Error:', error.message);
        return next(new Error('Authentication error: ' + error.message));
    }
});
// ==========================================================================

// ==================== SOCKET.IO CONNECTION HANDLING ====================
const userSockets = new Map(); // Menyimpan mapping: userId -> socketId (sederhana)

io.on('connection', (socket) => {
    // ... (logika koneksi dan autentikasi socket.user) ...
        if (!socket.user) {
        console.log(`[Socket.IO] Unauthenticated connection from ${socket.id} rejected. Disconnecting.`);
        return socket.disconnect(true); // Putuskan koneksi jika tidak terautentikasi
    }

    userSockets.set(socket.user.id, socket.id); // Simpan socket ID

        socket.on('initiateChat', async (data) => {
        if (!socket.user) { // Pastikan socket.user ada dari middleware io.use()
            console.error('[Socket.IO initiateChat] Error: User not authenticated on socket.');
            return socket.emit('chatError', { message: 'Autentikasi diperlukan.' });
        }
        if (!data || data.sellerId === undefined) {
            console.error('[Socket.IO initiateChat] Error: sellerId missing in data.');
            return socket.emit('chatError', { message: 'Seller ID tidak ditemukan.' });
        }

        const buyerId = socket.user.id;
        const sellerId = parseInt(data.sellerId);

        if (isNaN(sellerId)) {
            console.error(`[Socket.IO initiateChat] Error: sellerId is not a number: ${data.sellerId}`);
            return socket.emit('chatError', { message: 'Format Seller ID tidak valid.' });
        }
        if (buyerId === sellerId) {
            console.warn(`[Socket.IO initiateChat] Warning: User ${buyerId} trying to chat with self.`);
            return socket.emit('chatError', { message: 'Anda tidak bisa chat dengan diri sendiri.' });
        }

        // ====================================================================
        // PASTIKAN PENDEFINISIAN userOne DAN userTwo ADA DI SINI, SEBELUM TRY-CATCH
        // ====================================================================
        const userOne = Math.min(buyerId, sellerId); // ID pengguna yang lebih kecil
        const userTwo = Math.max(buyerId, sellerId); // ID pengguna yang lebih besar
        // ====================================================================

        let connection;
        try {
            connection = await pool.getConnection();
            
            console.log(`[Socket.IO initiateChat] Looking for conversation between ${userOne} and ${userTwo}`);
            // Cari atau buat percakapan
            let [conversations] = await connection.query( // Ini baris yang mungkin menyebabkan error jika userOne/userTwo belum ada
                'SELECT id FROM conversations WHERE user_one_id = ? AND user_two_id = ?',
                [userOne, userTwo]
            );

            let conversationId;
            if (conversations.length > 0) {
                conversationId = conversations[0].id;
                console.log(`[Socket.IO initiateChat] Found existing conversationId: ${conversationId}`);
            } else {
                console.log(`[Socket.IO initiateChat] Creating new conversation for ${userOne} and ${userTwo}`);
                const [result] = await connection.query(
                    'INSERT INTO conversations (user_one_id, user_two_id, last_message_at) VALUES (?, ?, NOW())',
                    [userOne, userTwo]
                );
                conversationId = result.insertId;
                console.log(`[Socket.IO initiateChat] New conversationId created: ${conversationId}`);
            }

            const roomId = `conversation_${conversationId}`;
            socket.join(roomId);
            console.log(`[Socket.IO] User ${socket.user.name} (Socket ${socket.id}) joined room ${roomId}`);

            // Ambil riwayat pesan DENGAN ALIAS KOLOM
            const [messagesFromDB] = await connection.query(
                `SELECT 
                    msg.id, 
                    msg.sender_id AS senderId,
                    msg.message_text AS messageText,
                    msg.sent_at AS sentAt,
                    u.name AS senderName 
                 FROM chat_messages msg
                 JOIN users u ON msg.sender_id = u.id
                 WHERE msg.conversation_id = ? 
                 ORDER BY msg.sent_at ASC LIMIT 100`,
                [conversationId]
            );

            // console.log('[Socket.IO Server - initiateChat] History for chatSessionStarted:', JSON.stringify(messagesFromDB, null, 2));

            socket.emit('chatSessionStarted', {
                roomId: roomId,
                conversationId: conversationId,
                messages: messagesFromDB,
                withUserId: sellerId
            });

            // Notifikasi ke seller jika mereka online
            const sellerSocketId = userSockets.get(sellerId); // userSockets dari io.on('connection')
            if (sellerSocketId && sellerSocketId !== socket.id) {
                io.to(sellerSocketId).emit('newChatNotification', {
                    fromUserId: buyerId,
                    fromUserName: socket.user.name,
                    conversationId: conversationId,
                    roomId: roomId
                });
                // console.log(`[Socket.IO] Sent newChatNotification to seller ${sellerId} (Socket ${sellerSocketId})`);
            }

        } catch (error) {
            console.error('[Socket.IO] Error in initiateChat:', error);
            socket.emit('chatError', { message: 'Gagal memulai sesi chat. Kesalahan server.' });
        } finally {
            if (connection) connection.release();
        }
    });
    socket.on('sendMessage', async (data) => {
        if (!socket.user || !data.roomId || !data.text || data.receiverId === undefined) {
            return socket.emit('chatError', { message: 'Data pesan tidak lengkap atau tidak terautentikasi.' });
        }

        const senderId = socket.user.id;
        const { roomId, text, receiverId } = data;
        const conversationId = parseInt(roomId.replace('conversation_', ''));
        const numericReceiverId = parseInt(receiverId);

        if (isNaN(conversationId) || isNaN(numericReceiverId)) {
            return socket.emit('chatError', { message: 'Room ID atau Receiver ID tidak valid.'});
        }
        
        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            // Simpan pesan ke database
            const [messageResult] = await connection.query(
                'INSERT INTO chat_messages (conversation_id, sender_id, receiver_id, message_text, sent_at) VALUES (?, ?, ?, ?, NOW())',
                [conversationId, senderId, numericReceiverId, text]
            );
            // Update timestamp pesan terakhir di tabel conversations
            await connection.query(
                'UPDATE conversations SET last_message_at = NOW() WHERE id = ?',
                [conversationId]
            );
            await connection.commit();

            const newMessageData = {
                id: messageResult.insertId, // ID pesan dari DB
                conversationId: conversationId,
                senderId: senderId,
                senderName: socket.user.name, // Nama pengirim saat ini
                receiverId: numericReceiverId,
                messageText: text,
                sentAt: new Date().toISOString(), // Waktu saat ini (ISO string)
                roomId: roomId
            };

            // Kirim pesan ke semua klien di room tersebut (termasuk pengirim)
            io.to(roomId).emit('newMessage', newMessageData);
            console.log(`[Socket.IO] Pesan dari ${senderId} (Socket ${socket.id}) ke room ${roomId}: ${text}`);

            // Notifikasi ke penerima jika mereka online tapi mungkin tidak sedang membuka chat room ini
            const receiverSocketId = userSockets.get(numericReceiverId);
            if (receiverSocketId) {
                const socketsInRoom = io.sockets.adapter.rooms.get(roomId);
                let receiverInThisSpecificSocketRoom = false;
                if (socketsInRoom && socketsInRoom.has(receiverSocketId)) {
                    receiverInThisSpecificSocketRoom = true;
                }

                if (!receiverInThisSpecificSocketRoom) {
                     io.to(receiverSocketId).emit('chatNotification', {
                        fromUserId: senderId,
                        fromUserName: socket.user.name,
                        conversationId: conversationId,
                        roomId: roomId,
                        messagePreview: text.substring(0, 30) + (text.length > 30 ? '...' : '')
                    });
                     console.log(`[Socket.IO] Sent in-app chatNotification for unread message to receiver ${numericReceiverId} (Socket ${receiverSocketId})`);
                }
            }

        } catch (error) {
            if (connection) await connection.rollback();
            console.error('[Socket.IO] Error in sendMessage:', error);
            socket.emit('chatError', { message: 'Gagal mengirim pesan.' });
        } finally {
            if (connection) connection.release();
        }
    });

    socket.on('disconnect', () => {
        if (socket.user) {
            console.log(`[Socket.IO] User disconnected: ${socket.user.name} (ID: ${socket.user.id}, SocketID: ${socket.id})`);
            // Hapus user dari map jika ini adalah socket.id yang tersimpan (untuk kasus sederhana)
            if (userSockets.get(socket.user.id) === socket.id) {
                userSockets.delete(socket.user.id);
            }
        } else {
            console.log(`[Socket.IO] Unauthenticated socket disconnected: ${socket.id}`);
        }
    });

    socket.on('testEvent', (data) => {
        console.log('[Socket.IO] testEvent diterima:', data);
        if(socket.user) {
            socket.emit('eventFromServer', { message: `Halo ${socket.user.name}, ini dari server!` });
        } else {
            socket.emit('eventFromServer', { message: `Halo pengunjung, Anda belum login!` });
        }
    });
});
// =======================================================================

// Import dan Daftarkan Rute HTTP
const pagesRoutes = require('./routes/pages');
const authRoutes = require('./routes/auth'); // Untuk HTTP auth
const cartRoutes = require('./routes/cart'); // Untuk API cart
const reviewApiRoutes = require('./routes/reviewRoutes');

app.use('/api', authRoutes);
app.use('/api/products', productApiRoutes);
app.use('/api', reviewApiRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/checkout', checkoutRoutes); // Untuk API checkout
app.use('/', pagesRoutes); // Untuk halaman web
app.use('/auth', authRoutes); // Untuk /auth/logout, /auth/wishlist

// Start server
const port = process.env.PORT || 5000;
server.listen(port, () => { // Gunakan 'server.listen' BUKAN 'app.listen'
  console.log(`Server started on port ${port}`);
  console.log('Socket.IO siap menerima koneksi.');
});

module.exports = pool;