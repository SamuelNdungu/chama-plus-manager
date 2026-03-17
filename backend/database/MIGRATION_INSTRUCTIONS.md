# Contribution Obligations Setup Instructions

## Database Migration Required

The contribution obligations system requires new database tables. Due to permission requirements, please run the following command manually:

```bash
# Option 1: Run as postgres superuser (Recommended)
sudo -u postgres psql -d chamaPlus -f /home/samuel/apps/AkibaPlus/backend/database/migrations/001_add_contribution_obligations.sql

# Option 2: Grant permissions first, then run migration
sudo -u postgres psql -d chamaPlus -f /home/samuel/apps/AkibaPlus/backend/database/grant_permissions.sql
cd /home/samuel/apps/AkibaPlus/backend && node scripts/run-migration.mjs
```

## What the Migration Does

1. Creates `contribution_rules` table - stores monthly contribution amounts per chama
2. Creates `contribution_obligations` table - tracks monthly obligations for each member
3. Creates `system_jobs` table - tracks automated job execution
4. Initializes default contribution rules (KES 1100) for all active chamas

## Verification

After running the migration, verify tables were created:

```bash
psql -U chama_app -h 127.0.0.1 -d chamaPlus -c "\dt contribution*"
psql -U chama_app -h 127.0.0.1 -d chamaPlus -c "SELECT * FROM contribution_rules;"
```

You should see:
- contribution_rules table with entries for each active chama
- contribution_obligations table (empty initially)
- system_jobs table with job tracking

## Next Steps

After the migration completes:
1. The automated monthly job will generate obligations on the 1st of each month
2. API endpoints will be available at `/api/contributions/obligations` and `/api/contributions/arrears`
3. Frontend arrears board will be accessible at `/contributions/arrears`
4. Dashboard will show compliance widgets

## Manual Test Run

To manually generate obligations for testing:

```bash
cd /home/samuel/apps/AkibaPlus/backend
node jobs/runMonthly.mjs
```

This will create obligations for all active members for the current month.
