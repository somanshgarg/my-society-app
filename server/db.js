import sqlite3 from 'sqlite3';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || process.env.POSTGRES_URL;
if (dbUrl) {
  dbUrl = dbUrl.trim().replace(/^["']|["']$/g, '');
}

const isPostgres = Boolean(dbUrl);

let sqliteDb = null;
let pgPool = null;
export let connectionDebugInfo = 'Using local SQLite';

function parseDbUrl(urlStr) {
  // Handles passwords starting with '/' or containing special chars before '@'
  const regex = /^postgres(?:ql)?:\/\/([^:]+):(.*)@([^:/]+)(?::(\d+))?\/(.+)$/;
  const match = urlStr.match(regex);
  if (match) {
    let user = match[1];
    let password = match[2];
    let host = match[3];
    let port = match[4] ? parseInt(match[4], 10) : 5432;
    let database = match[5];

    try { user = decodeURIComponent(user); } catch (e) {}
    try { password = decodeURIComponent(password); } catch (e) {}
    try { database = decodeURIComponent(database); } catch (e) {}

    return { user, password, host, port, database };
  }

  // Fallback to standard URL parser
  const parsedUrl = new URL(urlStr);
  return {
    user: decodeURIComponent(parsedUrl.username),
    password: decodeURIComponent(parsedUrl.password),
    host: parsedUrl.hostname,
    port: parsedUrl.port ? parseInt(parsedUrl.port, 10) : 5432,
    database: parsedUrl.pathname.replace(/^\//, '') || 'postgres'
  };
}

if (isPostgres) {
  try {
    const { user, password, host, port, database } = parseDbUrl(dbUrl);

    connectionDebugInfo = `[PostgreSQL Mode] Host: '${host}', Port: ${port}, User: '${user}', DB: '${database}'`;

    pgPool = new pg.Pool({
      host,
      port,
      user,
      password,
      database,
      ssl: {
        rejectUnauthorized: false
      }
    });
  } catch (urlErr) {
    connectionDebugInfo = `[PostgreSQL Mode Raw] Error parsing URL: ${urlErr.message}`;
    pgPool = new pg.Pool({
      connectionString: dbUrl,
      ssl: {
        rejectUnauthorized: false
      }
    });
  }
} else {
  const dbPath = path.resolve(__dirname, '../society_complaints.db');
  const sqlite = sqlite3.verbose();
  sqliteDb = new sqlite.Database(dbPath);
  connectionDebugInfo = '[SQLite Mode] Local society_complaints.db';
}

// Convert ? to $1, $2, etc. for PostgreSQL
function formatSql(sql) {
  if (!isPostgres) return sql;
  let paramIdx = 1;
  return sql.replace(/\?/g, () => `$${paramIdx++}`);
}

export const runSql = async (sql, params = []) => {
  if (isPostgres) {
    let pgSql = formatSql(sql);
    if (/^\s*INSERT\s+INTO/i.test(pgSql) && !/RETURNING/i.test(pgSql)) {
      pgSql += ' RETURNING id';
    }
    const res = await pgPool.query(pgSql, params);
    const lastID = res.rows && res.rows[0] ? res.rows[0].id : null;
    return { lastID, rowCount: res.rowCount };
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }
};

export const getSql = async (sql, params = []) => {
  if (isPostgres) {
    const pgSql = formatSql(sql);
    const res = await pgPool.query(pgSql, params);
    return res.rows[0] || null;
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
};

export const allSql = async (sql, params = []) => {
  if (isPostgres) {
    const pgSql = formatSql(sql);
    const res = await pgPool.query(pgSql, params);
    return res.rows || [];
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

export async function initDb() {
  if (isPostgres) {
    await runSql(`
      CREATE TABLE IF NOT EXISTS complaints (
          id SERIAL PRIMARY KEY,
          flat_number TEXT NOT NULL,
          description TEXT NOT NULL,
          category TEXT NOT NULL,
          urgency TEXT NOT NULL,
          ai_drafted_response TEXT NOT NULL,
          admin_edited_response TEXT DEFAULT NULL,
          assigned_to TEXT DEFAULT NULL,
          admin_notes TEXT DEFAULT NULL,
          status TEXT NOT NULL DEFAULT 'Open',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await runSql(`
      CREATE TABLE IF NOT EXISTS admins (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const adminCheck = await getSql('SELECT id FROM admins WHERE username = ?', ['admin']);
    if (!adminCheck) {
      await runSql('INSERT INTO admins (username, password_hash) VALUES (?, ?)', ['admin', 'admin123']);
    }

    const countRow = await getSql('SELECT COUNT(*) as count FROM complaints');
    if (countRow && (parseInt(countRow.count, 10) === 0)) {
      await runSql(`
        INSERT INTO complaints (flat_number, description, category, urgency, ai_drafted_response, assigned_to, admin_notes, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'A-101',
        'Kitchen tap leaking heavily for past 3 days',
        'Plumbing',
        'Medium',
        'Thank you for reporting. Our maintenance team has logged the kitchen tap leak for A-101 and Ramesh the plumber has been alerted.',
        'Ramesh (Plumber)',
        'Called Ramesh at 10:15 AM. Promised visit by 3 PM today.',
        'In Progress',
        new Date(Date.now() - 2 * 3600 * 1000).toISOString()
      ]);

      await runSql(`
        INSERT INTO complaints (flat_number, description, category, urgency, ai_drafted_response, assigned_to, admin_notes, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'B-304',
        'Gas smell in corridor near elevator shaft!',
        'Security',
        'High',
        'URGENT ACKNOWLEDGMENT: Your report of a gas smell near B-304 elevator has been flagged with HIGH priority. Facility emergency team and security have been dispatched immediately.',
        'Security Main Desk',
        'Main gas line valve checked; technician on site.',
        'Open',
        new Date(Date.now() - 30 * 60 * 1000).toISOString()
      ]);

      await runSql(`
        INSERT INTO complaints (flat_number, description, category, urgency, ai_drafted_response, assigned_to, admin_notes, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'C-502',
        'Loud music playing from neighbour past 11:30 PM',
        'Noise',
        'Low',
        'Thank you for bringing this to our attention. Noise complaints are recorded and society rules regarding quiet hours (10 PM - 7 AM) will be shared with the flat owner.',
        null,
        'Notified block representative.',
        'Resolved',
        new Date(Date.now() - 24 * 3600 * 1000).toISOString()
      ]);
    }
  } else {
    await runSql(`
      CREATE TABLE IF NOT EXISTS complaints (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          flat_number TEXT NOT NULL,
          description TEXT NOT NULL,
          category TEXT NOT NULL,
          urgency TEXT NOT NULL,
          ai_drafted_response TEXT NOT NULL,
          admin_edited_response TEXT DEFAULT NULL,
          assigned_to TEXT DEFAULT NULL,
          admin_notes TEXT DEFAULT NULL,
          status TEXT NOT NULL DEFAULT 'Open',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await runSql(`
      CREATE TABLE IF NOT EXISTS admins (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const adminCheck = await getSql('SELECT id FROM admins WHERE username = ?', ['admin']);
    if (!adminCheck) {
      await runSql('INSERT INTO admins (username, password_hash) VALUES (?, ?)', ['admin', 'admin123']);
    }

    const countRow = await getSql('SELECT COUNT(*) as count FROM complaints');
    if (countRow && parseInt(countRow.count, 10) === 0) {
      await runSql(`
        INSERT INTO complaints (flat_number, description, category, urgency, ai_drafted_response, assigned_to, admin_notes, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'A-101',
        'Kitchen tap leaking heavily for past 3 days',
        'Plumbing',
        'Medium',
        'Thank you for reporting. Our maintenance team has logged the kitchen tap leak for A-101 and Ramesh the plumber has been alerted.',
        'Ramesh (Plumber)',
        'Called Ramesh at 10:15 AM. Promised visit by 3 PM today.',
        'In Progress',
        new Date(Date.now() - 2 * 3600 * 1000).toISOString()
      ]);

      await runSql(`
        INSERT INTO complaints (flat_number, description, category, urgency, ai_drafted_response, assigned_to, admin_notes, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'B-304',
        'Gas smell in corridor near elevator shaft!',
        'Security',
        'High',
        'URGENT ACKNOWLEDGMENT: Your report of a gas smell near B-304 elevator has been flagged with HIGH priority. Facility emergency team and security have been dispatched immediately.',
        'Security Main Desk',
        'Main gas line valve checked; technician on site.',
        'Open',
        new Date(Date.now() - 30 * 60 * 1000).toISOString()
      ]);

      await runSql(`
        INSERT INTO complaints (flat_number, description, category, urgency, ai_drafted_response, assigned_to, admin_notes, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'C-502',
        'Loud music playing from neighbour past 11:30 PM',
        'Noise',
        'Low',
        'Thank you for bringing this to our attention. Noise complaints are recorded and society rules regarding quiet hours (10 PM - 7 AM) will be shared with the flat owner.',
        null,
        'Notified block representative.',
        'Resolved',
        new Date(Date.now() - 24 * 3600 * 1000).toISOString()
      ]);
    }
  }
}

export default isPostgres ? pgPool : sqliteDb;
