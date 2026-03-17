#!/usr/bin/env node

/**
 * Check user accounts and test login
 */

import 'dotenv/config';
import pkg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function checkUsers() {
  console.log('=========================================');
  console.log('User Account Check');
  console.log('=========================================\n');

  try {
    // List all users
    const result = await pool.query('SELECT id, email, username, created_at FROM users ORDER BY id');
    
    console.log(`Total users in database: ${result.rows.length}\n`);
    
    if (result.rows.length === 0) {
      console.log('⚠️  No users found in database!\n');
    } else {
      console.log('Existing users:');
      console.log('----------------');
      result.rows.forEach(user => {
        console.log(`ID: ${user.id}`);
        console.log(`Email: ${user.email}`);
        console.log(`Username: ${user.username}`);
        console.log(`Created: ${user.created_at}`);
        console.log('----------------');
      });
    }

    // Check specific email
    const emailToCheck = 's2ndungu@gmail.com';
    console.log(`\nChecking for user: ${emailToCheck}`);
    
    const userResult = await pool.query('SELECT id, email, username, password FROM users WHERE email = $1', [emailToCheck]);
    
    if (userResult.rows.length === 0) {
      console.log(`❌ User with email ${emailToCheck} does NOT exist in database\n`);
      console.log('💡 Suggestion: You need to sign up first or use a different email\n');
    } else {
      const user = userResult.rows[0];
      console.log(`✅ User found!`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Password hash: ${user.password.substring(0, 30)}...\n`);
      
      // Test password
      const testPassword = 'password123'; // Common test password
      const isValid = await bcrypt.compare(testPassword, user.password);
      console.log(`Test password 'password123': ${isValid ? '✅ VALID' : '❌ INVALID'}\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsers();
