import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'chamaPlus',
  user: process.env.DB_USER || 'chama_app',
  password: process.env.DB_PASSWORD,
});

async function resetPassword() {
  const client = await pool.connect();
  
  try {
    const email = 's2ndungu@gmail.com';
    const newPassword = 'TempPass123!';
    
    // Check if user exists
    const userCheck = await client.query(
      'SELECT id, username, email, is_active FROM users WHERE email = $1',
      [email]
    );
    
    if (userCheck.rows.length === 0) {
      console.error('❌ User not found:', email);
      return;
    }
    
    const user = userCheck.rows[0];
    console.log('✅ User found:', {
      id: user.id,
      username: user.username,
      email: user.email,
      is_active: user.is_active
    });
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log('✅ Password hashed');
    
    // Update the password
    await client.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2',
      [hashedPassword, email]
    );
    
    console.log('✅ Password updated successfully!');
    console.log('');
    console.log('📧 Email:', email);
    console.log('🔑 New Password:', newPassword);
    console.log('👤 Username:', user.username);
    console.log('');
    console.log('You can now log in with these credentials.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

resetPassword();
