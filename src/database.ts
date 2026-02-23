import Database from 'better-sqlite3';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const isProduction = !!process.env.DATABASE_URL;
let pool: Pool | null = null;
let sqlite: any = null;

if (isProduction) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  console.log('FRENKYFIT: Production Mode (PostgreSQL)');
} else {
  sqlite = new Database('gym.db');
  console.log('FRENKYFIT: Development Mode (SQLite)');
  
  // Inizializzazione Schema per SQLite
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      subscription_plan TEXT DEFAULT 'none',
      subscription_status TEXT DEFAULT 'inactive',
      subscription_end_date DATE,
      fitness_goals TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      instructor_id INTEGER,
      schedule_day TEXT NOT NULL,
      schedule_time TEXT NOT NULL,
      capacity INTEGER DEFAULT 20
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      class_id INTEGER,
      status TEXT DEFAULT 'booked',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      check_in_time DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      amount REAL,
      status TEXT,
      plan TEXT,
      date DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS disposable_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      token TEXT UNIQUE NOT NULL,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// Helper universali
export const db = {
  async getOne(sql: string, params: any[] = []) {
    if (isProduction) {
      const res = await pool!.query(sql.replace(/\?/g, (_, i) => `$${i + 1}`), params);
      return res.rows[0];
    } else {
      return sqlite.prepare(sql).get(...params);
    }
  },
  async getAll(sql: string, params: any[] = []) {
    if (isProduction) {
      const res = await pool!.query(sql.replace(/\?/g, (_, i) => `$${i + 1}`), params);
      return res.rows;
    } else {
      return sqlite.prepare(sql).all(...params);
    }
  },
  async run(sql: string, params: any[] = []) {
    if (isProduction) {
      const res = await pool!.query(sql.replace(/\?/g, (_, i) => `$${i + 1}`), params);
      return { lastInsertRowid: res.rows[0]?.id };
    } else {
      const res = sqlite.prepare(sql).run(...params);
      return { lastInsertRowid: res.lastInsertRowid };
    }
  }
};

export default db;
