import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("🚨 Error: DATABASE_URL is missing inside your .env file!");
}

export const db = new Pool({
  connectionString: dbUrl,

  ssl: dbUrl && dbUrl.includes('localhost') ? false : { rejectUnauthorized: false }
});

// Prevent unhandled error crashes on idle clients
db.on('error', (err) => {
  console.error('🚨 Unexpected database client error in pool:', err.message);
});

// Immediately verify connection
db.connect((err, client, release) => {
  if (err) {
    console.error('🚨 Database Connection Failed:', err.stack);
  } else {
    console.log('⚡ Connected to Neon PostgreSQL Database Successfully!');
    if (release) release();
  }
});