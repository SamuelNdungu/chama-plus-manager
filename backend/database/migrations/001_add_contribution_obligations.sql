-- ===================================================
-- MIGRATION: Add Contribution Obligations System
-- Date: 2026-02-08
-- Purpose: Add automated monthly contribution tracking
-- ===================================================

-- Drop tables if they exist (for clean re-runs)
DROP TABLE IF EXISTS contribution_obligations CASCADE;
DROP TABLE IF EXISTS contribution_rules CASCADE;
DROP TABLE IF EXISTS system_jobs CASCADE;

-- ===================================================
-- CONTRIBUTION RULES TABLE
-- Stores monthly contribution amount per chama
-- Supports versioning via effective_from/effective_to dates
-- ===================================================

CREATE TABLE contribution_rules (
    id SERIAL PRIMARY KEY,
    chama_id INTEGER NOT NULL REFERENCES chamas(id) ON DELETE CASCADE,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
    currency_code VARCHAR(3) DEFAULT 'KES',
    frequency VARCHAR(50) DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'annually')),
    effective_from DATE NOT NULL,
    effective_to DATE, -- NULL means currently active
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure effective_to is after effective_from
    CONSTRAINT valid_date_range CHECK (effective_to IS NULL OR effective_to > effective_from),
    
    -- Prevent overlapping active rules for same chama
    CONSTRAINT unique_active_rule UNIQUE NULLS NOT DISTINCT (chama_id, effective_to)
);

-- Indexes for performance
CREATE INDEX idx_contribution_rules_chama ON contribution_rules(chama_id);
CREATE INDEX idx_contribution_rules_effective ON contribution_rules(effective_from, effective_to);
CREATE INDEX idx_contribution_rules_active ON contribution_rules(chama_id, effective_to) WHERE effective_to IS NULL;

-- ===================================================
-- CONTRIBUTION OBLIGATIONS TABLE
-- Stores what each member is expected to pay each month
-- ===================================================

CREATE TABLE contribution_obligations (
    id SERIAL PRIMARY KEY,
    chama_id INTEGER NOT NULL REFERENCES chamas(id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    contribution_month DATE NOT NULL, -- Always 1st of the month (e.g., '2026-02-01')
    expected_amount NUMERIC(14, 2) NOT NULL CHECK (expected_amount >= 0),
    paid_amount NUMERIC(14, 2) DEFAULT 0 CHECK (paid_amount >= 0),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'waived')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Prevent duplicate monthly obligations
    CONSTRAINT unique_member_month_obligation UNIQUE (chama_id, member_id, contribution_month)
);

-- Indexes for performance
CREATE INDEX idx_obligations_chama ON contribution_obligations(chama_id);
CREATE INDEX idx_obligations_member ON contribution_obligations(member_id);
CREATE INDEX idx_obligations_month ON contribution_obligations(contribution_month);
CREATE INDEX idx_obligations_status ON contribution_obligations(status);
CREATE INDEX idx_obligations_chama_month ON contribution_obligations(chama_id, contribution_month);
CREATE INDEX idx_obligations_member_status ON contribution_obligations(member_id, status);

-- ===================================================
-- SYSTEM JOBS TABLE
-- Tracks scheduled job execution history
-- ===================================================

CREATE TABLE system_jobs (
    id SERIAL PRIMARY KEY,
    job_name VARCHAR(100) NOT NULL UNIQUE,
    last_run TIMESTAMP,
    last_status VARCHAR(20) CHECK (last_status IN ('success', 'failed', 'running')),
    last_message TEXT,
    run_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for quick status checks
CREATE INDEX idx_system_jobs_name ON system_jobs(job_name);

-- ===================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ===================================================

CREATE TRIGGER update_contribution_rules_updated_at 
    BEFORE UPDATE ON contribution_rules
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contribution_obligations_updated_at 
    BEFORE UPDATE ON contribution_obligations
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_jobs_updated_at 
    BEFORE UPDATE ON system_jobs
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ===================================================
-- INITIAL DATA
-- ===================================================

-- Initialize system jobs tracking
INSERT INTO system_jobs (job_name, last_status, last_message)
VALUES ('generate_monthly_obligations', NULL, 'Never run');

-- Create default contribution rules for existing chamas
-- Set amount to KES 1100 as specified
INSERT INTO contribution_rules (chama_id, amount, currency_code, frequency, effective_from)
SELECT 
    id,
    1100.00,
    'KES',
    'monthly',
    CURRENT_DATE
FROM chamas
WHERE is_active = true;

-- ===================================================
-- COMMENTS FOR DOCUMENTATION
-- ===================================================

COMMENT ON TABLE contribution_rules IS 'Versioned contribution rules per chama - supports future amount changes';
COMMENT ON TABLE contribution_obligations IS 'Monthly contribution obligations for each member - auto-generated on 1st of month';
COMMENT ON TABLE system_jobs IS 'Tracks scheduled job execution history and status';

COMMENT ON COLUMN contribution_rules.effective_to IS 'NULL = currently active rule';
COMMENT ON COLUMN contribution_obligations.contribution_month IS 'Always the 1st day of the month';
COMMENT ON COLUMN contribution_obligations.status IS 'pending=not paid, partial=partially paid, paid=fully paid, overdue=past due, waived=forgiven';

-- ===================================================
-- MIGRATION COMPLETE
-- ===================================================

-- Verify tables were created
SELECT 
    'Migration completed successfully' AS status,
    COUNT(*) AS rules_created
FROM contribution_rules;

SELECT 
    'Ready to generate obligations' AS status,
    COUNT(*) AS active_chamas
FROM chamas
WHERE is_active = true;
