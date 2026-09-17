const mysql = require('mysql2/promise');
require('dotenv').config();

// Cloud MySQL providers like Aiven require an SSL connection.
// Set DB_SSL=true in your .env / Render environment variables to enable it.
// (Local MySQL on your own machine usually does NOT need this.)
const useSSL = String(process.env.DB_SSL).toLowerCase() === 'true';

// Create a connection pool (reused across the app for performance)
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'college_transport_db',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ...(useSSL ? { ssl: { rejectUnauthorized: false } } : {})
});

// Quick check on startup so errors are obvious instead of silent
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Connected to MySQL database:', process.env.DB_NAME);
    conn.release();
  } catch (err) {
    console.error('❌ MySQL connection failed:', err.message);
    console.error('   Check your .env file and make sure MySQL is running.');
  }
}

testConnection();

module.exports = pool;
