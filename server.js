// server.js
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

const http = require('http');
const { Server } = require("socket.io");
const app = require('./app');
const pool = require('./db');
const configureSockets = require('./sockets/chat');

const server = http.createServer(app);
const io = new Server(server);

// Konfigurasi Socket.IO
configureSockets(io);

// Validasi Koneksi Database dan Jalankan Server
const port = process.env.PORT || 5000;

pool.verifyConnection()
  .then(() => {
    console.log('MySQL connected');
    server.listen(port, () => {
      console.log(`Server started on port ${port}`);
      console.log('Socket.IO siap menerima koneksi.');
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  });
