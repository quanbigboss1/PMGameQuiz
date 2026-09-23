require('dotenv').config();

const { Pool } = require('pg');

const dbPassword = process.env.DB_PASSWORD;

if (typeof dbPassword !== 'string' || dbPassword.length === 0) {
  console.error('❌ DB_PASSWORD chưa được cấu hình trong file .env');
  process.exit(1);
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'LinguaQuest',
  user: process.env.DB_USER || 'postgres',
  password: dbPassword,

  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

pool.on('connect', () => {
  console.log('✅ PostgreSQL connected');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool error:', err);
});

async function getPool() {
  return pool;
}

module.exports = {
  pool,
  getPool
};