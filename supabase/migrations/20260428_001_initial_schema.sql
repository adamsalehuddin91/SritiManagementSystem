-- ============================================
-- SRITI SCHOOL MANAGEMENT SYSTEM
-- Initial Schema Migration
-- ============================================

-- Schools
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  address TEXT,
  phone TEXT,
  logo_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (linked to Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  guardian_id UUID, -- FK added after guardians table
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'staff', 'parent')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Classes
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  year_level INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subjects
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guardians
CREATE TABLE guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK guardian_id to users after guardians created
ALTER TABLE users ADD CONSTRAINT users_guardian_id_fkey
  FOREIGN KEY (guardian_id) REFERENCES guardians(id) ON DELETE SET NULL;

-- Students
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_no TEXT NOT NULL,
  full_name TEXT NOT NULL,
  year_level INT NOT NULL,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, student_no)
);

-- Student Guardians (many-to-many)
CREATE TABLE student_guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL CHECK (relationship IN ('ayah', 'ibu', 'penjaga')),
  is_primary BOOLEAN DEFAULT FALSE,
  UNIQUE(student_id, guardian_id)
);

-- Fee Types
CREATE TABLE fee_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('monthly', 'annual', 'one_time', 'item')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fee Rules (price history)
CREATE TABLE fee_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  fee_type_id UUID NOT NULL REFERENCES fee_types(id) ON DELETE CASCADE,
  year_level INT, -- NULL = applies to all year levels
  amount NUMERIC(10,2) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE, -- NULL = current active rule
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  invoice_no TEXT NOT NULL,
  invoice_month INT NOT NULL CHECK (invoice_month BETWEEN 1 AND 12),
  invoice_year INT NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'pending', 'paid', 'overdue')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, invoice_no)
);

-- Invoice Items
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  fee_type_id UUID REFERENCES fee_types(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity INT DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  price_snapshot NUMERIC(10,2) NOT NULL -- harga semasa invoice dijana
);

-- Invoice Discounts
CREATE TABLE invoice_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('ramadan', 'sibling', 'manual_adjustment')),
  amount NUMERIC(10,2) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('fpx', 'manual_transfer', 'qr', 'cash')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'rejected')),
  reference_no TEXT,
  gateway_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment Allocations (1 payment → many invoices)
CREATE TABLE payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment Proofs
CREATE TABLE payment_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  verification_note TEXT
);

-- Opening Balances (data migration)
CREATE TABLE opening_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount_due NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0,
  balance NUMERIC(10,2) GENERATED ALWAYS AS (amount_due - amount_paid) STORED,
  as_of_date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RPH (Phase 3 — structure ready)
CREATE TABLE rph (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  topic TEXT NOT NULL,
  objective TEXT,
  activity TEXT,
  reflection TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'revision')),
  reviewer_comment TEXT,
  content_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE opening_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE rph ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's school_id
CREATE OR REPLACE FUNCTION get_user_school_id()
RETURNS UUID AS $$
  SELECT school_id FROM users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper: get current user's guardian_id
CREATE OR REPLACE FUNCTION get_user_guardian_id()
RETURNS UUID AS $$
  SELECT guardian_id FROM users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- RLS: Admin + Staff = full access to their school
-- Parent = only their own invoices & payments

CREATE POLICY "school_isolation" ON students
  FOR ALL USING (school_id = get_user_school_id());

CREATE POLICY "school_isolation" ON guardians
  FOR ALL USING (school_id = get_user_school_id());

CREATE POLICY "school_isolation" ON classes
  FOR ALL USING (school_id = get_user_school_id());

CREATE POLICY "school_isolation" ON subjects
  FOR ALL USING (school_id = get_user_school_id());

CREATE POLICY "school_isolation" ON fee_types
  FOR ALL USING (school_id = get_user_school_id());

CREATE POLICY "school_isolation" ON fee_rules
  FOR ALL USING (school_id = get_user_school_id());

-- Invoices: parent only sees their own
CREATE POLICY "admin_staff_all_invoices" ON invoices
  FOR ALL USING (
    school_id = get_user_school_id() AND
    get_user_role() IN ('super_admin', 'staff')
  );

CREATE POLICY "parent_own_invoices" ON invoices
  FOR SELECT USING (
    school_id = get_user_school_id() AND
    guardian_id = get_user_guardian_id()
  );

-- Payments: parent only sees their own
CREATE POLICY "admin_staff_all_payments" ON payments
  FOR ALL USING (
    school_id = get_user_school_id() AND
    get_user_role() IN ('super_admin', 'staff')
  );

CREATE POLICY "parent_own_payments" ON payments
  FOR SELECT USING (
    school_id = get_user_school_id() AND
    guardian_id = get_user_guardian_id()
  );

CREATE POLICY "parent_insert_payments" ON payments
  FOR INSERT WITH CHECK (
    school_id = get_user_school_id() AND
    guardian_id = get_user_guardian_id()
  );

-- ============================================
-- SEED: SRITI School
-- ============================================

INSERT INTO schools (id, name, code, address, phone, status)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'SRITI',
  'SRITI-001',
  'Kuala Lumpur',
  NULL,
  'active'
);
