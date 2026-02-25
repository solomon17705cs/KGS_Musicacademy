/**
 * Local in-memory mock database for testing without Supabase.
 * Provides a Supabase-compatible API surface so the rest of the app
 * doesn't need any changes.
 */

import { Profile, Student, ProgressRecord } from '@/types/database';

// ─── Seed Data ──────────────────────────────────────────────

const SEED_PROFILES: Profile[] = [
  {
    id: 'admin-001',
    email: 'admin@kgs.com',
    full_name: 'Dr. Rajesh Kumar',
    role: 'admin',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'student-001',
    email: 'student@kgs.com',
    full_name: 'Arjun Mehta',
    role: 'student',
    created_at: '2025-03-15T00:00:00Z',
    updated_at: '2025-03-15T00:00:00Z',
  },
  {
    id: 'student-002',
    email: 'priya@kgs.com',
    full_name: 'Priya Sharma',
    role: 'student',
    created_at: '2025-06-01T00:00:00Z',
    updated_at: '2025-06-01T00:00:00Z',
  },
  {
    id: 'parent-001',
    email: 'parent@kgs.com',
    full_name: 'Sunita Mehta',
    role: 'parent',
    created_at: '2025-03-15T00:00:00Z',
    updated_at: '2025-03-15T00:00:00Z',
  },
];

const SEED_STUDENTS: Student[] = [
  {
    id: 'stu-001',
    user_id: 'student-001',
    parent_id: 'parent-001',
    full_name: 'Arjun Mehta',
    date_of_birth: '2010-05-12',
    enrollment_date: '2025-03-15',
    instrument: 'Piano',
    initial_grade: 'Grade 1',
    completed_grades: [
      { grade: 'Initial', date: '2025-06-15', mark: '90%' },
      { grade: 'Grade 1', date: '2025-12-20', mark: '85%' },
    ],
    streak: 15,
    points: 1250,
    created_at: '2025-03-15T00:00:00Z',
    updated_at: '2025-03-15T00:00:00Z',
  },
  {
    id: 'stu-002',
    user_id: 'student-002',
    parent_id: null,
    full_name: 'Priya Sharma',
    date_of_birth: '2009-08-22',
    enrollment_date: '2025-06-01',
    instrument: 'Violin',
    initial_grade: 'Beginner',
    completed_grades: [],
    streak: 8,
    points: 850,
    created_at: '2025-06-01T00:00:00Z',
    updated_at: '2025-06-01T00:00:00Z',
  },
  {
    id: 'stu-003',
    user_id: null,
    parent_id: 'parent-001',
    full_name: 'Ravi Mehta',
    date_of_birth: '2012-11-30',
    enrollment_date: '2025-09-01',
    instrument: 'Guitar',
    initial_grade: 'Beginner',
    completed_grades: [],
    streak: 12,
    points: 1100,
    created_at: '2025-09-01T00:00:00Z',
    updated_at: '2025-09-01T00:00:00Z',
  },
];

const SEED_PROGRESS: ProgressRecord[] = [
  {
    id: 'prog-001',
    student_id: 'stu-001',
    theory_grade: 'Grade 4',
    practical_grade: 'Grade 3',
    theory_status: 'excellent',
    practical_status: 'good',
    notes: 'Arjun has shown remarkable improvement in sight-reading. Scales are progressing well. Keep practising arpeggios daily.',
    updated_by: 'admin-001',
    created_at: '2026-01-10T00:00:00Z',
    updated_at: '2026-02-20T00:00:00Z',
  },
  {
    id: 'prog-002',
    student_id: 'stu-002',
    theory_grade: 'Grade 2',
    practical_grade: 'Grade 2',
    theory_status: 'good',
    practical_status: 'needs_improvement',
    notes: 'Priya understands theory concepts well. Bowing technique needs more focused practice — suggest extra 15 min daily.',
    updated_by: 'admin-001',
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-02-18T00:00:00Z',
  },
  {
    id: 'prog-003',
    student_id: 'stu-003',
    theory_grade: 'Beginner',
    practical_grade: 'Beginner',
    theory_status: 'good',
    practical_status: 'good',
    notes: 'Ravi is enthusiastic and picking up chords quickly for a new student. Great attitude in class.',
    updated_by: 'admin-001',
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-02-22T00:00:00Z',
  },
];

