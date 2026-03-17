# 🚀 QUICK START GUIDE - Chama Plus

## ✅ Current Status

**Database:** ✅ Created and configured  
**Tables:** ✅ 14 tables with complete schema  
**Backend:** ✅ Express server with PostgreSQL connection  
**API:** ⏳ 4 member endpoints implemented, more to build

---

## 📦 What You Have

### Database Structure (PostgreSQL)
```
✅ chamaPlus database
├── 14 tables (users, chamas, members, contributions, loans, etc.)
├── Indexes for performance
├── Foreign key relationships
├── Auto-update triggers
└── Sample chama data
```

### Backend Files
```
backend/
├── server.mjs              # Express API server (running)
├── setup-database.mjs      # Database setup script
├── database/
│   ├── schema.sql         # Complete DB schema
│   └── setup.sql          # Setup commands
├── .env                   # Environment config
├── .env.example           # Template
├── README.md              # Backend docs
└── API_REFERENCE.md       # API endpoints guide
```

### Working API Endpoints
- ✅ `GET /api/test-db` - Test database connection
- ✅ `GET /api/members` - Get all members
- ✅ `GET /api/members/:id` - Get single member
- ✅ `POST /api/members` - Create member
- ✅ `PUT /api/members/:id` - Update member

---

## 🏃 Running the Project

### 1. Start Backend Server

```bash
cd /home/samuel/apps/AkibaPlus/backend
node server.mjs
```

Server runs on: **http://localhost:3001**

### 2. Start Frontend (in new terminal)

```bash
cd /home/samuel/apps/AkibaPlus
npm run dev
```

Frontend runs on: **http://localhost:8080** (or similar)

### 3. Test the Connection

```bash
# Test database
curl http://localhost:3001/api/test-db

# Get members
curl http://localhost:3001/api/members
```

---

## 🎯 Next Development Steps

### Immediate (Phase 1 - Core)

1. **Chamas Management**
   ```javascript
   // In server.mjs, add:
   app.get('/api/chamas', async (req, res) => { /* Get all chamas */ });
   app.post('/api/chamas', async (req, res) => { /* Create chama */ });
   app.get('/api/chamas/:id', async (req, res) => { /* Get chama */ });
   app.put('/api/chamas/:id', async (req, res) => { /* Update chama */ });
   ```

2. **Chama Membership**
   ```javascript
   app.get('/api/chamas/:id/members', async (req, res) => { /* Get chama members */ });
   app.post('/api/chamas/:id/members', async (req, res) => { /* Add member to chama */ });
   ```

3. **Contributions**
   ```javascript
   app.get('/api/contributions', async (req, res) => { /* Get contributions */ });
   app.post('/api/contributions', async (req, res) => { /* Record contribution */ });
   app.get('/api/members/:id/contributions', async (req, res) => { /* Member contributions */ });
   ```

### Short Term (Phase 2 - Financial)

4. **Loans System**
   - Loan application endpoint
   - Loan approval workflow
   - Loan disbursement
   - Payment recording
   - Interest calculation

5. **Fines Management**
   - Issue fines
   - Pay fines
   - Waive fines
   - Fine reports

### Medium Term (Phase 3 - Features)

6. **Meetings & Attendance**
7. **Welfare Fund**
8. **Reports & Analytics**
9. **Transaction Ledger**

### Long Term (Phase 4 - Production)

10. **Authentication (JWT)**
11. **M-Pesa Integration**
12. **SMS/Email Notifications**
13. **Advanced Reporting**
14. **Mobile App API**

---

## 💡 Development Tips

### Adding New Endpoints

1. **Follow the pattern in server.mjs:**
   ```javascript
   app.post('/api/endpoint', async (req, res) => {
     try {
       const { field1, field2 } = req.body;
       const result = await pool.query(
         'INSERT INTO table (field1, field2) VALUES ($1, $2) RETURNING *',
         [field1, field2]
       );
       res.status(201).json(result.rows[0]);
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ 
         error: 'Error message',
         details: error.message 
       });
     }
   });
   ```

2. **Always use parameterized queries** (prevent SQL injection)
3. **Add error handling** (try-catch blocks)
4. **Log errors** for debugging
5. **Return consistent JSON** responses
6. **Use appropriate HTTP status codes**

### Testing Endpoints

Use **Postman**, **Insomnia**, or **curl**:

```bash
# GET request
curl http://localhost:3001/api/chamas

# POST request
curl -X POST http://localhost:3001/api/chamas \
  -H "Content-Type: application/json" \
  -d '{"name": "New Chama", "contribution_amount": 1000}'

# PUT request
curl -X PUT http://localhost:3001/api/chamas/1 \
  -H "Content-Type: application/json" \
  -d '{"contribution_amount": 1500}'
```

