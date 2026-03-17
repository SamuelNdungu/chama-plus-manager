# Automated Monthly Obligations - Cron Setup Guide

## Overview

The monthly contribution obligations system requires an automated job that runs on the 1st of every month at midnight to generate payment obligations for all active members.

## Prerequisites

- Database migration must be completed (see `database/MIGRATION_INSTRUCTIONS.md`)
- Node.js 20+ installed
- Backend environment variables configured (`.env` file)
- Write access to `/var/log` for logging

## Installation

### Step 1: Make Scripts Executable

```bash
chmod +x /home/samuel/apps/AkibaPlus/backend/jobs/runMonthly.mjs
chmod +x /home/samuel/apps/AkibaPlus/backend/jobs/generateMonthlyObligations.mjs
```

### Step 2: Create Log Directory

```bash
# Create log directory if it doesn't exist
sudo mkdir -p /var/log/akibaplus
sudo chown samuel:samuel /var/log/akibaplus
```

### Step 3: Install Cron Job

```bash
# Edit crontab
crontab -e

# Add the following line at the end:
# Runs at midnight on the 1st of every month
0 0 1 * * /usr/bin/node /home/samuel/apps/AkibaPlus/backend/jobs/runMonthly.mjs >> /var/log/akibaplus/monthly-obligations.log 2>&1 
```

## Cron Schedule Explained

```
0 0 1 * * command
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, Sunday=0 or 7)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

Our schedule: `0 0 1 * *` = At 00:00 (midnight) on day 1 of every month

## Alternative Schedules

### For Testing (runs every day at 2 AM)
```cron
0 2 * * * /usr/bin/node /home/samuel/apps/AkibaPlus/backend/jobs/runMonthly.mjs >> /var/log/akibaplus/monthly-obligations.log 2>&1
```

### For Testing (runs every hour)
```cron
0 * * * * /usr/bin/node /home/samuel/apps/AkibaPlus/backend/jobs/runMonthly.mjs >> /var/log/akibaplus/monthly-obligations.log 2>&1
```

### Production (1st of every month at midnight)
```cron
0 0 1 * * /usr/bin/node /home/samuel/apps/AkibaPlus/backend/jobs/runMonthly.mjs >> /var/log/akibaplus/monthly-obligations.log 2>&1
```

## Verification

### Check if Cron Job is Installed
```bash
crontab -l | grep monthly-obligations
```

### View Cron Logs
```bash
# View latest logs
tail -f /var/log/akibaplus/monthly-obligations.log

# View all logs
cat /var/log/akibaplus/monthly-obligations.log

# View last 50 lines
tail -50 /var/log/akibaplus/monthly-obligations.log
```

### Check System Cron Logs
```bash
# Ubuntu/Debian
grep CRON /var/log/syslog | tail -20

# Or check cron service
sudo systemctl status cron
```

## Manual Testing

Before relying on the cron job, test it manually:

### Test 1: Run the Job Script Directly
```bash
cd /home/samuel/apps/AkibaPlus/backend
node jobs/generateMonthlyObligations.mjs
```

Expected output:
```
=========================================
Monthly Contribution Obligations Generator
=========================================
📅 Run Date: 2026-02-08T...
📅 Target Month: 2026-02-01

Step 1: Marking overdue obligations...
✅ Marked 0 obligations as overdue

Step 2: Generating monthly obligations...

📊 Summary:
   - Chamas processed: 4
   - Obligations created: 12
   - Overdue marked: 0

✅ Job completed successfully in 0.25s
=========================================
```

### Test 2: Run via the Cron Runner
```bash
/home/samuel/apps/AkibaPlus/backend/jobs/runMonthly.mjs
```

### Test 3: Verify Database Updates
```bash
psql -U chama_app -h 127.0.0.1 -d chamaPlus -c "
SELECT 
    co.contribution_month,
    c.name as chama_name,
    COUNT(*) as total_obligations,
    SUM(co.expected_amount) as total_expected,
    SUM(co.paid_amount) as total_paid
FROM contribution_obligations co
JOIN chamas c ON c.id = co.chama_id
GROUP BY co.contribution_month, c.name
ORDER BY co.contribution_month DESC, c.name;
"
```

### Test 4: Check Job Tracking
```bash
psql -U chama_app -h 127.0.0.1 -d chamaPlus -c "
SELECT 
    job_name,
    last_run,
    last_status,
    last_message,
    run_count
FROM system_jobs
WHERE job_name = 'generate_monthly_obligations';
"
```

## Monitoring

### Check Last Run Status
```bash
# Quick status check
psql -U chama_app -h 127.0.0.1 -d chamaPlus -c "
SELECT 
    job_name,
    last_run,
    last_status,
    run_count,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_run))/3600 as hours_since_run
FROM system_jobs
WHERE job_name = 'generate_monthly_obligations';
"
```

### Email Notifications (Optional)

Install mail utilities:
```bash
sudo apt install mailutils
```

Modify cron entry to send email on failure:
```cron
0 0 1 * * /usr/bin/node /home/samuel/apps/AkibaPlus/backend/jobs/runMonthly.mjs >> /var/log/akibaplus/monthly-obligations.log 2>&1 || echo "Monthly obligations job failed" | mail -s "AkibaPlus Job Failure" admin@example.com
```

## Troubleshooting

### Job Not Running

1. **Check cron service is running:**
   ```bash
   sudo systemctl status cron
   sudo systemctl start cron  # if not running
   ```

2. **Check cron permissions:**
   ```bash
   ls -la /etc/cron.deny
   ls -la /etc/cron.allow
   ```

3. **Check user crontab:**
   ```bash
   crontab -l
   ```

4. **Test script manually:**
   ```bash
   /bin/bash -c '/usr/bin/node /home/samuel/apps/AkibaPlus/backend/jobs/runMonthly.mjs'
   ```

### Job Fails with "Permission Denied"

```bash
# Make scripts executable
chmod +x /home/samuel/apps/AkibaPlus/backend/jobs/*.mjs

# Check file ownership
ls -la /home/samuel/apps/AkibaPlus/backend/jobs/
```

### Job Fails with "Module Not Found"

Ensure `.env` file exists and contains database credentials:
```bash
cat /home/samuel/apps/AkibaPlus/backend/.env | grep DB_
```

### Database Connection Fails

```bash
# Test database connection
psql -U chama_app -h 127.0.0.1 -d chamaPlus -c "SELECT NOW();"

# Check if backend is running
curl http://127.0.0.1:3001/api/test-db
```

### No Obligations Created

Check if:
1. Chamas are active: `SELECT * FROM chamas WHERE is_active = true;`
2. Members are active: `SELECT * FROM chama_members WHERE is_active = true;`
3. Contribution rules exist: `SELECT * FROM contribution_rules WHERE effective_to IS NULL;`

## Log Rotation

Prevent log files from growing too large:

```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/akibaplus
```

Add:
```
/var/log/akibaplus/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
}
```

## Production Checklist

- [ ] Database migration completed successfully
- [ ] Test run completed successfully
- [ ] Cron job installed
- [ ] Log directory created with proper permissions
- [ ] Verified job appears in crontab
- [ ] Monitoring script tested
- [ ] Log rotation configured
- [ ] Email notifications configured (optional)
- [ ] Documentation updated with actual paths

## Support

If issues persist:
1. Check `/var/log/akibaplus/monthly-obligations.log`
2. Check system_jobs table for error messages
3. Run job manually with verbose logging
4. Verify database permissions

---

**Last Updated:** February 8, 2026  
**Version:** 1.0
