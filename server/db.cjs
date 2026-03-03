const sql = require("mssql/msnodesqlv8");

// Windows Authentication connection to SEAFAB SQL Server
const configPrimary = {
  server: "SEAFAB",
  database: "TS_SEATPL",
  driver: "msnodesqlv8",
  requestTimeout: 60000,
  options: {
    trustedConnection: true,
    trustServerCertificate: true,
  },
};

const configExt = {
  server: "SEAFAB",
  database: "TS_SEATPL_EXT",
  driver: "msnodesqlv8",
  requestTimeout: 60000,
  options: {
    trustedConnection: true,
    trustServerCertificate: true,
  },
};

// Lazy-initialized connection pools
let poolPrimary = null;
let poolExt = null;

async function getPool() {
  if (!poolPrimary) {
    poolPrimary = await new sql.ConnectionPool(configPrimary).connect();
    console.log("[db] Connected to TS_SEATPL");
  }
  return poolPrimary;
}

async function getPoolExt() {
  if (!poolExt) {
    poolExt = await new sql.ConnectionPool(configExt).connect();
    console.log("[db] Connected to TS_SEATPL_EXT");
  }
  return poolExt;
}

module.exports = { sql, getPool, getPoolExt };
