#!/usr/bin/env node

/**
 * Database Setup Script
 * This script creates and initializes the Chama Plus database
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
const config = {
  user: 'postgres',
  host: '127.0.0.1',
  password: 'root',
  port: 5432,
};

async function setupDatabase() {
  console.log('🚀 Starting Chama Plus Database Setup...\n');

  // Step 1: Connect to default postgres database to create chamaPlus database
  console.log('Step 1: Connecting to PostgreSQL...');
  const pool = new Pool({ ...config, database: 'postgres' });

  try {
    // Check if database exists
    const dbCheckResult = await pool.query(
      "SELECT 1 FROM pg_database WHERE datname = 'chamaPlus'"
    );

    if (dbCheckResult.rows.length === 0) {
      console.log('Creating chamaPlus database...');
      await pool.query('CREATE DATABASE "chamaPlus"');
      console.log('✅ Database created successfully!\n');
    } else {
      console.log('⚠️  Database already exists. Will drop and recreate tables.\n');
    }

    await pool.end();

    // Step 2: Connect to chamaPlus database and run schema
    console.log('Step 2: Setting up database schema...');
    const chamaPlusPool = new Pool({ ...config, database: 'chamaPlus' });

    // Read schema file
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema
    await chamaPlusPool.query(schema);
    console.log('✅ Schema created successfully!\n');

    // Step 3: Verify tables were created
    console.log('Step 3: Verifying tables...');
    const tablesResult = await chamaPlusPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log(`✅ ${tablesResult.rows.length} tables created:\n`);
    tablesResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });

    await chamaPlusPool.end();

    console.log('\n🎉 Database setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Review the database schema in backend/database/schema.sql');
    console.log('   2. Update backend/.env with your database credentials');
    console.log('   3. Start the backend server: cd backend && node server.mjs');
    console.log('   4. Test the API at http://localhost:3001/api/test-db\n');

  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Make sure PostgreSQL is running: sudo service postgresql status');
    console.error('   2. Check your credentials in this script (user: postgres, password: root)');
    console.error('   3. Ensure you have permissions to create databases\n');
    process.exit(1);
  }
}

// Run the setup
setupDatabase();
