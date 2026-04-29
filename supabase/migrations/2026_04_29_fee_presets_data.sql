-- =============================================================
-- STEP 1: Create fee_presets table + add category + has_size
-- Run this first if table not yet created
-- =============================================================

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

-- Add new columns (safe if already exists)
ALTER TABLE fee_presets ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Yuran Sekolah';
ALTER TABLE fee_presets ADD COLUMN IF NOT EXISTS has_size BOOLEAN NOT NULL DEFAULT false;

-- RLS
ALTER TABLE fee_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff can manage school presets" ON fee_presets;
CREATE POLICY "staff can manage school presets"
  ON fee_presets FOR ALL
  USING (school_id = (SELECT get_user_school_id()))
  WITH CHECK (school_id = (SELECT get_user_school_id()));

CREATE INDEX IF NOT EXISTS idx_fee_presets_school_year
  ON fee_presets (school_id, year_level, is_active);

-- =============================================================
-- STEP 2: Seed data — semua item dari invoice SRITI AL-FATTAH
-- School UUID: a1b2c3d4-0000-0000-0000-000000000001
-- Adjust amounts per year level as needed
-- =============================================================

-- Clear existing seed data (safe to re-run)
DELETE FROM fee_presets WHERE school_id = 'a1b2c3d4-0000-0000-0000-000000000001';

-- =============================================================
-- TAHUN 1
-- =============================================================
INSERT INTO fee_presets (school_id, year_level, category, description, default_amount, has_size, is_active) VALUES
-- Yuran Sekolah
('a1b2c3d4-0000-0000-0000-000000000001', 1, 'Yuran Sekolah', 'Pendaftaran',         150.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 1, 'Yuran Sekolah', 'Dana Pembangunan',    200.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 1, 'Yuran Sekolah', 'Kurikulum',           150.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 1, 'Yuran Sekolah', 'Ko-Kurikulum',        150.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 1, 'Yuran Sekolah', 'SRITI Pusat & Negeri',100.00, false, true),
-- Perbekalan Buku
('a1b2c3d4-0000-0000-0000-000000000001', 1, 'Perbekalan Buku', 'Buku Teks KSSR',               84.60, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 1, 'Perbekalan Buku', 'Buku Aktiviti KSSR',            59.50, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 1, 'Perbekalan Buku', 'Buku Teks Diniah (KAFA)',        50.50, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 1, 'Perbekalan Buku', 'Buku Aktiviti Diniah (KAFA)',    35.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 1, 'Perbekalan Buku', 'Buku Tulis',                    20.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 1, 'Perbekalan Buku', 'Buku Tahfiz Quran Sunnah',      10.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 1, 'Perbekalan Buku', 'Pentaksiran Bilik Darjah (PBD)', 50.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 1, 'Perbekalan Buku', 'Buku Rekod Prestasi',             4.50, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 1, 'Perbekalan Buku', 'Buku Rekod Kesihatan',            4.50, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 1, 'Perbekalan Buku', 'Fail Peribadi Murid',             4.50, false, true),
-- Uniform
('a1b2c3d4-0000-0000-0000-000000000001', 1, 'Uniform', 'Uniform Rasmi',      65.00, true,  true),
('a1b2c3d4-0000-0000-0000-000000000001', 1, 'Uniform', 'Uniform Sukan',      35.00, true,  true),
('a1b2c3d4-0000-0000-0000-000000000001', 1, 'Uniform', 'Tudung Krim',        22.00, true,  false),
('a1b2c3d4-0000-0000-0000-000000000001', 1, 'Uniform', 'Jubah Lelaki',       40.00, true,  false),
('a1b2c3d4-0000-0000-0000-000000000001', 1, 'Uniform', 'Jubah Perempuan',    45.00, true,  false),
('a1b2c3d4-0000-0000-0000-000000000001', 1, 'Uniform', 'Kopiah',             20.00, true,  false),
('a1b2c3d4-0000-0000-0000-000000000001', 1, 'Uniform', 'Tanda Nama',          6.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 1, 'Uniform', 'Lencana',             2.00, false, true),
-- Pelbagai
('a1b2c3d4-0000-0000-0000-000000000001', 1, 'Pelbagai', 'Yuran Bulan Januari', 390.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 1, 'Pelbagai', 'Yuran JIBG',           50.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 1, 'Pelbagai', 'Yuran Hari Kecemerlangan', 50.00, false, false);

