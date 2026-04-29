-- fee_presets: Item yuran lalai mengikut tahun pelajar
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS fee_presets (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  year_level      INT NOT NULL CHECK (year_level BETWEEN 1 AND 6),
  fee_type_id     UUID REFERENCES fee_types(id) ON DELETE SET NULL,
  description     TEXT NOT NULL,
  default_amount  DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE fee_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff can manage school presets"
  ON fee_presets
  FOR ALL
  USING (school_id = (SELECT get_user_school_id()))
  WITH CHECK (school_id = (SELECT get_user_school_id()));

-- Index for fast lookup by school + year
CREATE INDEX IF NOT EXISTS idx_fee_presets_school_year
  ON fee_presets (school_id, year_level, is_active);
