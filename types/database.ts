export type UserRole = 'parent' | 'student' | 'admin' | 'staff';
export type Gender = 'male' | 'female';

export type ProgressStatus =
  | 'excellent'
  | 'good'
  | 'needs_improvement'
  | 'struggling';

export type FeeStatus = 'paid' | 'pending' | 'overdue';

export type PaymentMode = 'UPI' | 'cash' | 'bank_transfer';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | 'double_present';

export interface FeePayment {
  id: string;
  student_id: string;
  month: number;
  year: number;
  status: 'paid' | 'pending';
  paid_date: string | null;
  payment_mode: PaymentMode | null;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  date: string;
  status: AttendanceStatus;
  class_timing: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceSummary {
  student_id: string;
  total_classes: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  fcm_token?: string;
  notification_settings?: {
    push_enabled: boolean;
    email_enabled: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface CompletedGrade {
  grade: string;
  date: string;
  mark: string;
  type: 'theory' | 'practical';
}

export interface Student {
  id: string;
  user_id: string | null;
  father_name: string | null;
  father_phone: string | null;
  father_email: string | null;
  mother_name: string | null;
  mother_phone: string | null;
  mother_email: string | null;
  parent_address: string | null;
  full_name: string;
  gender: Gender | null;
  date_of_birth: string | null;
  enrollment_date: string;
  instrument: string;
  initial_grade: string | null;
  class_days: string[];
  class_timing: string | null;
  summer_class: boolean;
  completed_grades: CompletedGrade[];
  streak: number;
  points: number;
  fee_status: FeeStatus;
  created_at: string;
  updated_at: string;
}

export interface ProgressRecord {
  id: string;
  student_id: string;
  theory_grade: string;
  practical_grade: string;
  theory_status: ProgressStatus;
  practical_status: ProgressStatus;
  attendance: string;
  homework_completion: number;
  practice_score: number;
  weekly_goal: string;
  goal_status: 'achieved' | 'in_progress' | 'not_done';
  mastery_level: number;
  teacher_verified: boolean;
  teacher_practice_rating: number;
  verified_at: string | null;
  performance_score: number;
  performance_label: string;
  notes: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentWithProgress extends Student {
  progress?: ProgressRecord;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  sent_at: string;
  read: boolean;
}