// ─── Test Credentials ───────────────────────────────────────

const TEST_CREDENTIALS: Record<string, { password: string; profileId: string }> = {
  'admin@kgs.com': { password: 'admin123', profileId: 'admin-001' },
  'student@kgs.com': { password: 'student123', profileId: 'student-001' },
  'priya@kgs.com': { password: 'student123', profileId: 'student-002' },
  'parent@kgs.com': { password: 'parent123', profileId: 'parent-001' },
};

// ─── In-Memory Store with Persistence ───────────────────────

const STORAGE_KEYS = {
  PROFILES: 'kgs_mock_profiles',
  STUDENTS: 'kgs_mock_students',
  PROGRESS: 'kgs_mock_progress',
};

function getStoredData<T>(key: string, defaultData: T[]): T[] {
  if (typeof window === 'undefined') return defaultData;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultData;
  } catch (e) {
    return defaultData;
  }
}

function persistData(key: string, data: any[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to persist mock data:', e);
  }
}

let profiles = getStoredData(STORAGE_KEYS.PROFILES, SEED_PROFILES);
let students = getStoredData(STORAGE_KEYS.STUDENTS, SEED_STUDENTS);
let progressRecords = getStoredData(STORAGE_KEYS.PROGRESS, SEED_PROGRESS);

let currentUserId: string | null = null;
let nextId = Math.max(100, students.length + profiles.length + progressRecords.length);

