// // config/db.js
// const mysql = require('mysql2');
// require('dotenv').config();

// // Create the connection pool
// const pool = mysql.createPool({
//   host: process.env.DB_HOST,      
//   user: process.env.DB_USER,      
//   password: process.env.DB_PASSWORD, 
//   database: process.env.DB_NAME, 
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0
// });

// // Test connection
// pool.getConnection((err, connection) => {
//   if (err) {
//     console.error('  Database connection failed:', err.message);
//     return;
//   }
//   console.log(' Database connected successfully');
//   connection.release();
// });

// // Use the pool for queries or export it
// module.exports = pool;
// config/db.js
const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,        // ← ADDED
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false        // ← ADDED
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error(' Database connection failed:', err.message);
    return;
  }
  console.log('Database connected successfully');
  connection.release();
});

module.exports = pool;