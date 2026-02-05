const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT, 10) || 5433,
  database: process.env.DB_NAME || 'ecommerce_chat',
  user: process.env.DB_USER || 'ecommerce_user',
  password: process.env.DB_PASSWORD || 'ecommerce_secure_pass_2024',
  max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

pool.on('connect', () => {
  console.log('New client connected to PostgreSQL');
});

/**
 * Execute a single query against the pool.
 * @param {string} text  SQL query string
 * @param {Array}  params  Parameterized values
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = (text, params) => {
  return pool.query(text, params);
};

/**
 * Obtain a dedicated client from the pool (for transactions).
 * Remember to call client.release() when done.
 * @returns {Promise<import('pg').PoolClient>}
 */
const getClient = () => {
  return pool.connect();
};

/**
 * Run a callback inside a database transaction.
 * Automatically commits on success and rolls back on error.
 * @param {function} callback  async (client) => result
 * @returns {Promise<any>}
 */
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Test the database connection.
 * @returns {Promise<boolean>}
 */
const testConnection = async () => {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('Database connected successfully at', res.rows[0].now);
    return true;
  } catch (err) {
    console.error('Database connection failed:', err.message);
    return false;
  }
};

/**
 * Gracefully close the pool.
 */
const close = async () => {
  await pool.end();
  console.log('Database pool closed');
};

module.exports = {
  pool,
  query,
  getClient,
  transaction,
  testConnection,
  close,
};
