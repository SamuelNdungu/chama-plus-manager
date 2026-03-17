#!/usr/bin/env node

import 'dotenv/config';
import pkg from 'pg';
import bcrypt from 'bcryptjs';
import fs from 'fs';

const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function checkUsers() {
  let output = '';
  
  try {
    const result = await pool.query('SELECT id, email, username, created_at FROM users ORDER BY id');
    
    output += `Total users: ${result.rows.length}\n\n`;
    
    result.rows.forEach(user => {
      output += `ID: ${user.id}, Email: ${user.email}, Username: ${user.username}\n`;
    });
    
    output += `\nChecking s2ndungu@gmail.com...\n`;
    const userResult = await pool.query('SELECT id, email FROM users WHERE email = $1', ['s2ndungu@gmail.com']);
    
    if (userResult.rows.length === 0) {
      output += 'USER NOT FOUND - Need to sign up first!\n';
    } else {
      output += `USER EXISTS - ID: ${userResult.rows[0].id}\n`;
    }
    
  } catch (error) {
    output += `Error: ${error.message}\n`;
  }
  
  fs.writeFileSync('/home/samuel/apps/AkibaPlus/backend/user-check.txt', output);
  console.log('Results written to user-check.txt');
  await pool.end();
  process.exit(0);
}

checkUsers();
