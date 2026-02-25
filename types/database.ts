export type UserRole = 'student' | 'parent' | 'admin';

export type ProgressStatus =
  | 'excellent'
  | 'good'
  | 'needs_improvement'
  | 'struggling';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
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
  parent_id: string | null;
  full_name: string;
  date_of_birth: string | null;
  enrollment_date: string;
  instrument: string;
  initial_grade: string | null;
  completed_grades: CompletedGrade[];
  streak: number;
  points: number;
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
  notes: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentWithProgress extends Student {
  progress?: ProgressRecord;
}
