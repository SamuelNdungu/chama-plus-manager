#!/usr/bin/env node

/**
 * Password Reset Tool
 * Updates password for an existing user
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

async function resetPassword(email, newPassword) {
  console.log('=========================================');
  console.log('Password Reset Tool');
  console.log('=========================================\n');

  try {
    // Check if user exists
    const userResult = await pool.query('SELECT id, email, username FROM users WHERE email = $1', [email]);
    
    if (userResult.rows.length === 0) {
      console.log(`❌ User with email ${email} not found!\n`);
      process.exit(1);
    }
    
    const user = userResult.rows[0];
    console.log(`Found user:`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Username: ${user.username}\n`);
    
    // Hash the new password
    console.log('Hashing new password...');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the password
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, user.id]);
    
    console.log(`✅ Password updated successfully!\n`);
    console.log(`You can now login with:`);
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${newPassword}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Get email and password from command line arguments
const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.log('Usage: node reset-password.mjs <email> <new-password>');
  console.log('Example: node reset-password.mjs s2ndungu@gmail.com MyNewPassword123!');
  process.exit(1);
}

resetPassword(email, newPassword);
