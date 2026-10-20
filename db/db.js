const mysql = require("mysql2/promise");

let connectionPool;

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing; set the MySQL connection string in .env.");
  }
  if (!connectionPool) {
    connectionPool = mysql.createPool(process.env.DATABASE_URL);
  }
  return connectionPool;
}

async function query(sql, parameters = []) {
  const [rows] = await getPool().execute(sql, parameters);
  return rows;
}

async function execute(sql, parameters = []) {
  const [result] = await getPool().execute(sql, parameters);
  return result;
}

async function withTransaction(work) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function ping() {
  await query("SELECT 1 AS ok");
}

module.exports = { getPool, query, execute, withTransaction, ping };