-- =============================================================
-- TAHUN 2
-- =============================================================
INSERT INTO fee_presets (school_id, year_level, category, description, default_amount, has_size, is_active) VALUES
('a1b2c3d4-0000-0000-0000-000000000001', 2, 'Yuran Sekolah', 'Pendaftaran',          150.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 2, 'Yuran Sekolah', 'Dana Pembangunan',     200.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 2, 'Yuran Sekolah', 'Kurikulum',            150.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 2, 'Yuran Sekolah', 'Ko-Kurikulum',         150.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 2, 'Yuran Sekolah', 'SRITI Pusat & Negeri', 100.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 2, 'Perbekalan Buku', 'Buku Teks KSSR',                84.60, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 2, 'Perbekalan Buku', 'Buku Aktiviti KSSR',             59.50, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 2, 'Perbekalan Buku', 'Buku Teks Diniah (KAFA)',         50.50, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 2, 'Perbekalan Buku', 'Buku Aktiviti Diniah (KAFA)',     35.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 2, 'Perbekalan Buku', 'Buku Tulis',                     20.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 2, 'Perbekalan Buku', 'Buku Tahfiz Quran Sunnah',       10.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 2, 'Perbekalan Buku', 'Pentaksiran Bilik Darjah (PBD)',  50.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 2, 'Perbekalan Buku', 'Buku Rekod Prestasi',              4.50, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 2, 'Perbekalan Buku', 'Buku Rekod Kesihatan',             4.50, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 2, 'Uniform', 'Uniform Rasmi',   65.00, true,  true),
('a1b2c3d4-0000-0000-0000-000000000001', 2, 'Uniform', 'Uniform Sukan',   35.00, true,  true),
('a1b2c3d4-0000-0000-0000-000000000001', 2, 'Uniform', 'Tanda Nama',       6.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 2, 'Uniform', 'Lencana',          2.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 2, 'Pelbagai', 'Yuran Bulan Januari', 390.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 2, 'Pelbagai', 'Yuran JIBG',           50.00, false, true);

-- =============================================================
-- TAHUN 3
-- =============================================================
INSERT INTO fee_presets (school_id, year_level, category, description, default_amount, has_size, is_active) VALUES
('a1b2c3d4-0000-0000-0000-000000000001', 3, 'Yuran Sekolah', 'Pendaftaran',          150.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 3, 'Yuran Sekolah', 'Dana Pembangunan',     200.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 3, 'Yuran Sekolah', 'Kurikulum',            150.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 3, 'Yuran Sekolah', 'Ko-Kurikulum',         150.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 3, 'Yuran Sekolah', 'SRITI Pusat & Negeri', 100.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 3, 'Perbekalan Buku', 'Buku Teks KSSR',                84.60, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 3, 'Perbekalan Buku', 'Buku Aktiviti KSSR',             59.50, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 3, 'Perbekalan Buku', 'Buku Teks Diniah (KAFA)',         50.50, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 3, 'Perbekalan Buku', 'Buku Aktiviti Diniah (KAFA)',     35.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 3, 'Perbekalan Buku', 'Buku Tulis',                     20.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 3, 'Perbekalan Buku', 'Buku Tahfiz Quran Sunnah',       10.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 3, 'Perbekalan Buku', 'Pentaksiran Bilik Darjah (PBD)',  50.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 3, 'Perbekalan Buku', 'Buku Rekod Prestasi',              4.50, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 3, 'Perbekalan Buku', 'Buku Rekod Kesihatan',             4.50, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 3, 'Uniform', 'Uniform Rasmi',   65.00, true,  true),
('a1b2c3d4-0000-0000-0000-000000000001', 3, 'Uniform', 'Uniform Sukan',   35.00, true,  true),
('a1b2c3d4-0000-0000-0000-000000000001', 3, 'Uniform', 'Tanda Nama',       6.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 3, 'Uniform', 'Lencana',          2.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 3, 'Pelbagai', 'Yuran Bulan Januari', 390.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 3, 'Pelbagai', 'Yuran JIBG',           50.00, false, true);

-- =============================================================
-- TAHUN 4 (from invoice — most complete data)
-- =============================================================
INSERT INTO fee_presets (school_id, year_level, category, description, default_amount, has_size, is_active) VALUES
('a1b2c3d4-0000-0000-0000-000000000001', 4, 'Yuran Sekolah', 'Pendaftaran',          150.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 4, 'Yuran Sekolah', 'Dana Pembangunan',     200.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 4, 'Yuran Sekolah', 'Kurikulum',            150.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 4, 'Yuran Sekolah', 'Ko-Kurikulum',         150.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 4, 'Yuran Sekolah', 'SRITI Pusat & Negeri', 100.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 4, 'Perbekalan Buku', 'Buku Teks KSSR',                84.60, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 4, 'Perbekalan Buku', 'Buku Aktiviti KSSR',             59.50, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 4, 'Perbekalan Buku', 'Buku Teks Diniah (KAFA)',         50.50, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 4, 'Perbekalan Buku', 'Buku Aktiviti Diniah (KAFA)',     35.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 4, 'Perbekalan Buku', 'Buku Tulis',                     20.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 4, 'Perbekalan Buku', 'Buku Tahfiz Quran Sunnah',       10.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 4, 'Perbekalan Buku', 'Pentaksiran Bilik Darjah (PBD)',  50.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 4, 'Perbekalan Buku', 'Buku Rekod Prestasi',              4.50, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 4, 'Perbekalan Buku', 'Buku Rekod Kesihatan',             4.50, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 4, 'Uniform', 'Uniform Rasmi',   65.00, true,  true),
('a1b2c3d4-0000-0000-0000-000000000001', 4, 'Uniform', 'Uniform Sukan',   35.00, true,  true),
('a1b2c3d4-0000-0000-0000-000000000001', 4, 'Uniform', 'Tanda Nama',       6.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 4, 'Uniform', 'Lencana',          2.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 4, 'Pelbagai', 'Yuran Bulan Januari', 390.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 4, 'Pelbagai', 'Yuran JIBG',           50.00, false, true);

