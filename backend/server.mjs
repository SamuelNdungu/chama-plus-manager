
import express from 'express';
import bodyParser from 'body-parser';
import pkg from 'pg';
import cors from 'cors';

const { Pool } = pkg;

const app = express();
const port = 3001;

// Update CORS configuration to allow all necessary origins
// Update CORS configuration to include port 8082
app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://localhost:8081',
    'http://localhost:8082',
    'http://192.168.1.105:8080',
    'http://192.168.1.105:8081',
    'http://192.168.1.105:8082'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
  credentials: true
}));

// Middleware
app.use(bodyParser.json());

// Remove these duplicate CORS lines
// app.use(cors());
// app.use(cors());

// PostgreSQL connection
const pool = new Pool({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'chamaPlus',
  password: 'root',
  port: 5432,
});

// Remove incorrect URL line and connect to database
pool.connect()
  .then(() => { 
    console.log('Successfully connected to PostgreSQL database');
  })
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });

// Test endpoint to verify database connection
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      status: 'success',
      message: 'Database connection successful',
      timestamp: result.rows[0].now
    });
  } catch (error) {
    console.error('Database test failed:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Database connection failed'
    });
  }
});

// API endpoint to add a member
// Remove this incorrect line
// http://localhost:3001/api/test-db 

// Fix the syntax error in the API endpoint (remove 'ready')
app.post('/api/members', async (req, res) => {
  try {
    // Log the complete request body
    console.log('Complete request body:', JSON.stringify(req.body, null, 2));

    const { 
      name, 
      email, 
      phone, 
      role, 
      idNumber: id_number,
      nextOfKin: {
        name: nextOfKinName,
        phone: nextOfKinPhone,
        email: nextOfKinEmail,
        relationship: nextOfKinRelationship,
        idNumber: nextOfKinIdNumber
      }
    } = req.body;

    // Log the extracted data
    console.log('Extracted data:', {
      name, email, phone, role, id_number,
      nextOfKinName, nextOfKinPhone, nextOfKinEmail,
      nextOfKinRelationship, nextOfKinIdNumber
    });

    const result = await pool.query(
      'INSERT INTO members (name, email, phone, role, id_number, next_of_kin_name, next_of_kin_email, next_of_kin_phone, next_of_kin_relationship, next_of_kin_id_number) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [name, email, phone, role, id_number, nextOfKinName, nextOfKinPhone, nextOfKinEmail, nextOfKinRelationship, nextOfKinIdNumber]
    );

    console.log('Query result:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    // Enhanced error logging
    console.error('Detailed error information:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    if (error.detail) console.error('PostgreSQL error detail:', error.detail);
    if (error.code) console.error('PostgreSQL error code:', error.code);
    if (error.constraint) console.error('PostgreSQL constraint:', error.constraint);

    res.status(500).json({ 
      error: 'Failed to add member',
      details: error.message,
      code: error.code,
      detail: error.detail
    });
  }
});

// Add GET endpoint for fetching all members
app.get('/api/members', async (req, res) => {
  try {
    console.log('Fetching members...');
    const result = await pool.query('SELECT * FROM members ORDER BY id DESC');
    console.log('Members fetched:', result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching members:', error);
    console.error('SQL Error details:', {
      code: error.code,
      detail: error.detail,
      table: error.table
    });
    res.status(500).json({ 
      error: 'Failed to fetch members',
      details: error.message,
      code: error.code
    });
  }
})
// Add GET endpoint for fetching a single member
app.get('/api/members/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        id, name, email, phone, role, id_number,
        next_of_kin_name, next_of_kin_phone, next_of_kin_email,
        next_of_kin_relationship, next_of_kin_id_number,
        created_at as "joinedAt"
      FROM members 
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Format the data to match your frontend structure
    const member = result.rows[0];
    const formattedMember = {
      id: member.id,
      name: member.name,
      email: member.email,
      phone: member.phone,
      role: member.role,
      idNumber: member.id_number,
      joinedAt: new Date(member.joinedAt).toLocaleDateString(),
      nextOfKin: {
        name: member.next_of_kin_name,
        phone: member.next_of_kin_phone,
        email: member.next_of_kin_email,
        relationship: member.next_of_kin_relationship,
        idNumber: member.next_of_kin_id_number
      }
    };

    res.json(formattedMember);
  } catch (error) {
    console.error('Error fetching member:', error);
    res.status(500).json({ 
      error: 'Failed to fetch member details',
      details: error.message
    });
  }
});

// Add PUT endpoint for updating a member
app.put('/api/members/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, email, phone, role, idNumber: id_number,
      nextOfKin: {
        name: nextOfKinName,
        phone: nextOfKinPhone,
        email: nextOfKinEmail,
        relationship: nextOfKinRelationship,
        idNumber: nextOfKinIdNumber
      }
    } = req.body;

    const result = await pool.query(
      `UPDATE members 
       SET name = $1, email = $2, phone = $3, role = $4, id_number = $5,
           next_of_kin_name = $6, next_of_kin_phone = $7, next_of_kin_email = $8,
           next_of_kin_relationship = $9, next_of_kin_id_number = $10
       WHERE id = $11 RETURNING *`,
      [name, email, phone, role, id_number, 
       nextOfKinName, nextOfKinPhone, nextOfKinEmail,
       nextOfKinRelationship, nextOfKinIdNumber, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating member:', error);
    res.status(500).json({ 
      error: 'Failed to update member',
      details: error.message
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
