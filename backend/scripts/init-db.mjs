/**
 * Database Schema Initialization Script
 * Run this to create all necessary database tables
 */

import 'dotenv/config';
import fs from 'fs';
import pkg from 'pg';

const { Pool } = pkg;

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || '127.0.0.1',
  database: process.env.DB_NAME || 'chamaPlus',
  password: process.env.DB_PASSWORD || 'root',
  port: process.env.DB_PORT || 5432,
});

async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to PostgreSQL');
    console.log('Reading schema.sql...');
    
    const schemaSQL = fs.readFileSync('./database/schema.sql', 'utf8');
    
    console.log('Executing schema...');
    await client.query(schemaSQL);
    
    console.log('✓ Database schema created successfully');
    
    // Verify tables were created
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\nCreated tables:');
    result.rows.forEach(row => console.log(`  - ${row.table_name}`));
    
  } catch (error) {
    console.error('Error initializing database:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

initializeDatabase();
