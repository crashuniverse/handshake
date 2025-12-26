import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a database file in the parent directory (root of project)
const dbPath = path.resolve(__dirname, '../handshake.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    initDb();
  }
});

function initDb() {
  const sql = `
    CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      lender TEXT NOT NULL,
      borrower TEXT NOT NULL,
      amount REAL NOT NULL,
      interest_rate REAL NOT NULL,
      duration_months INTEGER,
      start_date TEXT NOT NULL,
      status TEXT DEFAULT 'OPEN',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `;

  db.run(sql, (err) => {
    if (err) {
      console.error('Error creating table:', err.message);
    } else {
      console.log('Loans table ready.');
    }
  });
}

export default db;
