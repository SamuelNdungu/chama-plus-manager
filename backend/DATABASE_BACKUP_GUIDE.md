# Database Backup & Restore Guide

## Overview

This guide covers the automated backup system for the AkibaPlus PostgreSQL database, including:
- Automated daily backups
- Backup retention policy (30 days)
- Manual backup and restore procedures
- Disaster recovery steps

## Directory Structure

```
/home/samuel/backups/chamaplus/
├── chamaplus_backup_20260208_020000.sql.gz
├── chamaplus_backup_20260207_020000.sql.gz
├── chamaplus_backup_20260206_020000.sql.gz
└── backup.log
```

## Initial Setup

### 1. Create Backup Directory

```bash
sudo mkdir -p /home/samuel/backups/chamaplus
sudo chown samuel:samuel /home/samuel/backups/chamaplus
chmod 755 /home/samuel/backups/chamaplus
```

### 2. Make Scripts Executable

```bash
cd /home/samuel/apps/AkibaPlus/backend/scripts
chmod +x backup-database.sh
chmod +x restore-database.sh
```

### 3. Test Manual Backup

```bash
# Run a test backup
./backup-database.sh

# Check if backup was created
ls -lh /home/samuel/backups/chamaplus/
```

### 4. Configure PostgreSQL Authentication

Ensure the `chama_app` user can authenticate without password prompt for automation.

**Option A: Using .pgpass file (Recommended)**

```bash
# Create .pgpass file
echo "127.0.0.1:5432:chamaPlus:chama_app:YOUR_PASSWORD" > ~/.pgpass
chmod 600 ~/.pgpass
```

Replace `YOUR_PASSWORD` with the actual database password from `/backend/.env`

**Option B: Using peer authentication**

Edit `/etc/postgresql/*/main/pg_hba.conf`:
```
local   chamaPlus       chama_app                               peer
```

Then:
```bash
sudo systemctl reload postgresql
```

## Automated Backups

### Setup Cron Job

1. **Open crontab for editing:**
   ```bash
   crontab -e
   ```

2. **Add the following line for daily backups at 2:00 AM:**
   ```cron
   0 2 * * * /home/samuel/apps/AkibaPlus/backend/scripts/backup-database.sh >> /home/samuel/backups/chamaplus/cron.log 2>&1
   ```

3. **Alternative schedules:**

   ```cron
   # Every 6 hours
   0 */6 * * * /home/samuel/apps/AkibaPlus/backend/scripts/backup-database.sh >> /home/samuel/backups/chamaplus/cron.log 2>&1
   
   # Every day at 1:00 AM and 1:00 PM
   0 1,13 * * * /home/samuel/apps/AkibaPlus/backend/scripts/backup-database.sh >> /home/samuel/backups/chamaplus/cron.log 2>&1
   
   # Every Sunday at 3:00 AM
   0 3 * * 0 /home/samuel/apps/AkibaPlus/backend/scripts/backup-database.sh >> /home/samuel/backups/chamaplus/cron.log 2>&1
   ```

4. **Verify cron job is active:**
   ```bash
   crontab -l
   ```

### Monitor Backup Logs

```bash
# View backup log
tail -f /home/samuel/backups/chamaplus/backup.log

# View cron execution log
tail -f /home/samuel/backups/chamaplus/cron.log

# Check last 10 backups
ls -lht /home/samuel/backups/chamaplus/*.sql.gz | head -10
```

## Manual Operations

### Create Manual Backup

```bash
cd /home/samuel/apps/AkibaPlus/backend/scripts
./backup-database.sh
```

### Restore from Backup

**Restore from most recent backup:**
```bash
cd /home/samuel/apps/AkibaPlus/backend/scripts
./restore-database.sh
```

**Restore from specific backup:**
```bash
./restore-database.sh /home/samuel/backups/chamaplus/chamaplus_backup_20260208_140000.sql.gz
```

**List available backups:**
```bash
ls -lht /home/samuel/backups/chamaplus/*.sql.gz
```

### Create On-Demand Backup Before Major Changes

```bash
# Create a backup with custom name
pg_dump -U chama_app -h 127.0.0.1 chamaPlus > /home/samuel/backups/chamaplus/before_upgrade_$(date +%Y%m%d).sql
gzip /home/samuel/backups/chamaplus/before_upgrade_*.sql
```

## Backup Configuration

### Adjust Retention Period

Edit `backup-database.sh`:
```bash
RETENTION_DAYS=30  # Change this value (default: 30 days)
```

Options:
- **7 days** - For weekly retention
- **30 days** - For monthly retention (default)
- **90 days** - For quarterly retention
- **365 days** - For yearly retention

### Change Backup Location

Edit both `backup-database.sh` and `restore-database.sh`:
```bash
BACKUP_DIR="/home/samuel/backups/chamaplus"  # Change this path
```

## Offsite Backup (Recommended)

For production systems, implement offsite backup replication:

### Option 1: AWS S3 Sync
```bash
# Install AWS CLI
sudo apt install awscli

# Configure AWS credentials
aws configure

# Add to cron after local backup
0 3 * * * aws s3 sync /home/samuel/backups/chamaplus/ s3://your-bucket/chamaplus-backups/
```

### Option 2: rsync to Remote Server
```bash
# Add SSH key for passwordless access
ssh-keygen -t ed25519

# Add to cron after local backup
30 2 * * * rsync -avz /home/samuel/backups/chamaplus/ backup-server:/backups/chamaplus/
```

### Option 3: Google Drive (rclone)
```bash
# Install rclone
sudo apt install rclone

# Configure Google Drive
rclone config

# Add to cron
0 4 * * * rclone sync /home/samuel/backups/chamaplus/ gdrive:AkibaPlusBackups/
```

