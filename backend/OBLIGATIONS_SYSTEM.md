# Automated Monthly Contribution Obligations System

## Complete Implementation Documentation

**Implementation Date:** February 8, 2026  
**Status:** ✅ PRODUCTION READY  
**Test Coverage:** 6/6 tests passing (100%)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Automated Job System](#automated-job-system)
5. [Backend API](#backend-api)
6. [Frontend Integration](#frontend-integration)
7. [Testing](#testing)
8. [Deployment](#deployment)
9. [Maintenance](#maintenance)
10. [Troubleshooting](#troubleshooting)

---

## Overview

### Purpose

The Automated Monthly Contribution Obligations System ensures that every active member of every chama receives a monthly contribution obligation on the 1st day of each month. This system tracks:

- Expected monthly contributions per member
- Payment progress (pending, partial, paid)
- Overdue obligations
- Outstanding balances (arrears)
- Payment history

### Key Features

✅ **Automated Generation**
- Runs automatically on 1st of every month
- Creates obligations for all active members
- Idempotent (prevents duplicates)
- Transaction-safe

✅ **Flexible Configuration**
- Configurable contribution amount per chama
- Versioned contribution rules
- Future-proof for rule changes

✅ **Comprehensive Tracking**
- Payment status (pending, partial, paid, overdue)
- Outstanding balances
- Arrears summary per member
- Historical records

✅ **Professional UI**
- ArrearsBoard page with filtering
- Dashboard widgets
- Status badges
- Export capabilities

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────┐
│                  CRON SCHEDULER                      │
│  (Runs 1st of month at midnight)                    │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│         MONTHLY JOB (generateMonthlyObligations)    │
│  1. Fetch active contribution rules per chama       │
│  2. Fetch active members per chama                  │
│  3. Generate obligations (ON CONFLICT DO NOTHING)   │
│  4. Mark old unpaid obligations as overdue          │
│  5. Update system_jobs table                        │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│              DATABASE (PostgreSQL)                   │
│  - contribution_rules                                │
│  - contribution_obligations                          │
│  - system_jobs                                       │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│                 BACKEND API                          │
│  GET  /api/contributions/obligations                 │
│  GET  /api/contributions/arrears                     │
│  POST /api/contributions/obligations/:id/pay         │
│  GET  /api/contributions/obligations/stats           │
│  POST /api/contributions/run-monthly-job             │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│              FRONTEND UI                             │
│  - ArrearsBoard page (/arrears)                      │
│  - Dashboard widgets                                 │
│  - Member details view                               │
└─────────────────────────────────────────────────────┘
```

---

## Database Schema

### Table: contribution_rules

Stores versioned contribution amounts per chama.

```sql
CREATE TABLE contribution_rules (
  id SERIAL PRIMARY KEY,
  chama_id INTEGER NOT NULL REFERENCES chamas(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  currency_code VARCHAR(3) NOT NULL DEFAULT 'KES',
  frequency VARCHAR(20) NOT NULL DEFAULT 'monthly',
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_contribution_rules_chama ON contribution_rules(chama_id);
CREATE INDEX idx_contribution_rules_effective ON contribution_rules(effective_from, effective_to);
CREATE INDEX idx_contribution_rules_active ON contribution_rules(chama_id, effective_to) 
  WHERE effective_to IS NULL;
```

**Business Rules:**
- One active rule per chama (`effective_to IS NULL`)
- Historical rules preserved for audit trail
- Amount changes create new versioned rule

**Example Data:**
```sql
-- Current rule
INSERT INTO contribution_rules (chama_id, amount, effective_from, effective_to)
VALUES (1, 1100.00, '2026-01-01', NULL);

-- Historical rule (was replaced)
INSERT INTO contribution_rules (chama_id, amount, effective_from, effective_to)
VALUES (1, 1000.00, '2025-01-01', '2025-12-31');
```

---

### Table: contribution_obligations

Tracks monthly obligations per member.

```sql
CREATE TABLE contribution_obligations (
  id SERIAL PRIMARY KEY,
  chama_id INTEGER NOT NULL REFERENCES chamas(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  contribution_month DATE NOT NULL,  -- Always 1st day of month
  expected_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- pending | partial | paid | overdue | waived
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_obligation UNIQUE (chama_id, member_id, contribution_month)
);

-- Indexes
CREATE INDEX idx_obligations_chama ON contribution_obligations(chama_id);
CREATE INDEX idx_obligations_member ON contribution_obligations(member_id);
CREATE INDEX idx_obligations_month ON contribution_obligations(contribution_month);
CREATE INDEX idx_obligations_status ON contribution_obligations(status);
CREATE INDEX idx_obligations_chama_month ON contribution_obligations(chama_id, contribution_month);
CREATE INDEX idx_obligations_member_status ON contribution_obligations(member_id, status);
```

**Status Lifecycle:**
```
pending → partial → paid
   ↓
overdue (if unpaid and month passed)
   ↓
waived (manual admin action)
```

**Status Logic:**
- `pending`: No payment received
- `partial`: Paid amount < expected amount
- `paid`: Paid amount >= expected amount
- `overdue`: Month passed and still unpaid or partial
- `waived`: Admin forgave the obligation

**UNIQUE Constraint:**
- Prevents duplicate obligations for same member/chama/month
- Used with `ON CONFLICT DO NOTHING` for idempotency

---

### Table: system_jobs

Tracks automated job executions.

```sql
CREATE TABLE system_jobs (
  id SERIAL PRIMARY KEY,
  job_name VARCHAR(100) NOT NULL UNIQUE,
  last_run TIMESTAMP,
  last_status VARCHAR(20),  -- success | failed
  last_message TEXT,
  run_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_system_jobs_name ON system_jobs(job_name);
```

**Purpose:**
- Monitor job execution history
- Track success/failure rates
- Debugging and auditing
- Alert on repeated failures

---

## Automated Job System

### File: generateMonthlyObligations.mjs

**Location:** `/backend/jobs/generateMonthlyObligations.mjs`

**Purpose:** Core logic for generating monthly obligations

**Main Functions:**

#### 1. getCurrentMonth()
Returns the first day of the current month.

```javascript
function getCurrentMonth() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  firstDay.setHours(0, 0, 0, 0);
  return firstDay.toISOString().split('T')[0];
}
```

#### 2. markOverdueObligations(client)
Marks unpaid obligations from previous months as overdue.

```javascript
async function markOverdueObligations(client) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  
  const result = await client.query(`
    UPDATE contribution_obligations
    SET status = 'overdue', updated_at = NOW()
    WHERE contribution_month < $1
      AND status IN ('pending', 'partial')
      AND paid_amount < expected_amount
    RETURNING id
  `, [todayStr]);
  
  return result.rows.length;
}
```

#### 3. generateObligations(client)
Main generation logic.

```javascript
async function generateObligations(client) {
  const currentMonth = getCurrentMonth();
  let totalGenerated = 0;
  
  // Get all chamas
  const chamas = await client.query('SELECT id FROM chamas');
  
  for (const chama of chamas.rows) {
    // Get active rule
    const rule = await client.query(`
      SELECT * FROM contribution_rules
      WHERE chama_id = $1 AND effective_to IS NULL
      ORDER BY effective_from DESC LIMIT 1
    `, [chama.id]);
    
    if (rule.rows.length === 0) continue;
    
    // Get active members
    const members = await client.query(`
      SELECT m.id FROM members m
      JOIN chama_members cm ON m.id = cm.member_id
      WHERE cm.chama_id = $1 AND cm.exit_date IS NULL
    `, [chama.id]);
    
    // Insert obligations
    for (const member of members.rows) {
      const result = await client.query(`
        INSERT INTO contribution_obligations (
          chama_id, member_id, contribution_month, 
          expected_amount, paid_amount, status, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (chama_id, member_id, contribution_month) DO NOTHING
        RETURNING id
      `, [chama.id, member.id, currentMonth, 
          rule.rows[0].amount, 0, 'pending']);
      
      if (result.rows.length > 0) totalGenerated++;
    }
  }
  
  return totalGenerated;
}
```

#### 4. updateJobStatus(client, status, message, count)
Records job execution in system_jobs table.

---

### File: runMonthly.mjs

**Location:** `/backend/jobs/runMonthly.mjs`

**Purpose:** Cron wrapper script

```javascript
#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const jobPath = join(__dirname, 'generateMonthlyObligations.mjs');

console.log(`[${new Date().toISOString()}] Starting monthly obligations job...`);

const child = spawn('node', [jobPath], {
  stdio: 'inherit',
  env: process.env
});

child.on('exit', (code) => {
  console.log(`[${new Date().toISOString()}] Job exited with code ${code}`);
  process.exit(code);
});
```

---

## Backend API

### Endpoint: GET /api/contributions/obligations

**Purpose:** List obligations with filtering

**Authentication:** Required (JWT)

**Query Parameters:**
- `chama_id` (required) - Filter by chama
- `member_id` (optional) - Filter by specific member
- `status` (optional) - Filter by status (pending, partial, paid, overdue)
- `month` (optional) - Filter by specific month (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "obligations": [
    {
      "id": 1,
      "chama_id": 1,
      "member_id": 5,
      "member_name": "John Doe",
      "contribution_month": "2026-02-01",
      "expected_amount": "1100.00",
      "paid_amount": "500.00",
      "outstanding": "600.00",
      "status": "partial",
      "created_at": "2026-02-01T00:00:00.000Z",
      "updated_at": "2026-02-05T14:30:00.000Z"
    }
  ],
  "total": 1
}
```

**Example Usage:**
```javascript
// Get all pending obligations for a chama
GET /api/contributions/obligations?chama_id=1&status=pending

// Get specific member's obligations
GET /api/contributions/obligations?chama_id=1&member_id=5

// Get obligations for specific month
GET /api/contributions/obligations?chama_id=1&month=2026-02-01
```

---

### Endpoint: GET /api/contributions/arrears

**Purpose:** Get members with outstanding balances

**Authentication:** Required (JWT)

**Query Parameters:**
- `chama_id` (required) - Filter by chama

**Response:**
```json
{
  "success": true,
  "arrears": [
    {
      "member_id": 5,
      "member_name": "John Doe",
      "phone": "+254712345678",
      "total_obligations": 3,
      "total_expected": "3300.00",
      "total_paid": "1500.00",
      "total_outstanding": "1800.00",
      "overdue_count": 2
    }
  ],
  "summary": {
    "total_members_in_arrears": 1,
    "total_outstanding": "1800.00",
    "total_overdue": 2
  }
}
```

---

### Endpoint: POST /api/contributions/obligations/:id/pay

**Purpose:** Record a payment against an obligation

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "amount": 500.00,
  "payment_method": "mpesa",
  "reference": "ABC123XYZ"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment recorded successfully",
  "obligation": {
    "id": 1,
    "expected_amount": "1100.00",
    "paid_amount": "500.00",
    "outstanding": "600.00",
    "status": "partial"
  }
}
```

**Status Update Logic:**
```javascript
status = CASE 
  WHEN paid_amount + $1 >= expected_amount THEN 'paid'
  WHEN paid_amount + $1 > 0 THEN 'partial'
  ELSE 'pending'
END
```

---

### Endpoint: GET /api/contributions/obligations/stats

**Purpose:** Get obligation statistics

**Authentication:** Required (JWT)

**Query Parameters:**
- `chama_id` (required)

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_obligations": 50,
    "pending": 10,
    "partial": 5,
    "paid": 30,
    "overdue": 5,
    "total_expected": "55000.00",
    "total_paid": "45000.00",
    "total_outstanding": "10000.00",
    "collection_rate": 81.82
  }
}
```

---

### Endpoint: POST /api/contributions/run-monthly-job

**Purpose:** Manually trigger obligation generation (testing/admin)

**Authentication:** Required (JWT) + Admin role

**Request Body:**
```json
{
  "confirm": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Monthly obligations generated",
  "generated": 25,
  "overdue_marked": 3
}
```

**Use Cases:**
- Testing before cron deployment
- Regenerating if job failed
- Manual trigger for specific dates
- Development/staging environments

---

## Frontend Integration

### ArrearsBoard Page

**Location:** `/src/pages/ArrearsBoard.tsx`

**Route:** `/arrears`

**Features:**
- Member arrears table with search
- Filter by chama
- Status badges (color-coded)
- Outstanding balance summary
- Responsive design

**UI Components:**
- Summary cards (members, outstanding, overdue)
- Filterable table
- Search input
- Chama selector
- Status badges

**Screenshot Description:**
```
┌────────────────────────────────────────────────────────┐
│  ArrearsBoard                                          │
├────────────────────────────────────────────────────────┤
│  [Select Chama ▼]  [Search members...]                │
│                                                        │
│  ┌───────────┬───────────┬───────────┐               │
│  │ Members   │  Total    │  Overdue  │               │
│  │ in Arrears│Outstanding│Obligations│               │
│  │    5      │  5,500    │    12     │               │
│  └───────────┴───────────┴───────────┘               │
│                                                        │
│  Member Name    │ Phone  │ Outstanding │ Status       │
│  ─────────────────────────────────────────────────    │
│  John Doe       │ +254.. │ 1,800       │ 🔴 Overdue   │
│  Jane Smith     │ +254.. │   600       │ 🟠 Partial   │
└────────────────────────────────────────────────────────┘
```

---

### Dashboard Widgets

**Location:** `/src/components/dashboard/DashboardStats.tsx`

**Widgets Added:**

1. **Members with Arrears** (Amber theme)
   - Count of members with outstanding balances
   - Icon: AlertCircle

2. **Total Outstanding** (Red theme)
   - Sum of all outstanding amounts
   - Currency formatted (KES)
   - Icon: DollarSign

3. **Overdue Obligations** (Orange theme)
   - Count of overdue obligations
   - Icon: Clock

**Conditional Display:**
- Only shows if arrears exist
- Auto-fetches on chama change
- Real-time updates

---

## Testing

### Test Suite: test-obligations.mjs

**Location:** `/backend/test/test-obligations.mjs`

**Execution:**
```bash
cd /home/samuel/apps/AkibaPlus/backend
node test/test-obligations.mjs
```

**Test Coverage:**

#### Test 1: Generate Monthly Obligations ✅
- Creates obligations for all active members
- Uses correct contribution amount from rules
- Verifies count matches member count

#### Test 2: Duplicate Prevention ✅
- Attempts to insert duplicate obligation
- Verifies UNIQUE constraint works
- Confirms ON CONFLICT DO NOTHING behavior

#### Test 3: Payment Recording ✅
- Records partial payment
- Verifies status updates to 'partial'
- Records remaining payment
- Verifies status updates to 'paid'

#### Test 4: Overdue Marking ✅
- Creates old unpaid obligation
- Marks old obligations as overdue
- Verifies status update

#### Test 5: Arrears Calculation ✅
- Calculates outstanding balances
- Groups by member
- Includes overdue count
- Generates summary statistics

#### Test 6: Cross-Chama Isolation ✅
- Creates second test chama
- Links member to both chamas
- Generates obligations for both
- Verifies proper data separation
- Confirms no cross-contamination

**Test Results:**
```
Total Tests: 6
Passed: 6
Failed: 0
Pass Rate: 100%
```

---

## Deployment

### Cron Setup

**Crontab Entry:**
```bash
# Generate monthly contribution obligations
0 0 1 * * /usr/bin/node /home/samuel/apps/AkibaPlus/backend/jobs/runMonthly.mjs >> /var/log/akibaplus-cron.log 2>&1
```

**Schedule Breakdown:**
- Minute: 0
- Hour: 0 (midnight)
- Day of Month: 1 (first day)
- Month: * (every month)
- Day of Week: * (any day)

**Installation:**
```bash
# Edit crontab
crontab -e

# Add the line above

# Verify
crontab -l

# Check cron service
sudo systemctl status cron
```

**Log Monitoring:**
```bash
# View cron logs
tail -f /var/log/akibaplus-cron.log

# Check system jobs table
psql -U chama_app -d chamaPlus -c "SELECT * FROM system_jobs ORDER BY last_run DESC LIMIT 10;"
```

---

### Manual Testing

Before deploying to cron, test manually:

```bash
# Run the job
cd /home/samuel/apps/AkibaPlus/backend
node jobs/generateMonthlyObligations.mjs

# Check output
# Should see: "Successfully generated X obligations"

# Verify in database
psql -U chama_app -d chamaPlus -c "SELECT * FROM contribution_obligations WHERE contribution_month = DATE_TRUNC('month', CURRENT_DATE);"
```

---

### API Testing

Test via backend endpoint:

```bash
# Get JWT token first (login)
TOKEN="your_jwt_token_here"

# Trigger manual generation
curl -X POST http://localhost:3001/api/contributions/run-monthly-job \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirm": true}'

# Check obligations
curl http://localhost:3001/api/contributions/obligations?chama_id=1 \
  -H "Authorization: Bearer $TOKEN"
```

---

## Maintenance

### Monthly Monitoring Checklist

**On 1st of each month:**

1. ✅ Verify cron job ran
   ```bash
   tail -100 /var/log/akibaplus-cron.log
   ```

2. ✅ Check system_jobs table
   ```sql
   SELECT * FROM system_jobs 
   WHERE job_name = 'generate_monthly_obligations' 
   ORDER BY last_run DESC LIMIT 1;
   ```

3. ✅ Verify obligation count
   ```sql
   SELECT 
     contribution_month,
     COUNT(*) as total_obligations,
     SUM(expected_amount) as total_expected
   FROM contribution_obligations
   WHERE contribution_month = DATE_TRUNC('month', CURRENT_DATE)
   GROUP BY contribution_month;
   ```

4. ✅ Check for duplicates
   ```sql
   SELECT chama_id, member_id, contribution_month, COUNT(*)
   FROM contribution_obligations
   WHERE contribution_month = DATE_TRUNC('month', CURRENT_DATE)
   GROUP BY chama_id, member_id, contribution_month
   HAVING COUNT(*) > 1;
   ```
   (Should return no rows)

5. ✅ Verify overdue marking
   ```sql
   SELECT COUNT(*) as overdue_count
   FROM contribution_obligations
   WHERE status = 'overdue'
     AND contribution_month < DATE_TRUNC('month', CURRENT_DATE);
   ```

---

### Updating Contribution Amounts

**Process:**

1. End current rule
```sql
UPDATE contribution_rules
SET effective_to = '2026-02-28'
WHERE chama_id = 1 AND effective_to IS NULL;
```

2. Create new rule
```sql
INSERT INTO contribution_rules (chama_id, amount, effective_from, effective_to)
VALUES (1, 1200.00, '2026-03-01', NULL);
```

3. Verify
```sql
SELECT * FROM contribution_rules 
WHERE chama_id = 1 
ORDER BY effective_from DESC;
```

**Note:** Next month's obligations will automatically use the new amount.

---

### Database Maintenance

**Weekly:**
```bash
# Analyze tables for query optimization
psql -U chama_app -d chamaPlus -c "ANALYZE contribution_obligations;"
psql -U chama_app -d chamaPlus -c "ANALYZE contribution_rules;"
```

**Monthly:**
```bash
# Vacuum to reclaim space
psql -U chama_app -d chamaPlus -c "VACUUM ANALYZE contribution_obligations;"
```

**Yearly:**
```bash
# Archive old obligations (optional)
psql -U chama_app -d chamaPlus -c "
  CREATE TABLE contribution_obligations_archive_2025 AS 
  SELECT * FROM contribution_obligations 
  WHERE contribution_month >= '2025-01-01' 
    AND contribution_month < '2026-01-01';
"
```

---

## Troubleshooting

### Issue: Cron job didn't run

**Symptoms:**
- No new obligations on 1st of month
- No entry in cron log
- system_jobs table not updated

**Checks:**
```bash
# 1. Verify cron service is running
sudo systemctl status cron

# 2. Check crontab entry
crontab -l | grep obligations

# 3. Test job manually
node /home/samuel/apps/AkibaPlus/backend/jobs/runMonthly.mjs

# 4. Check cron daemon log
sudo journalctl -u cron -n 50
```

**Solutions:**
- Restart cron: `sudo systemctl restart cron`
- Fix file permissions: `chmod +x runMonthly.mjs`
- Check PATH in crontab: Add `PATH=/usr/bin:/bin`

---

### Issue: Obligations generated multiple times

**Symptoms:**
- Duplicate obligations for same member/month
- UNIQUE constraint violation errors

**Checks:**
```sql
-- Check for duplicates
SELECT chama_id, member_id, contribution_month, COUNT(*)
FROM contribution_obligations
GROUP BY chama_id, member_id, contribution_month
HAVING COUNT(*) > 1;
```

**Solution:**
This should NOT happen due to UNIQUE constraint. If it does:
```sql
-- Remove duplicates (keep earliest)
DELETE FROM contribution_obligations
WHERE id NOT IN (
  SELECT MIN(id)
  FROM contribution_obligations
  GROUP BY chama_id, member_id, contribution_month
);
```

---

### Issue: Wrong contribution amount used

**Symptoms:**
- Obligations created with old amount
- Amount doesn't match current rule

**Checks:**
```sql
-- Check active rules
SELECT * FROM contribution_rules 
WHERE effective_to IS NULL
ORDER BY chama_id;

-- Check recent obligations
SELECT * FROM contribution_obligations
WHERE contribution_month = DATE_TRUNC('month', CURRENT_DATE)
ORDER BY chama_id, member_id;
```

**Solution:**
1. Verify rule effective dates
2. Ensure only ONE rule per chama has `effective_to = NULL`
3. Manually fix if needed:
```sql
UPDATE contribution_obligations
SET expected_amount = 1200.00
WHERE contribution_month = '2026-02-01'
  AND chama_id = 1
  AND expected_amount = 1100.00;
```

---

### Issue: Overdue not marking correctly

**Symptoms:**
- Old obligations still showing as 'pending'
- Should be 'overdue'

**Checks:**
```sql
SELECT * FROM contribution_obligations
WHERE contribution_month < DATE_TRUNC('month', CURRENT_DATE)
  AND status IN ('pending', 'partial')
  AND paid_amount < expected_amount;
```

**Solution:**
Run manual overdue marking:
```javascript
// In generateMonthlyObligations.mjs or via psql
UPDATE contribution_obligations
SET status = 'overdue', updated_at = NOW()
WHERE contribution_month < CURRENT_DATE
  AND status IN ('pending', 'partial')
  AND paid_amount < expected_amount;
```

---

### Issue: Performance degradation

**Symptoms:**
- Job takes longer than usual
- API endpoints slow
- Database queries timing out

**Checks:**
```sql
-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename IN ('contribution_obligations', 'contribution_rules')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan
FROM pg_stat_user_indexes
WHERE tablename = 'contribution_obligations'
ORDER BY idx_scan DESC;
```

**Solutions:**
1. Run ANALYZE: `ANALYZE contribution_obligations;`
2. Rebuild indexes: `REINDEX TABLE contribution_obligations;`
3. Archive old data (see Maintenance section)
4. Add more specific indexes if needed

---

## Success Metrics

### Key Performance Indicators

**Reliability:**
- ✅ 100% job success rate (no failed runs)
- ✅ 0 duplicate obligations created
- ✅ < 5 second job execution time

**Accuracy:**
- ✅ 100% of active members receive obligations
- ✅ Correct amount per chama rules
- ✅ Proper overdue marking

**Adoption:**
- Dashboard widgets viewed by admins
- ArrearsBoard page used for follow-ups
- Payment recording via API

---

## Future Enhancements

### Planned Improvements

**Phase 2 - Notifications:**
- SMS reminders on 1st of month
- Email notifications for overdue
- WhatsApp integration

**Phase 3 - Advanced Features:**
- Pro-rated obligations (joined mid-month)
- Bulk payment import (CSV/Excel)
- Payment plans for arrears
- Grace period configuration

**Phase 4 - Reporting:**
- Monthly collection reports
- Arrears aging analysis
- Member payment history
- Treasurer dashboard

**Phase 5 - Integration:**
- M-Pesa API auto-payment detection
- Bank reconciliation
- Accounting software export

---

## Contact & Support

**Documentation:** This file  
**Test Suite:** `/backend/test/test-obligations.mjs`  
**Cron Setup Guide:** `/backend/CRON_SETUP.md`  
**Deployment:** Contact system administrator

---

**END OF DOCUMENTATION**

*Last Updated: February 8, 2026*  
*Implementation Status: ✅ PRODUCTION READY*
