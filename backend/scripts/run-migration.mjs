import 'dotenv/config';
import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'chama_app',
  host: process.env.DB_HOST || '127.0.0.1',
  database: process.env.DB_NAME || 'chamaPlus',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('=========================================');
    console.log('Running Migration: Contribution Obligations System');
    console.log('=========================================\n');

    // Read the SQL file
    const sqlPath = path.join(__dirname, '../database/migrations/001_add_contribution_obligations.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the SQL
    await client.query(sql);

    console.log('✅ Migration completed successfully!');
    
    // Verify tables were created
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('contribution_rules', 'contribution_obligations', 'system_jobs')
      ORDER BY table_name;
    `);

    console.log('\n📋 Tables created:');
    tablesResult.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

    // Check initial data
    const rulesCount = await client.query('SELECT COUNT(*) as count FROM contribution_rules');
    console.log(`\n📊 Initial contribution rules created: ${rulesCount.rows[0].count}`);

    const chamasCount = await client.query('SELECT COUNT(*) as count FROM chamas WHERE is_active = true');
    console.log(`📊 Active chamas: ${chamasCount.rows[0].count}`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
