// sockets/chat.js
const cookie = require('cookie');
const jwt = require('jsonwebtoken');
const pool = require('../db');

module.exports = function configureSockets(io) {
    // ==================== SOCKET.IO AUTHENTICATION MIDDLEWARE ====================
    io.use(async (socket, next) => {
        try {
            let token;
            if (socket.handshake.headers.cookie) {
                const cookies = cookie.parse(socket.handshake.headers.cookie);
                token = cookies.jwt; 
            }

            if (!token && socket.handshake.auth && socket.handshake.auth.token) {
                token = socket.handshake.auth.token;
            }

            if (token && token !== 'logout') {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const [userRows] = await pool.query(
                    'SELECT id, name, email FROM users WHERE id = ?',
                    [decoded.id]
                );
                if (userRows.length > 0) {
                    socket.user = userRows[0];
                    return next(); 
                }
            }
            return next(new Error('Authentication error: User not authenticated for WebSocket.'));
        } catch (error) { 
            return next(new Error('Authentication error: ' + error.message));
        }
    });

    // ==================== SOCKET.IO CONNECTION HANDLING ====================
    const userSockets = new Map();

    io.on('connection', (socket) => {
        if (!socket.user) {
            console.log(`[Socket.IO] Unauthenticated connection from ${socket.id} rejected. Disconnecting.`);
            return socket.disconnect(true);
        }

        userSockets.set(socket.user.id, socket.id);

        socket.on('initiateChat', async (data) => {
            if (!socket.user) {
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
                return socket.emit('chatError', { message: 'Format Seller ID tidak valid.' });
            }
            if (buyerId === sellerId) {
                return socket.emit('chatError', { message: 'Anda tidak bisa chat dengan diri sendiri.' });
            }

            const userOne = Math.min(buyerId, sellerId);
            const userTwo = Math.max(buyerId, sellerId);

            let connection;
            try {
                connection = await pool.getConnection();
                
                let [conversations] = await connection.query(
                    'SELECT id FROM conversations WHERE user_one_id = ? AND user_two_id = ?',
                    [userOne, userTwo]
                );

                let conversationId;
                if (conversations.length > 0) {
                    conversationId = conversations[0].id;
                } else {
                    const [result] = await connection.query(
                        'INSERT INTO conversations (user_one_id, user_two_id, last_message_at) VALUES (?, ?, NOW())',
                        [userOne, userTwo]
                    );
                    conversationId = result.insertId;
                }

                const roomId = `conversation_${conversationId}`;
                socket.join(roomId);

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

                socket.emit('chatSessionStarted', {
                    roomId: roomId,
                    conversationId: conversationId,
                    messages: messagesFromDB,
                    withUserId: sellerId
                });

                const sellerSocketId = userSockets.get(sellerId);
                if (sellerSocketId && sellerSocketId !== socket.id) {
                    io.to(sellerSocketId).emit('newChatNotification', {
                        fromUserId: buyerId,
                        fromUserName: socket.user.name,
                        conversationId: conversationId,
                        roomId: roomId
                    });
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

                const [messageResult] = await connection.query(
                    'INSERT INTO chat_messages (conversation_id, sender_id, receiver_id, message_text, sent_at) VALUES (?, ?, ?, ?, NOW())',
                    [conversationId, senderId, numericReceiverId, text]
                );
                await connection.query(
                    'UPDATE conversations SET last_message_at = NOW() WHERE id = ?',
                    [conversationId]
                );
                await connection.commit();

                const newMessageData = {
                    id: messageResult.insertId,
                    conversationId: conversationId,
                    senderId: senderId,
                    senderName: socket.user.name,
                    receiverId: numericReceiverId,
                    messageText: text,
                    sentAt: new Date().toISOString(),
                    roomId: roomId
                };

                io.to(roomId).emit('newMessage', newMessageData);

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
                if (userSockets.get(socket.user.id) === socket.id) {
                    userSockets.delete(socket.user.id);
                }
            }
        });

        socket.on('testEvent', (data) => {
            if(socket.user) {
                socket.emit('eventFromServer', { message: `Halo ${socket.user.name}, ini dari server!` });
            } else {
                socket.emit('eventFromServer', { message: `Halo pengunjung, Anda belum login!` });
            }
        });
    });
};
