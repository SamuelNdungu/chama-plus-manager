-- Report Schedules Table
CREATE TABLE IF NOT EXISTS report_schedules (
  id SERIAL PRIMARY KEY,
  chama_id INTEGER NOT NULL REFERENCES chamas(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL,
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  recipient_emails JSONB NOT NULL,
  format VARCHAR(10) NOT NULL CHECK (format IN ('pdf', 'excel')),
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX idx_report_schedules_chama ON report_schedules(chama_id);
CREATE INDEX idx_report_schedules_next_run ON report_schedules(next_run_at) WHERE is_active = true;
CREATE INDEX idx_report_schedules_active ON report_schedules(is_active);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_report_schedules_updated_at
BEFORE UPDATE ON report_schedules
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Report Schedule History (optional - for auditing)
CREATE TABLE IF NOT EXISTS report_schedule_history (
  id SERIAL PRIMARY KEY,
  schedule_id INTEGER REFERENCES report_schedules(id) ON DELETE CASCADE,
  chama_id INTEGER NOT NULL,
  report_type VARCHAR(50) NOT NULL,
  recipient_emails JSONB NOT NULL,
  format VARCHAR(10) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed')),
  error_message TEXT,
  generated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_report_schedule_history_schedule ON report_schedule_history(schedule_id);
CREATE INDEX idx_report_schedule_history_chama ON report_schedule_history(chama_id);
CREATE INDEX idx_report_schedule_history_generated ON report_schedule_history(generated_at);

COMMENT ON TABLE report_schedules IS 'Stores scheduled report configurations';
COMMENT ON TABLE report_schedule_history IS 'Audit log of generated scheduled reports';