-- =============================================================
-- TAHUN 5 — tambah UPKK
-- =============================================================
INSERT INTO fee_presets (school_id, year_level, category, description, default_amount, has_size, is_active) VALUES
('a1b2c3d4-0000-0000-0000-000000000001', 5, 'Yuran Sekolah', 'Pendaftaran',          150.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 5, 'Yuran Sekolah', 'Dana Pembangunan',     200.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 5, 'Yuran Sekolah', 'Kurikulum',            150.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 5, 'Yuran Sekolah', 'Ko-Kurikulum',         150.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 5, 'Yuran Sekolah', 'SRITI Pusat & Negeri', 100.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 5, 'Yuran Sekolah', 'UPKK (Tahun 5)',       450.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 5, 'Perbekalan Buku', 'Buku Teks KSSR',                84.60, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 5, 'Perbekalan Buku', 'Buku Aktiviti KSSR',             59.50, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 5, 'Perbekalan Buku', 'Buku Teks Diniah (KAFA)',         50.50, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 5, 'Perbekalan Buku', 'Buku Aktiviti Diniah (KAFA)',     35.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 5, 'Perbekalan Buku', 'Buku Tulis',                     20.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 5, 'Perbekalan Buku', 'Buku Tahfiz Quran Sunnah',       10.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 5, 'Perbekalan Buku', 'Pentaksiran Bilik Darjah (PBD)',  50.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 5, 'Perbekalan Buku', 'Buku Rekod Prestasi',              4.50, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 5, 'Perbekalan Buku', 'Buku Rekod Kesihatan',             4.50, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 5, 'Uniform', 'Uniform Rasmi',   65.00, true,  true),
('a1b2c3d4-0000-0000-0000-000000000001', 5, 'Uniform', 'Uniform Sukan',   35.00, true,  true),
('a1b2c3d4-0000-0000-0000-000000000001', 5, 'Uniform', 'Tanda Nama',       6.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 5, 'Uniform', 'Lencana',          2.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 5, 'Pelbagai', 'Yuran Bulan Januari', 390.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 5, 'Pelbagai', 'Yuran JIBG',           50.00, false, true);

-- =============================================================
-- TAHUN 6 — tambah SIAPS, ganti UPKK
-- =============================================================
INSERT INTO fee_presets (school_id, year_level, category, description, default_amount, has_size, is_active) VALUES
('a1b2c3d4-0000-0000-0000-000000000001', 6, 'Yuran Sekolah', 'Pendaftaran',          150.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 6, 'Yuran Sekolah', 'Dana Pembangunan',     200.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 6, 'Yuran Sekolah', 'Kurikulum',            150.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 6, 'Yuran Sekolah', 'Ko-Kurikulum',         150.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 6, 'Yuran Sekolah', 'SRITI Pusat & Negeri', 100.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 6, 'Yuran Sekolah', 'SIAPS (Tahun 6)',       350.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 6, 'Perbekalan Buku', 'Buku Teks KSSR',                84.60, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 6, 'Perbekalan Buku', 'Buku Aktiviti KSSR',             59.50, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 6, 'Perbekalan Buku', 'Buku Teks Diniah (KAFA)',         50.50, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 6, 'Perbekalan Buku', 'Buku Aktiviti Diniah (KAFA)',     35.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 6, 'Perbekalan Buku', 'Buku Tulis',                     20.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 6, 'Perbekalan Buku', 'Buku Tahfiz Quran Sunnah',       10.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 6, 'Perbekalan Buku', 'Pentaksiran Bilik Darjah (PBD)',  50.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 6, 'Perbekalan Buku', 'Buku Rekod Prestasi',              4.50, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 6, 'Perbekalan Buku', 'Buku Rekod Kesihatan',             4.50, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 6, 'Uniform', 'Uniform Rasmi',   65.00, true,  true),
('a1b2c3d4-0000-0000-0000-000000000001', 6, 'Uniform', 'Uniform Sukan',   35.00, true,  true),
('a1b2c3d4-0000-0000-0000-000000000001', 6, 'Uniform', 'Tanda Nama',       6.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 6, 'Uniform', 'Lencana',          2.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 6, 'Pelbagai', 'Yuran Bulan Januari', 390.00, false, true),
('a1b2c3d4-0000-0000-0000-000000000001', 6, 'Pelbagai', 'Yuran JIBG',           50.00, false, true);

-- =============================================================
-- Verify: count per year
-- =============================================================
SELECT year_level, category, COUNT(*) as items, SUM(default_amount) as total_rm
FROM fee_presets
WHERE school_id = 'a1b2c3d4-0000-0000-0000-000000000001' AND is_active = true
GROUP BY year_level, category
ORDER BY year_level, category;