function generateId() {
  return `local-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

// ─── Query Builder (mimics Supabase chained API) ────────────

type TableName = 'profiles' | 'students' | 'progress_records';

function getTable(name: TableName): any[] {
  switch (name) {
    case 'profiles': return profiles;
    case 'students': return students;
    case 'progress_records': return progressRecords;
  }
}

interface QueryBuilder {
  select: (columns?: string) => QueryBuilder;
  eq: (column: string, value: any) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  limit: (count: number) => QueryBuilder;
  maybeSingle: () => Promise<{ data: any; error: any }>;
  insert: (record: any) => Promise<{ data: any; error: any }>;
  delete: () => Promise<{ data: any; error: any }>;
  then: (resolve: (value: { data: any; error: any }) => void) => void;
}

function createQueryBuilder(tableName: TableName): QueryBuilder {
  let selectColumns: string = '*';
  let filters: Array<{ column: string; value: any }> = [];
  let orderCol: string | null = null;
  let orderAsc = true;
  let limitCount: number | null = null;
  let isSingle = false;

  const builder: QueryBuilder = {
    select(columns = '*') {
      selectColumns = columns;
      return builder;
    },

    eq(column: string, value: any) {
      filters.push({ column, value });
      return builder;
    },

    order(column: string, options?: { ascending?: boolean }) {
      orderCol = column;
      orderAsc = options?.ascending ?? true;
      return builder;
    },

    limit(count: number) {
      limitCount = count;
      return builder;
    },

    async maybeSingle() {
      isSingle = true;
      const { data } = await execute();
      return { data: data?.[0] ?? null, error: null };
    },

    async insert(record: any) {
      try {
        const newRecord = {
          id: generateId(),
          ...record,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        switch (tableName) {
          case 'profiles':
            profiles.push(newRecord as Profile);
            persistData(STORAGE_KEYS.PROFILES, profiles);
            break;
          case 'students':
            students.push(newRecord as Student);
            persistData(STORAGE_KEYS.STUDENTS, students);
            break;
          case 'progress_records':
            progressRecords.push(newRecord as ProgressRecord);
            persistData(STORAGE_KEYS.PROGRESS, progressRecords);
            break;
        }

        return { data: newRecord, error: null };
      } catch (e: any) {
        return { data: null, error: { message: e.message } };
      }
    },

    async delete() {
      try {
        await new Promise((resolve) => setTimeout(resolve, 300));
        let dataToKeep: any[] = [];
        let deletedData: any[] = [];

        const currentTable = getTable(tableName);

        for (const row of currentTable) {
          let matches = true;
          for (const f of filters) {
            if (row[f.column] !== f.value) {
              matches = false;
              break;
            }
          }
          if (matches) {
            deletedData.push(row);
          } else {
            dataToKeep.push(row);
          }
        }

        switch (tableName) {
          case 'profiles':
            profiles = dataToKeep;
            persistData(STORAGE_KEYS.PROFILES, profiles);
            break;
          case 'students':
            students = dataToKeep;
            persistData(STORAGE_KEYS.STUDENTS, students);
            break;
          case 'progress_records':
            progressRecords = dataToKeep;
            persistData(STORAGE_KEYS.PROGRESS, progressRecords);
            break;
        }

        return { data: deletedData, error: null };
      } catch (e: any) {
        return { data: null, error: { message: e.message } };
      }
    },

    then(resolve) {
      execute().then(resolve);
    },
  };

  async function execute(): Promise<{ data: any; error: any }> {
    try {
      // Simulate network latency
      await new Promise((resolve) => setTimeout(resolve, 300));

      let data = [...getTable(tableName)];

      // Apply filters
      for (const f of filters) {
        data = data.filter((row: any) => row[f.column] === f.value);
      }

      // Apply ordering
      if (orderCol) {
        const col = orderCol;
        data.sort((a: any, b: any) => {
          if (a[col] < b[col]) return orderAsc ? -1 : 1;
          if (a[col] > b[col]) return orderAsc ? 1 : -1;
          return 0;
        });
      }

      // Apply limit
      if (limitCount !== null) {
        data = data.slice(0, limitCount);
      }

      // Handle relational select  e.g.  *, progress:progress_records(*)
      if (selectColumns.includes('progress:progress_records')) {
        data = data.map((student: any) => ({
          ...student,
          progress: progressRecords.filter(
            (pr) => pr.student_id === student.id
          ),
        }));
      }

      return { data, error: null };
    } catch (e: any) {
      return { data: null, error: { message: e.message } };
    }
  }

  return builder;
}

// ─── Auth State Listeners ───────────────────────────────────

type AuthCallback = (event: string, session: any) => void;
const authListeners: AuthCallback[] = [];

function buildSession(profileId: string) {
  const prof = profiles.find((p) => p.id === profileId);
  if (!prof) return null;
  return {
    user: { id: prof.id, email: prof.email },
    access_token: 'local-token-' + prof.id,
    refresh_token: 'local-refresh-' + prof.id,
  };
}

function notifyAuth(event: string) {
  // Use setTimeout to defer notification — this lets Expo Router's
  // root layout finish mounting before navigation is triggered.
  setTimeout(() => {
    const session = currentUserId ? buildSession(currentUserId) : null;
    for (const cb of authListeners) {
      cb(event, session);
    }
  }, 100);
}

// ─── Public Mock Client ─────────────────────────────────────

export const localSupabase = {
  auth: {
    async getSession() {
      // Small delay for realism
      await new Promise(resolve => setTimeout(resolve, 50));
      const session = currentUserId ? buildSession(currentUserId) : null;
      return { data: { session }, error: null };
    },

    onAuthStateChange(callback: AuthCallback) {
      authListeners.push(callback);
      return {
        data: {
          subscription: {
            unsubscribe() {
              const idx = authListeners.indexOf(callback);
              if (idx !== -1) authListeners.splice(idx, 1);
            },
          },
        },
      };
    },

    async signInWithPassword({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) {
      // Simulate network
      await new Promise(resolve => setTimeout(resolve, 500));

      const cred = TEST_CREDENTIALS[email];
      if (!cred || cred.password !== password) {
        return { data: null, error: { message: 'Invalid login credentials' } };
      }
      currentUserId = cred.profileId;
      notifyAuth('SIGNED_IN');
      return { data: { user: { id: cred.profileId, email } }, error: null };
    },

    async signUp({ email, password }: { email: string; password: string }) {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (TEST_CREDENTIALS[email]) {
        return {
          data: null,
          error: { message: 'User already registered' },
        };
      }
      const newId = generateId();
      TEST_CREDENTIALS[email] = { password, profileId: newId };

      // Automatically log in after sign up
      currentUserId = newId;
      notifyAuth('SIGNED_IN');

      return { data: { user: { id: newId, email } }, error: null };
    },

    async signOut() {
      currentUserId = null;
      notifyAuth('SIGNED_OUT');
    },
  },

  from(tableName: TableName) {
    return createQueryBuilder(tableName);
  },
};
