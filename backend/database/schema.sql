-- ===================================================
-- CHAMA PLUS DATABASE SCHEMA
-- PostgreSQL Database Schema for Chama Management System
-- ===================================================

-- Drop existing tables if they exist (in correct order to handle foreign keys)
DROP TABLE IF EXISTS loan_payments CASCADE;
DROP TABLE IF EXISTS loans CASCADE;
DROP TABLE IF EXISTS contributions CASCADE;
DROP TABLE IF EXISTS fines CASCADE;
DROP TABLE IF EXISTS welfare_requests CASCADE;
DROP TABLE IF EXISTS welfare_contributions CASCADE;
DROP TABLE IF EXISTS meeting_attendance CASCADE;
DROP TABLE IF EXISTS meetings CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS member_roles CASCADE;
DROP TABLE IF EXISTS chama_members CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS chamas CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ===================================================
-- CORE TABLES
-- ===================================================

-- Users table (for authentication)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chamas table (Groups)
CREATE TABLE chamas (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    registration_number VARCHAR(100) UNIQUE,
    registration_date DATE,
    meeting_frequency VARCHAR(50), -- 'weekly', 'biweekly', 'monthly'
    contribution_amount DECIMAL(15, 2) DEFAULT 0,
    contribution_frequency VARCHAR(50), -- 'weekly', 'monthly', etc.
    loan_interest_rate DECIMAL(5, 2) DEFAULT 0, -- percentage
    maximum_loan_amount DECIMAL(15, 2),
    welfare_contribution DECIMAL(15, 2) DEFAULT 0,
    fine_late_contribution DECIMAL(15, 2) DEFAULT 0,
    fine_missed_meeting DECIMAL(15, 2) DEFAULT 0,
    total_funds DECIMAL(15, 2) DEFAULT 0,
    total_loans DECIMAL(15, 2) DEFAULT 0,
    total_welfare DECIMAL(15, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Members table
CREATE TABLE members (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) NOT NULL,
    id_number VARCHAR(50) UNIQUE,
    date_of_birth DATE,
    gender VARCHAR(20),
    address TEXT,
    role VARCHAR(50) DEFAULT 'member', -- 'chairman', 'secretary', 'treasurer', 'member'
    
    -- Next of Kin Information
    next_of_kin_name VARCHAR(255),
    next_of_kin_phone VARCHAR(20),
    next_of_kin_email VARCHAR(255),
    next_of_kin_relationship VARCHAR(100),
    next_of_kin_id_number VARCHAR(50),
    
    profile_picture_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chama Members (Many-to-Many relationship)
CREATE TABLE chama_members (
    id SERIAL PRIMARY KEY,
    chama_id INTEGER NOT NULL REFERENCES chamas(id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    join_date DATE DEFAULT CURRENT_DATE,
    member_number VARCHAR(50),
    share_amount DECIMAL(15, 2) DEFAULT 0,
    total_contributions DECIMAL(15, 2) DEFAULT 0,
    total_loans DECIMAL(15, 2) DEFAULT 0,
    total_welfare DECIMAL(15, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    exit_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chama_id, member_id)
);

-- Member Roles in Chama
CREATE TABLE member_roles (
    id SERIAL PRIMARY KEY,
    chama_member_id INTEGER NOT NULL REFERENCES chama_members(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- 'chairman', 'vice-chairman', 'secretary', 'treasurer', 'member'
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================================================
-- FINANCIAL TABLES
-- ===================================================

-- Contributions table
CREATE TABLE contributions (
    id SERIAL PRIMARY KEY,
    chama_id INTEGER NOT NULL REFERENCES chamas(id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    contribution_type VARCHAR(50) DEFAULT 'regular', -- 'regular', 'share', 'special'
    contribution_date DATE DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50), -- 'cash', 'mpesa', 'bank_transfer'
    reference_number VARCHAR(100),
    receipt_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'completed', -- 'pending', 'completed', 'cancelled'
    notes TEXT,
    recorded_by INTEGER REFERENCES members(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loans table
CREATE TABLE loans (
    id SERIAL PRIMARY KEY,
    chama_id INTEGER NOT NULL REFERENCES chamas(id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    loan_number VARCHAR(100) UNIQUE,
    principal_amount DECIMAL(15, 2) NOT NULL,
    interest_rate DECIMAL(5, 2) NOT NULL,
    total_amount DECIMAL(15, 2) NOT NULL, -- principal + interest
    amount_paid DECIMAL(15, 2) DEFAULT 0,
    balance DECIMAL(15, 2) NOT NULL,
    loan_purpose TEXT,
    loan_type VARCHAR(50), -- 'emergency', 'development', 'school_fees', etc.
    application_date DATE DEFAULT CURRENT_DATE,
    approval_date DATE,
    disbursement_date DATE,
    due_date DATE NOT NULL,
    repayment_period INTEGER, -- in months
    monthly_repayment DECIMAL(15, 2),
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'disbursed', 'repaying', 'completed', 'defaulted'
    
    -- Guarantors
    guarantor1_id INTEGER REFERENCES members(id),
    guarantor2_id INTEGER REFERENCES members(id),
    
    approved_by INTEGER REFERENCES members(id),
    disbursed_by INTEGER REFERENCES members(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loan Payments table
CREATE TABLE loan_payments (
    id SERIAL PRIMARY KEY,
    loan_id INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    payment_date DATE DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50), -- 'cash', 'mpesa', 'bank_transfer'
    reference_number VARCHAR(100),
    receipt_number VARCHAR(100),
    principal_paid DECIMAL(15, 2) DEFAULT 0,
    interest_paid DECIMAL(15, 2) DEFAULT 0,
    penalty_paid DECIMAL(15, 2) DEFAULT 0,
    notes TEXT,
    recorded_by INTEGER REFERENCES members(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fines table
CREATE TABLE fines (
    id SERIAL PRIMARY KEY,
    chama_id INTEGER NOT NULL REFERENCES chamas(id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    fine_type VARCHAR(100) NOT NULL, -- 'late_contribution', 'missed_meeting', 'indiscipline', 'late_loan_payment'
    amount DECIMAL(15, 2) NOT NULL,
    reason TEXT,
    fine_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    amount_paid DECIMAL(15, 2) DEFAULT 0,
    balance DECIMAL(15, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'waived'
    payment_date DATE,
    payment_method VARCHAR(50),
    reference_number VARCHAR(100),
    issued_by INTEGER REFERENCES members(id),
    waived_by INTEGER REFERENCES members(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Welfare Contributions table
CREATE TABLE welfare_contributions (
    id SERIAL PRIMARY KEY,
    chama_id INTEGER NOT NULL REFERENCES chamas(id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    contribution_date DATE DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50),
    reference_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'completed',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Welfare Requests/Disbursements table
CREATE TABLE welfare_requests (
    id SERIAL PRIMARY KEY,
    chama_id INTEGER NOT NULL REFERENCES chamas(id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    request_type VARCHAR(100) NOT NULL, -- 'medical', 'bereavement', 'emergency', 'education'
    amount_requested DECIMAL(15, 2) NOT NULL,
    amount_approved DECIMAL(15, 2),
    reason TEXT NOT NULL,
    supporting_documents TEXT, -- JSON or file paths
    request_date DATE DEFAULT CURRENT_DATE,
    approval_date DATE,
    disbursement_date DATE,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'disbursed', 'rejected'
    approved_by INTEGER REFERENCES members(id),
    disbursed_by INTEGER REFERENCES members(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================================================
-- MEETINGS & ATTENDANCE
-- ===================================================

-- Meetings table
CREATE TABLE meetings (
    id SERIAL PRIMARY KEY,
    chama_id INTEGER NOT NULL REFERENCES chamas(id) ON DELETE CASCADE,
    meeting_number VARCHAR(50),
    meeting_date DATE NOT NULL,
    meeting_time TIME,
    location TEXT,
    agenda TEXT,
    minutes TEXT,
    total_collections DECIMAL(15, 2) DEFAULT 0,
    attendance_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled'
    chaired_by INTEGER REFERENCES members(id),
    secretary INTEGER REFERENCES members(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Meeting Attendance table
CREATE TABLE meeting_attendance (
    id SERIAL PRIMARY KEY,
    meeting_id INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'present', -- 'present', 'absent', 'late', 'excused'
    arrival_time TIME,
    contribution_paid DECIMAL(15, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(meeting_id, member_id)
);

-- ===================================================
-- GENERAL TRANSACTIONS
-- ===================================================

-- Transactions table (General ledger)
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    chama_id INTEGER NOT NULL REFERENCES chamas(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL, -- 'contribution', 'loan_disbursement', 'loan_repayment', 'fine', 'welfare', 'expense', 'investment'
    reference_type VARCHAR(50), -- 'contribution', 'loan', 'fine', etc.
    reference_id INTEGER, -- ID of the related record
    amount DECIMAL(15, 2) NOT NULL,
    transaction_date DATE DEFAULT CURRENT_DATE,
    description TEXT,
    category VARCHAR(100),
    payment_method VARCHAR(50),
    reference_number VARCHAR(100),
    debit_credit VARCHAR(10) NOT NULL, -- 'debit' or 'credit'
    balance_after DECIMAL(15, 2),
    member_id INTEGER REFERENCES members(id),
    recorded_by INTEGER REFERENCES members(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================================================
-- INDEXES FOR PERFORMANCE
-- ===================================================

CREATE INDEX idx_members_email ON members(email);
CREATE INDEX idx_members_phone ON members(phone);
CREATE INDEX idx_members_id_number ON members(id_number);
CREATE INDEX idx_chama_members_chama ON chama_members(chama_id);
CREATE INDEX idx_chama_members_member ON chama_members(member_id);
CREATE INDEX idx_contributions_chama ON contributions(chama_id);
CREATE INDEX idx_contributions_member ON contributions(member_id);
CREATE INDEX idx_contributions_date ON contributions(contribution_date);
CREATE INDEX idx_loans_chama ON loans(chama_id);
CREATE INDEX idx_loans_member ON loans(member_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loan_payments_loan ON loan_payments(loan_id);
CREATE INDEX idx_fines_member ON fines(member_id);
CREATE INDEX idx_fines_status ON fines(status);
CREATE INDEX idx_meetings_chama ON meetings(chama_id);
CREATE INDEX idx_meetings_date ON meetings(meeting_date);
CREATE INDEX idx_transactions_chama ON transactions(chama_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);

-- ===================================================
-- TRIGGERS FOR AUTO-UPDATE timestamps
-- ===================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chamas_updated_at BEFORE UPDATE ON chamas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chama_members_updated_at BEFORE UPDATE ON chama_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contributions_updated_at BEFORE UPDATE ON contributions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON loans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fines_updated_at BEFORE UPDATE ON fines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_welfare_requests_updated_at BEFORE UPDATE ON welfare_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON meetings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================================
-- SAMPLE DATA (Optional - for testing)
-- ===================================================

-- Insert a default chama
INSERT INTO chamas (name, description, contribution_amount, contribution_frequency, loan_interest_rate, welfare_contribution, fine_late_contribution, fine_missed_meeting)
VALUES ('Demo Chama', 'Default chama for testing', 1000.00, 'monthly', 5.00, 200.00, 100.00, 50.00);

-- Insert sample members (update this based on your needs)
-- INSERT INTO members (name, email, phone, id_number, role)
-- VALUES 
--     ('John Doe', 'john@example.com', '+254700000001', '12345678', 'chairman'),
--     ('Jane Smith', 'jane@example.com', '+254700000002', '12345679', 'treasurer'),
--     ('Bob Johnson', 'bob@example.com', '+254700000003', '12345680', 'member');

COMMENT ON TABLE chamas IS 'Chama groups/organizations';
COMMENT ON TABLE members IS 'Individual members who can belong to multiple chamas';
COMMENT ON TABLE chama_members IS 'Junction table linking members to chamas';
COMMENT ON TABLE contributions IS 'Member contributions to their chama';
COMMENT ON TABLE loans IS 'Loans issued to members';
COMMENT ON TABLE loan_payments IS 'Repayments made against loans';
COMMENT ON TABLE fines IS 'Fines/penalties issued to members';
COMMENT ON TABLE welfare_contributions IS 'Contributions to welfare fund';
COMMENT ON TABLE welfare_requests IS 'Welfare fund disbursement requests';
COMMENT ON TABLE meetings IS 'Chama meeting records';
COMMENT ON TABLE meeting_attendance IS 'Member attendance at meetings';
COMMENT ON TABLE transactions IS 'General ledger for all financial transactions';
