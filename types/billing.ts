export type BillingPaymentMode = 'Cash' | 'UPI' | 'Net Banking' | 'Card';

export type FeeType =
  | 'Tuition Fee'
  | 'Exam Fee'
  | 'Registration Fee'
  | 'Other';

export interface FeeItem {
  fee_type: FeeType;
  amount: number;
  other_name?: string;
}

export interface Bill {
  id: string;
  bill_number: string;
  student_id: string;
  student_name: string;
  parent_name: string | null;
  parent_phone: string | null;
  instrument: string;
  grade_level: string | null;
  fee_type: FeeType;
  fee_items: FeeItem[];
  amount: number;
  payment_mode: BillingPaymentMode;
  payment_reference: string | null;
  month: number;
  months: number[];
  year: number;
  issued_by_uid: string;
  issued_by_name: string;
  notes: string;
  bill_fy: string;
  paid_date: string;
  created_at: string;
  updated_at: string;
}

export interface BillAuditLog {
  id: string;
  bill_id: string;
  bill_number: string;
  action: 'created' | 'viewed' | 'printed' | 'exported' | 'cancelled';
  performed_by_uid: string;
  performed_by_name: string;
  performed_at: string;
  note: string;
}
