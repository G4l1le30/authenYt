const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE,
  port: 3306,  // Explicitly specify port
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,  // 10 seconds connection timeout
  acquireTimeout: 10000,  // 10 seconds pool acquisition timeout
  enableKeepAlive: true,  // Prevent connection drops
  keepAliveInitialDelay: 10000  // Keep-alive ping interval
});

// Test connection immediately
pool.getConnection()
  .then(conn => {
    console.log('Successfully connected to MySQL!');
    conn.release();
  })
  .catch(err => {
    console.error('Database connection failed:', err);
  });

module.exports = pool;