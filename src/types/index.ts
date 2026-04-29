export type UserRole = 'super_admin' | 'staff' | 'parent'

export type InvoiceStatus = 'draft' | 'sent' | 'pending' | 'paid' | 'overdue'

export type PaymentMethod = 'fpx' | 'manual_transfer' | 'qr' | 'cash'

export type PaymentStatus = 'pending' | 'success' | 'failed' | 'rejected'

export type FeeType = 'monthly' | 'annual' | 'one_time' | 'item'

export type RPHStatus = 'draft' | 'submitted' | 'approved' | 'revision'

export type DiscountType = 'ramadan' | 'sibling' | 'manual_adjustment'

export interface User {
  id: string
  school_id: string
  guardian_id: string | null
  full_name: string
  email: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface School {
  id: string
  name: string
  code: string
  address: string | null
  phone: string | null
  logo_url: string | null
  status: 'active' | 'inactive'
  created_at: string
}

export interface Student {
  id: string
  school_id: string
  student_no: string
  full_name: string
  year_level: number
  class_id: string
  status: 'active' | 'inactive'
  created_at: string
}

export interface Guardian {
  id: string
  school_id: string
  full_name: string
  phone: string
  email: string | null
  created_at: string
}

export interface Invoice {
  id: string
  school_id: string
  student_id: string
  guardian_id: string
  invoice_no: string
  invoice_month: number
  invoice_year: number
  total_amount: number
  discount_amount: number
  status: InvoiceStatus
  created_at: string
}

export interface Payment {
  id: string
  school_id: string
  guardian_id: string
  amount: number
  payment_date: string
  method: PaymentMethod
  status: PaymentStatus
  reference_no: string | null
  gateway_reference: string | null
  created_at: string
}
