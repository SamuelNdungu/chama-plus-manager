-- ===================================================
-- ASSETS MANAGEMENT SCHEMA
-- PostgreSQL Schema for Asset Tracking & Net Worth Calculation
-- ===================================================

-- Assets table
CREATE TABLE IF NOT EXISTS assets (
    id SERIAL PRIMARY KEY,
    chama_id INTEGER NOT NULL REFERENCES chamas(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    asset_type VARCHAR(50) NOT NULL, -- 'land', 'vehicle', 'building', 'equipment', 'shares', 'business', 'other'
    description TEXT,
    
    -- Purchase information
    purchase_date DATE NOT NULL,
    purchase_value NUMERIC(15, 2) NOT NULL,
    current_value NUMERIC(15, 2) NOT NULL,
    
    -- Asset details
    location VARCHAR(255),
    serial_number VARCHAR(100),
    registration_number VARCHAR(100),
    
    -- Land-specific fields
    title_deed_number VARCHAR(100),
    land_size NUMERIC(10, 2), -- in acres or hectares
    land_unit VARCHAR(20), -- 'acres', 'hectares', 'sqm'
    
    -- Vehicle-specific fields
    make VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    
    -- Status
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'sold', 'damaged', 'deprecated'
    
    -- Documentation
    document_urls TEXT[], -- Array of document URLs
    notes TEXT,
    
    -- Ownership
    acquired_by INTEGER REFERENCES members(id),
    sold_date DATE,
    sold_value NUMERIC(15, 2),
    sold_to VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Asset Valuations table (for tracking value changes over time)
CREATE TABLE IF NOT EXISTS asset_valuations (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    valuation_date DATE NOT NULL,
    valuation_amount NUMERIC(15, 2) NOT NULL,
    valuation_method VARCHAR(100), -- 'market_assessment', 'professional_appraisal', 'depreciation', 'other'
    valuer_name VARCHAR(255),
    valuer_organization VARCHAR(255),
    notes TEXT,
    conducted_by INTEGER REFERENCES members(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Asset Maintenance table (for tracking maintenance history)
CREATE TABLE IF NOT EXISTS asset_maintenance (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    maintenance_date DATE NOT NULL,
    maintenance_type VARCHAR(100), -- 'repair', 'service', 'inspection', 'upgrade'
    description TEXT NOT NULL,
    cost NUMERIC(15, 2) DEFAULT 0,
    performed_by VARCHAR(255),
    next_maintenance_date DATE,
    notes TEXT,
    recorded_by INTEGER REFERENCES members(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assets_chama ON assets(chama_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_asset_valuations_asset ON asset_valuations(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_valuations_date ON asset_valuations(valuation_date);
CREATE INDEX IF NOT EXISTS idx_asset_maintenance_asset ON asset_maintenance(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_maintenance_date ON asset_maintenance(maintenance_date);

-- Trigger for auto-updating timestamps
CREATE OR REPLACE FUNCTION update_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_assets_timestamp
BEFORE UPDATE ON assets
FOR EACH ROW
EXECUTE FUNCTION update_assets_updated_at();

-- Trigger to update asset current_value when new valuation is added
CREATE OR REPLACE FUNCTION update_asset_current_value()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE assets 
    SET current_value = NEW.valuation_amount,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.asset_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_asset_value_on_valuation
AFTER INSERT ON asset_valuations
FOR EACH ROW
EXECUTE FUNCTION update_asset_current_value();

-- Comments for documentation
COMMENT ON TABLE assets IS 'Stores all chama assets including land, vehicles, equipment, etc.';
COMMENT ON TABLE asset_valuations IS 'Tracks asset value changes over time for depreciation/appreciation analysis';
COMMENT ON TABLE asset_maintenance IS 'Records maintenance history and schedules for assets';
COMMENT ON COLUMN assets.asset_type IS 'Type: land, vehicle, building, equipment, shares, business, other';
COMMENT ON COLUMN assets.status IS 'Status: active, sold, damaged, deprecated';
COMMENT ON COLUMN asset_valuations.valuation_method IS 'Method: market_assessment, professional_appraisal, depreciation, other';
