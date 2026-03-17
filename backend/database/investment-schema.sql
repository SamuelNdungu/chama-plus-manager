-- =====================================================
-- PHASE A: INVESTMENT PORTFOLIO + GROWTH TRACKING
-- Financial Accounts & Account Movements Schema
-- =====================================================

-- Table: financial_accounts
-- Purpose: Track bank accounts, investment funds, and cash holdings
CREATE TABLE IF NOT EXISTS financial_accounts (
  id SERIAL PRIMARY KEY,
  chama_id INTEGER NOT NULL REFERENCES chamas(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('bank', 'investment', 'cash')),
  currency_code VARCHAR(3) DEFAULT 'KES',
  current_balance NUMERIC(14,2) DEFAULT 0.00,
  description TEXT,
  account_number VARCHAR(100),
  institution_name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(chama_id, name)
);

-- Table: account_movements
-- Purpose: Track all financial movements (deposits, withdrawals, interest, fees)
CREATE TABLE IF NOT EXISTS account_movements (
  id SERIAL PRIMARY KEY,
  chama_id INTEGER NOT NULL REFERENCES chamas(id) ON DELETE CASCADE,
  account_id INTEGER NOT NULL REFERENCES financial_accounts(id) ON DELETE CASCADE,
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('deposit', 'withdrawal', 'interest', 'fee', 'transfer')),
  amount NUMERIC(14,2) NOT NULL,
  description TEXT,
  movement_date DATE NOT NULL,
  reference_number VARCHAR(100),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_financial_accounts_chama ON financial_accounts(chama_id);
CREATE INDEX IF NOT EXISTS idx_financial_accounts_type ON financial_accounts(type);
CREATE INDEX IF NOT EXISTS idx_account_movements_account ON account_movements(account_id);
CREATE INDEX IF NOT EXISTS idx_account_movements_date ON account_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_account_movements_type ON account_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_account_movements_chama ON account_movements(chama_id);

-- Trigger: Update financial_accounts.updated_at
CREATE OR REPLACE FUNCTION update_financial_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_financial_accounts_updated_at
BEFORE UPDATE ON financial_accounts
FOR EACH ROW
EXECUTE FUNCTION update_financial_accounts_updated_at();

-- Trigger: Update account_movements.updated_at
CREATE OR REPLACE FUNCTION update_account_movements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_account_movements_updated_at
BEFORE UPDATE ON account_movements
FOR EACH ROW
EXECUTE FUNCTION update_account_movements_updated_at();

-- Trigger: Update financial_accounts.current_balance on movement
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update balance based on movement type
    IF NEW.movement_type IN ('deposit', 'interest') THEN
      UPDATE financial_accounts 
      SET current_balance = current_balance + NEW.amount
      WHERE id = NEW.account_id;
    ELSIF NEW.movement_type IN ('withdrawal', 'fee') THEN
      UPDATE financial_accounts 
      SET current_balance = current_balance - NEW.amount
      WHERE id = NEW.account_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_account_balance
AFTER INSERT ON account_movements
FOR EACH ROW
EXECUTE FUNCTION update_account_balance();

-- Comments for documentation
COMMENT ON TABLE financial_accounts IS 'Tracks chama bank accounts, investment funds (Money Market, etc), and cash holdings';
COMMENT ON TABLE account_movements IS 'Records all financial activities: deposits, withdrawals, interest gains, fees';
COMMENT ON COLUMN financial_accounts.type IS 'Account type: bank (current accounts), investment (MMF, bonds), cash';
COMMENT ON COLUMN account_movements.movement_type IS 'Type of transaction: deposit, withdrawal, interest (gains), fee (charges), transfer';
