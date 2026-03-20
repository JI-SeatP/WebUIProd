const sql = require('mssql');
require('dotenv').config();

const cfg = {
  server: process.env.DB_SERVER || 'SEAFAB',
  database: process.env.DB_NAME || 'TS_SEATPL',
  options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true },
  authentication: { type: 'ntlm', options: { domain: process.env.DB_DOMAIN || '', userName: '', password: '' } }
};

async function run() {
  const pool = await sql.connect(cfg);

  // Check if INSTRUCTION table exists
  try {
    const r = await pool.request().query('SELECT TOP 3 INSNOM_TABLE, INSSEQ_REFERENCE, METHODE FROM INSTRUCTION ORDER BY INSSEQ_REFERENCE DESC');
    console.log('INSTRUCTION sample rows:', r.recordset.length);
    r.recordset.forEach(row => console.log(' ', JSON.stringify(row)));
  } catch(e) {
    console.error('INSTRUCTION query failed:', e.message);
  }

  // Check METHODE table
  try {
    const r2 = await pool.request().query('SELECT TOP 3 METSEQ, METDESC_P, METDESC_S FROM METHODE');
    console.log('METHODE sample rows:', r2.recordset.length);
    r2.recordset.forEach(row => console.log(' ', JSON.stringify(row)));
  } catch(e) {
    console.error('METHODE query failed:', e.message);
  }

  process.exit(0);
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
