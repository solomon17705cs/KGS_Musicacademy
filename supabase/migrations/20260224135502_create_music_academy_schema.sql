/*
  # Music Academy Database Schema

  ## Overview
  This migration creates the core database structure for a music academy management system
  with student progress tracking and role-based access control.

  ## New Tables

  ### `profiles`
  Extends auth.users with role information and user metadata
  - `id` (uuid, primary key) - References auth.users
  - `email` (text) - User email
  - `full_name` (text) - User's full name
  - `role` (text) - User role: 'student', 'parent', or 'admin'
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `students`
  Stores student information and links to parent/student accounts
  - `id` (uuid, primary key) - Unique student identifier
  - `user_id` (uuid) - References profiles (for students who have accounts)
  - `parent_id` (uuid) - References profiles (for parent accounts)
  - `full_name` (text) - Student's full name
  - `date_of_birth` (date) - Student's birth date
  - `enrollment_date` (date) - When student enrolled
  - `instrument` (text) - Primary instrument being learned
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `progress_records`
  Tracks student progress in theory and practical areas
  - `id` (uuid, primary key) - Unique record identifier
  - `student_id` (uuid) - References students
  - `theory_grade` (text) - Current theory grade level
  - `practical_grade` (text) - Current practical grade level
  - `theory_status` (text) - Progress status: 'excellent', 'good', 'needs_improvement', 'struggling'
  - `practical_status` (text) - Progress status: 'excellent', 'good', 'needs_improvement', 'struggling'
  - `notes` (text) - Additional notes from instructors
  - `updated_by` (uuid) - Admin who made the update
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  - Enable RLS on all tables
  - Students/parents can view their own data
  - Only admins can update progress records
  - Users can view their own profiles
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('student', 'parent', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  parent_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  date_of_birth date,
  enrollment_date date DEFAULT CURRENT_DATE,
  instrument text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create progress_records table
CREATE TABLE IF NOT EXISTS progress_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  theory_grade text NOT NULL DEFAULT '',
  practical_grade text NOT NULL DEFAULT '',
  theory_status text NOT NULL DEFAULT 'good' CHECK (theory_status IN ('excellent', 'good', 'needs_improvement', 'struggling')),
  practical_status text NOT NULL DEFAULT 'good' CHECK (practical_status IN ('excellent', 'good', 'needs_improvement', 'struggling')),
  attendance text DEFAULT '2/2',
  homework_completion integer DEFAULT 100,
  practice_score integer DEFAULT 0,
  weekly_goal text DEFAULT '',
  goal_status text DEFAULT 'in_progress' CHECK (goal_status IN ('achieved', 'in_progress')),
  mastery_level integer DEFAULT 0,
  notes text DEFAULT '',
  updated_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles table
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for students table
CREATE POLICY "Students can view own record"
  ON students FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    parent_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Admins can insert students"
  ON students FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Admins can update students"
  ON students FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Admins can delete students"
  ON students FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- RLS Policies for progress_records table
CREATE POLICY "Students and parents can view progress"
  ON progress_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students 
      WHERE students.id = progress_records.student_id 
      AND (students.user_id = auth.uid() OR students.parent_id = auth.uid())
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Admins can insert progress records"
  ON progress_records FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Admins can update progress records"
  ON progress_records FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Admins can delete progress records"
  ON progress_records FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_parent_id ON students(parent_id);
CREATE INDEX IF NOT EXISTS idx_progress_student_id ON progress_records(student_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to automatically update updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_progress_records_updated_at
  BEFORE UPDATE ON progress_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();