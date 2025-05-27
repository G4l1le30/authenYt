const mysql = require('mysql2/promise');

const pool = mysql.createPool({
   host: 'localhost',           
  user: 'root',               
  password: '',               
  database: 'manage_user_fashion_terbaru', 
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
  acquireTimeout: 10000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
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