### Database Queries

```bash
# Connect to database
sudo -u postgres psql -d chamaPlus

# Common queries
SELECT * FROM chamas;
SELECT * FROM members;
SELECT * FROM contributions WHERE member_id = 1;
SELECT * FROM loans WHERE status = 'active';

# Check relationships
SELECT m.name, c.name as chama_name 
FROM members m 
JOIN chama_members cm ON m.id = cm.member_id
JOIN chamas c ON cm.chama_id = c.id;
```

---

## 📊 Database Schema Overview

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| **chamas** | Group info | name, contribution_amount, loan_interest_rate |
| **members** | Member profiles | name, email, phone, id_number, next_of_kin_* |
| **chama_members** | Membership link | chama_id, member_id, join_date |
| **contributions** | Payments | amount, contribution_date, payment_method |
| **loans** | Loan records | principal_amount, interest_rate, status |
| **loan_payments** | Repayments | loan_id, amount, payment_date |
| **fines** | Penalties | fine_type, amount, status |
| **meetings** | Meeting records | meeting_date, agenda, minutes |
| **meeting_attendance** | Attendance | meeting_id, member_id, status |
| **welfare_contributions** | Welfare fund | amount, contribution_date |
| **welfare_requests** | Welfare claims | request_type, amount_requested, status |
| **transactions** | General ledger | transaction_type, amount, debit_credit |

---

## 🔧 Troubleshooting

### Backend won't start
```bash
# Check if port 3001 is in use
lsof -i :3001
# Kill process if needed
kill -9 <PID>

# Check for missing packages
cd /home/samuel/apps/AkibaPlus
npm install
```

### Database connection fails
```bash
# Check PostgreSQL status
sudo service postgresql status

# Restart if needed
sudo service postgresql restart

# Test connection manually
sudo -u postgres psql -d chamaPlus -c "SELECT 1;"
```

### Frontend can't reach backend
1. Check CORS settings in `server.mjs`
2. Verify backend is running: `curl http://localhost:3001/api/test-db`
3. Check frontend API base URL configuration

---

## 📱 Frontend Integration

### Update your frontend API calls:

```javascript
// src/lib/api.js or similar
const API_BASE_URL = 'http://localhost:3001/api';

export const api = {
  // Members
  getMembers: () => fetch(`${API_BASE_URL}/members`).then(r => r.json()),
  getMember: (id) => fetch(`${API_BASE_URL}/members/${id}`).then(r => r.json()),
  createMember: (data) => fetch(`${API_BASE_URL}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()),
  
  // Add more as you build them...
  getChamas: () => fetch(`${API_BASE_URL}/chamas`).then(r => r.json()),
  getContributions: (chamaId) => fetch(`${API_BASE_URL}/chamas/${chamaId}/contributions`).then(r => r.json()),
  // etc...
};
```

---

## 🚀 Deployment Checklist (Later)

When ready for production:

- [ ] Change database password from 'root'
- [ ] Use environment variables for secrets
- [ ] Add authentication/authorization
- [ ] Set up HTTPS/SSL
- [ ] Configure production CORS
- [ ] Set up database backups
- [ ] Add rate limiting
- [ ] Implement logging system
- [ ] Set up monitoring
- [ ] Choose hosting platform
- [ ] Set up CI/CD pipeline

---

## 📚 Documentation

- **Backend README:** [backend/README.md](backend/README.md)
- **API Reference:** [backend/API_REFERENCE.md](backend/API_REFERENCE.md)
- **Database Schema:** [backend/database/schema.sql](backend/database/schema.sql)
- **Setup Guide:** [DATABASE_SETUP_COMPLETE.md](DATABASE_SETUP_COMPLETE.md)

---

## 🎉 You're All Set!

### What's Working:
✅ PostgreSQL database with complete schema  
✅ Express backend server  
✅ Member management API  
✅ Database connection tested  

### What's Next:
🔨 Build remaining API endpoints  
🔨 Connect frontend to backend  
🔨 Add authentication  
🔨 Implement business logic  
🔨 Test thoroughly  
🔨 Deploy to production  

---

## 💬 Need Help?

1. Check the error logs: `backend/server.log`
2. Review database logs: `sudo tail -f /var/log/postgresql/*.log`
3. Test endpoints with curl or Postman
4. Check the documentation files above

**Happy Coding! 🚀**

---

**Project:** Chama Plus Management System  
**Stack:** React + Vite + Express + PostgreSQL  
**Status:** Database Ready, API In Progress  
**Date:** February 4, 2026