## Disaster Recovery Procedures

### Complete System Failure

1. **Install fresh Ubuntu server**
2. **Install PostgreSQL:**
   ```bash
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   ```

3. **Create database user:**
   ```bash
   sudo -u postgres createuser -P chama_app
   ```

4. **Create database:**
   ```bash
   sudo -u postgres createdb -O chama_app chamaPlus
   ```

5. **Transfer backup file to new server:**
   ```bash
   scp backup-server:/backups/chamaplus/latest.sql.gz /tmp/
   ```

6. **Restore database:**
   ```bash
   gunzip -c /tmp/latest.sql.gz | psql -U chama_app -h 127.0.0.1 chamaPlus
   ```

7. **Deploy application code and restart services**

### Data Corruption

1. **Stop application:**
   ```bash
   sudo systemctl stop chamaplus-backend
   ```

2. **Identify last good backup:**
   ```bash
   ls -lht /home/samuel/backups/chamaplus/*.sql.gz
   ```

3. **Restore from backup:**
   ```bash
   ./restore-database.sh /path/to/good-backup.sql.gz
   ```

4. **Verify data integrity:**
   ```bash
   psql -U chama_app -h 127.0.0.1 chamaPlus -c "SELECT COUNT(*) FROM users;"
   psql -U chama_app -h 127.0.0.1 chamaPlus -c "SELECT COUNT(*) FROM chamas;"
   ```

5. **Restart application:**
   ```bash
   sudo systemctl start chamaplus-backend
   ```

## Backup Size Estimates

Typical backup sizes based on data volume:

| Records | Uncompressed | Compressed (.gz) |
|---------|--------------|------------------|
| 10 users, 5 chamas | ~500 KB | ~50 KB |
| 100 users, 50 chamas | ~5 MB | ~500 KB |
| 1,000 users, 500 chamas | ~50 MB | ~5 MB |
| 10,000 users, 5,000 chamas | ~500 MB | ~50 MB |

Storage requirements for 30-day retention:
- Small: ~1.5 MB (30 × 50 KB)
- Medium: ~15 MB (30 × 500 KB)
- Large: ~150 MB (30 × 5 MB)
- Enterprise: ~1.5 GB (30 × 50 MB)

## Testing Backup Integrity

### Verify Backup File

```bash
# Check if backup is valid SQL
gunzip -c backup.sql.gz | head -100

# Verify compression integrity
gunzip -t backup.sql.gz
```

### Test Restore in Separate Database

```bash
# Create test database
psql -U chama_app -h 127.0.0.1 -d postgres -c "CREATE DATABASE chamaplus_test;"

# Restore to test database
gunzip -c backup.sql.gz | psql -U chama_app -h 127.0.0.1 chamaplus_test

# Verify data
psql -U chama_app -h 127.0.0.1 chamaplus_test -c "\dt"

# Cleanup
psql -U chama_app -h 127.0.0.1 -d postgres -c "DROP DATABASE chamaplus_test;"
```

## Monitoring & Alerts

### Check Backup Success

```bash
# Check if backup ran today
find /home/samuel/backups/chamaplus -name "*.sql.gz" -mtime 0

# Check backup log for errors
grep -i error /home/samuel/backups/chamaplus/backup.log
```

### Email Notifications (Optional)

Install mail utility:
```bash
sudo apt install mailutils
```

Add to backup script:
```bash
# At the end of backup-database.sh
if [ $? -eq 0 ]; then
    echo "Backup completed successfully" | mail -s "AkibaPlus Backup Success" admin@example.com
else
    echo "Backup failed! Check logs." | mail -s "AkibaPlus Backup FAILURE" admin@example.com
fi
```

## Security Best Practices

1. **Encrypt backups** for sensitive data:
   ```bash
   gpg --symmetric --cipher-algo AES256 backup.sql.gz
   ```

2. **Restrict backup directory permissions:**
   ```bash
   chmod 700 /home/samuel/backups/chamaplus
   ```

3. **Use separate user for backups:**
   ```bash
   sudo useradd -r -s /bin/bash backupuser
   sudo chown -R backupuser:backupuser /home/samuel/backups/
   ```

4. **Audit backup access:**
   ```bash
   sudo ausearch -f /home/samuel/backups/chamaplus
   ```

## Troubleshooting

### Backup fails with "permission denied"

```bash
# Check PostgreSQL permissions
psql -U chama_app -h 127.0.0.1 chamaPlus -c "\l"

# Check file permissions
ls -la /home/samuel/backups/chamaplus
```

### Restore fails with "database in use"

```bash
# Stop backend
sudo systemctl stop chamaplus-backend

# Kill all connections
psql -U postgres -h 127.0.0.1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='chamaPlus';"

# Try restore again
./restore-database.sh
```

### Cron job not running

```bash
# Check cron service
sudo systemctl status cron

# Check cron logs
grep CRON /var/log/syslog

# Test script manually
/home/samuel/apps/AkibaPlus/backend/scripts/backup-database.sh
```

### Backup file too large

Consider:
1. Implementing incremental backups
2. Excluding large tables if not critical
3. Cleaning up old data periodically

## Summary

✅ **Daily automated backups** at 2:00 AM  
✅ **30-day retention** policy  
✅ **Compressed storage** (gzip)  
✅ **Easy restoration** process  
✅ **Monitoring** via logs  

Backups are critical for data protection. Always test your restore procedures regularly!

---

**Last Updated:** February 8, 2026  
**Version:** 1.0
