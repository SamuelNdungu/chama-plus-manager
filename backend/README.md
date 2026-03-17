# Chama Plus Backend

Backend API for Chama Plus Management System

## Database Setup

### Prerequisites
- PostgreSQL 12 or higher installed
- Node.js 18 or higher

### Quick Setup

1. **Start PostgreSQL**
   ```bash
   sudo service postgresql start
   # or on macOS with Homebrew:
   brew services start postgresql
   ```

2. **Run the database setup script**
   ```bash
   node setup-database.mjs
   ```

   This will:
   - Create the `chamaPlus` database
   - Set up all tables and relationships
   - Create indexes for performance
   - Add triggers for automatic timestamps

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your actual database credentials
   ```

4. **Install dependencies** (if not already done)
   ```bash
   npm install
   # or
   cd .. && npm install
   ```

5. **Start the server**
   ```bash
   node server.mjs
   ```

### Manual Setup (Alternative)

If you prefer to set up manually:

```bash
# 1. Create database
psql -U postgres -c "CREATE DATABASE chamaPlus;"

# 2. Run schema
psql -U postgres -d chamaPlus -f database/schema.sql

# 3. Verify setup
psql -U postgres -d chamaPlus -c "\dt"
```

## Database Schema

The system includes the following main tables:

### Core Tables
- **users** - User authentication
- **chamas** - Chama/group information
- **members** - Member profiles
- **chama_members** - Members-to-chamas relationship

### Financial Tables
- **contributions** - Member contributions
- **loans** - Loan records
- **loan_payments** - Loan repayments
- **fines** - Fines and penalties
- **welfare_contributions** - Welfare fund contributions
- **welfare_requests** - Welfare disbursement requests
- **transactions** - General ledger

### Activity Tables
- **meetings** - Meeting records
- **meeting_attendance** - Attendance tracking
- **member_roles** - Member positions in chama

## API Endpoints

### Current Endpoints

#### Members
- `GET /api/members` - Get all members
- `GET /api/members/:id` - Get member by ID
- `POST /api/members` - Create new member
- `PUT /api/members/:id` - Update member

#### Health Check
- `GET /api/test-db` - Test database connection

### Planned Endpoints

See the project roadmap for upcoming API endpoints for:
- Contributions management
- Loan processing
- Meeting management
- Financial reporting
- Welfare requests

## Database Connection

Default configuration:
- **Host:** 127.0.0.1
- **Port:** 5432
- **Database:** chamaPlus
- **User:** postgres
- **Password:** root (change in production!)

Update these in `.env` file for your environment.

## Development

### Running the server
```bash
node server.mjs
```

### Testing database connection
```bash
curl http://localhost:3001/api/test-db
```

### View database tables
```bash
psql -U postgres -d chamaPlus -c "\dt"
```

### Check table structure
```bash
psql -U postgres -d chamaPlus -c "\d+ members"
```

## Security Notes

⚠️ **Important for Production:**
1. Change default database password
2. Use environment variables for sensitive data
3. Implement proper authentication/authorization
4. Enable SSL for database connections
5. Set up database backups
6. Use prepared statements (already implemented)
7. Implement rate limiting
8. Add input validation middleware

## Troubleshooting

### Database connection fails
```bash
# Check if PostgreSQL is running
sudo service postgresql status

# Check if you can connect manually
psql -U postgres -d chamaPlus

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*-main.log
```

### Permission errors
```bash
# Grant permissions
psql -U postgres -d chamaPlus
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
```

### Reset database
```bash
# Drop and recreate
psql -U postgres -c "DROP DATABASE chamaPlus;"
node setup-database.mjs
```

## Next Steps

1. ✅ Database schema created
2. ⏳ Complete all API endpoints
3. ⏳ Add authentication (JWT)
4. ⏳ Implement business logic
5. ⏳ Add data validation
6. ⏳ Create API documentation
7. ⏳ Write tests
8. ⏳ Set up production deployment

## Support

For issues or questions, please check the main project README or create an issue on GitHub.
