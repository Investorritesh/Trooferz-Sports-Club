import mysql from 'mysql2/promise';
import { env } from './env.js';
import { sqlitePool } from './sqliteFallback.js';
import { initMysqlSchema } from './mysqlInit.js';

let activePool = null;
let isFallback = false;
let schemaInitialized = false;

try {
  const poolConfig = {
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.name,
    waitForConnections: true,
    connectionLimit: 10,
    decimalNumbers: true,
    dateStrings: true
  };

  if (env.db.ssl) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }

  activePool = mysql.createPool(poolConfig);
} catch (e) {
  console.log('[DB] MySQL pool creation failed. Using embedded SQLite database fallback.');
  activePool = sqlitePool;
  isFallback = true;
}

function isConnError(err) {
  return ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ER_ACCESS_DENIED_ERROR', 'PROTOCOL_CONNECTION_LOST', 'HANDSHAKE_SSL_ERROR'].includes(err?.code) || err?.syscall === 'connect';
}

async function executeWithFallback(method, ...args) {
  if (isFallback) {
    return sqlitePool[method](...args);
  }
  try {
    return await activePool[method](...args);
  } catch (err) {
    if (isConnError(err)) {
      console.log(`[DB] MySQL server unreachable (${err.code || err.message}). Switching to embedded SQLite database fallback.`);
      activePool = sqlitePool;
      isFallback = true;
      return sqlitePool[method](...args);
    }
    throw err;
  }
}

export const pool = {
  query(...args) {
    return executeWithFallback('query', ...args);
  },
  execute(...args) {
    return executeWithFallback('execute', ...args);
  },
  async getConnection() {
    if (isFallback) {
      return sqlitePool.getConnection();
    }
    try {
      return await activePool.getConnection();
    } catch (err) {
      if (isConnError(err)) {
        console.log(`[DB] MySQL server unreachable (${err.code || err.message}). Switching to embedded SQLite database fallback.`);
        activePool = sqlitePool;
        isFallback = true;
        return sqlitePool.getConnection();
      }
      throw err;
    }
  },
  async end() {
    if (activePool && activePool.end) {
      try { await activePool.end(); } catch (e) {}
    }
  }
};

export async function pingDb() {
  if (isFallback) return;
  try {
    const c = await activePool.getConnection();
    if (c.ping) await c.ping();
    if (!schemaInitialized) {
      await initMysqlSchema(c);
      schemaInitialized = true;
    }
    c.release();
  } catch (err) {
    console.log(`[DB] MySQL ping failed (${err.code || err.message}). Using embedded SQLite database.`);
    activePool = sqlitePool;
    isFallback = true;
  }
}

