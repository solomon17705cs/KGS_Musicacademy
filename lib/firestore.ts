import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { Profile, Student, ProgressRecord, Notification, AttendanceRecord, FeePayment } from '@/types/database';
import { cacheService } from './cache';

const CACHE_TTL = {
  STUDENTS: 2 * 60 * 1000,
  STUDENT: 2 * 60 * 1000,
  ATTENDANCE: 30 * 1000,
  ATTENDANCE_ALL: 30 * 1000,
  PROGRESS: 60 * 1000,
  PROFILE: 5 * 60 * 1000,
  FEE_PAYMENTS: 60 * 1000,
  NOTIFICATIONS: 60 * 1000,
};

async function withCache<T>(cacheKey: string, fetcher: () => Promise<T>, ttl: number): Promise<T> {
  const cached = await cacheService.getFresh<T>(cacheKey, ttl);
  if (cached) return cached.data;
  const data = await fetcher();
  await cacheService.set(cacheKey, data);
  return data;
}

const PROFILES_COLLECTION = 'profiles';
const STUDENTS_COLLECTION = 'students';
const PROGRESS_COLLECTION = 'progress_records';
const NOTIFICATIONS_COLLECTION = 'notifications';

const timestampToString = (timestamp: Timestamp | undefined): string => {
  return timestamp ? timestamp.toDate().toISOString() : new Date().toISOString();
};

const parseDate = (dateStr: string): Date => {
  const parts = dateStr.split('-');
  return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
};

export const profileService = {
  async getProfile(userId: string): Promise<Profile | null> {
    return withCache(`profile_${userId}`, async () => {
      const docRef = doc(db, PROFILES_COLLECTION, userId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() } as Profile;
    }, CACHE_TTL.PROFILE);
  },

  async createProfile(userId: string, data: Omit<Profile, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
    await setDoc(doc(db, PROFILES_COLLECTION, userId), {
      ...data,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    await cacheService.clearByPrefix('profile_');
  },

  async updateProfile(userId: string, data: Partial<Profile>): Promise<void> {
    await updateDoc(doc(db, PROFILES_COLLECTION, userId), {
      ...data,
      updated_at: serverTimestamp(),
    });
    await cacheService.clearByPrefix('profile_');
  },

  subscribeToProfile(userId: string, callback: (profile: Profile | null) => void) {
    const docRef = doc(db, PROFILES_COLLECTION, userId);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...docSnap.data() } as Profile);
      } else {
        callback(null);
      }
    });
  },

  async getAllProfiles(): Promise<Profile[]> {
    return withCache('profiles_all', async () => {
      const snapshot = await getDocs(collection(db, PROFILES_COLLECTION));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Profile));
    }, CACHE_TTL.PROFILE);
  },

  async getProfileByEmail(email: string): Promise<Profile | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const q = query(collection(db, PROFILES_COLLECTION), where('email', '==', normalizedEmail), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Profile;
  },
};

export const studentService = {
  async getStudent(studentId: string): Promise<Student | null> {
    return withCache(`student_${studentId}`, async () => {
      const docRef = doc(db, STUDENTS_COLLECTION, studentId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() } as Student;
    }, CACHE_TTL.STUDENT);
  },

  async getAllStudents(): Promise<Student[]> {
    return withCache('students_all', async () => {
      const snapshot = await getDocs(collection(db, STUDENTS_COLLECTION));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
    }, CACHE_TTL.STUDENTS);
  },

  async getStudentsByParentEmail(parentEmail: string): Promise<Student[]> {
    const normalizedEmail = parentEmail.toLowerCase().trim();
    const [fathers, mothers] = await Promise.all([
      getDocs(query(collection(db, STUDENTS_COLLECTION), where('father_email', '==', normalizedEmail))),
      getDocs(query(collection(db, STUDENTS_COLLECTION), where('mother_email', '==', normalizedEmail))),
    ]);
    const seen = new Map();
    [...fathers.docs, ...mothers.docs].forEach(doc => {
      seen.set(doc.id, { id: doc.id, ...doc.data() });
    });
    return Array.from(seen.values()) as Student[];
  },

  async getStudentsByParentPhone(parentPhone: string): Promise<Student[]> {
    const cleanPhone = parentPhone.replace(/\s/g, '');
    const withCode = cleanPhone.startsWith('+') ? cleanPhone : '+91' + cleanPhone;
    const withoutCode = withCode.replace('+91', '');

    const [fathersWith, fathersWithout, mothersWith, mothersWithout] = await Promise.all([
      getDocs(query(collection(db, STUDENTS_COLLECTION), where('father_phone', '==', withCode))),
      getDocs(query(collection(db, STUDENTS_COLLECTION), where('father_phone', '==', withoutCode))),
      getDocs(query(collection(db, STUDENTS_COLLECTION), where('mother_phone', '==', withCode))),
      getDocs(query(collection(db, STUDENTS_COLLECTION), where('mother_phone', '==', withoutCode))),
    ]);

    const seen = new Map();
    [...fathersWith.docs, ...fathersWithout.docs, ...mothersWith.docs, ...mothersWithout.docs].forEach(doc => {
      seen.set(doc.id, { id: doc.id, ...doc.data() });
    });

    return Array.from(seen.values()) as Student[];
  },

  async getStudentByUserId(userId: string): Promise<Student | null> {
    const q = query(collection(db, STUDENTS_COLLECTION), where('user_id', '==', userId), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Student;
  },

  async getStudentsByName(name: string): Promise<Student[]> {
    const q = query(
      collection(db, STUDENTS_COLLECTION),
      where('full_name', '==', name)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
  },

  async createStudent(data: Omit<Student, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const docRef = await addDoc(collection(db, STUDENTS_COLLECTION), {
      ...data,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    await cacheService.clearByPrefix('students_');
    return docRef.id;
  },

  async updateStudent(studentId: string, data: Partial<Student>): Promise<void> {
    await updateDoc(doc(db, STUDENTS_COLLECTION, studentId), {
      ...data,
      updated_at: serverTimestamp(),
    });
    await cacheService.clearByPrefix('students_');
    await cacheService.clearByPrefix(`student_${studentId}`);
  },

  async deleteStudent(studentId: string): Promise<void> {
    await deleteDoc(doc(db, STUDENTS_COLLECTION, studentId));
    await cacheService.clearByPrefix('students_');
    await cacheService.clearByPrefix(`student_${studentId}`);
  },

  async getLeaderboard(field: 'streak' | 'points'): Promise<Student[]> {
    return withCache(`leaderboard_${field}`, async () => {
      const q = query(collection(db, STUDENTS_COLLECTION), orderBy(field, 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
    }, CACHE_TTL.STUDENTS);
  },

  subscribeToStudents(callback: (students: Student[]) => void) {
    const q = query(collection(db, STUDENTS_COLLECTION), orderBy('created_at', 'desc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
    });
  },
};

export const progressService = {
  async getProgressRecords(studentId: string): Promise<ProgressRecord[]> {
    return withCache(`progress_${studentId}`, async () => {
      const q = query(
        collection(db, PROGRESS_COLLECTION),
        where('student_id', '==', studentId)
      );
      const snapshot = await getDocs(q);
      const records = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          created_at: data.created_at?.toDate?.()?.toISOString() ?? data.created_at,
          updated_at: data.updated_at?.toDate?.()?.toISOString() ?? data.updated_at,
        } as ProgressRecord;
      });
      return records.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }, CACHE_TTL.PROGRESS);
  },

  async getLatestProgress(studentId: string): Promise<ProgressRecord | null> {
    const records = await this.getProgressRecords(studentId);
    return records.length > 0 ? records[0] : null;
  },

  async createProgressRecord(data: Omit<ProgressRecord, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const docRef = await addDoc(collection(db, PROGRESS_COLLECTION), {
      ...data,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    await cacheService.clearByPrefix('progress_');
    return docRef.id;
  },

  async updateProgressRecord(recordId: string, data: Partial<ProgressRecord>): Promise<void> {
    await updateDoc(doc(db, PROGRESS_COLLECTION, recordId), {
      ...data,
      updated_at: serverTimestamp(),
    });
    await cacheService.clearByPrefix('progress_');
  },

  async deleteProgressRecord(recordId: string): Promise<void> {
    await deleteDoc(doc(db, PROGRESS_COLLECTION, recordId));
    await cacheService.clearByPrefix('progress_');
  },

  subscribeToProgress(studentId: string, callback: (records: ProgressRecord[]) => void) {
    const q = query(
      collection(db, PROGRESS_COLLECTION),
      where('student_id', '==', studentId)
    );
    return onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          created_at: data.created_at?.toDate?.()?.toISOString() ?? data.created_at,
          updated_at: data.updated_at?.toDate?.()?.toISOString() ?? data.updated_at,
        } as ProgressRecord;
      });
      callback(records.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    });
  },
};

export const notificationService = {
  async createNotification(data: Omit<Notification, 'id' | 'sent_at'>): Promise<string> {
    const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
      ...data,
      sent_at: serverTimestamp(),
    });
    await cacheService.clearByPrefix('notifications_');
    return docRef.id;
  },

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return withCache(`notifications_${userId}`, async () => {
      const q = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('userId', '==', userId),
        orderBy('sent_at', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
    }, CACHE_TTL.NOTIFICATIONS);
  },

  async markAsRead(notificationId: string): Promise<void> {
    await updateDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId), { read: true });
    await cacheService.clearByPrefix('notifications_');
  },

  async getNotificationById(notificationId: string): Promise<Notification | null> {
    return withCache(`notification_${notificationId}`, async () => {
      const docRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Notification;
      }
      return null;
    }, CACHE_TTL.NOTIFICATIONS);
  },

  subscribeToNotifications(userId: string, callback: (notifications: Notification[]) => void) {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      orderBy('sent_at', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
    });
  },
};

const PUSH_TOKENS_COLLECTION = 'push_tokens';

export const pushTokenService = {
  async saveToken(userId: string, token: string, platform: string = 'mobile'): Promise<void> {
    const existingQuery = query(
      collection(db, PUSH_TOKENS_COLLECTION),
      where('userId', '==', userId),
      where('token', '==', token),
      limit(1)
    );
    const existing = await getDocs(existingQuery);
    
    if (existing.empty) {
      await addDoc(collection(db, PUSH_TOKENS_COLLECTION), {
        userId,
        token,
        createdAt: serverTimestamp(),
        platform,
      });
    }
  },

  async getTokensByUser(userId: string): Promise<string[]> {
    const q = query(
      collection(db, PUSH_TOKENS_COLLECTION),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data().token);
  },

  async getAllTokens(): Promise<string[]> {
    const snapshot = await getDocs(collection(db, PUSH_TOKENS_COLLECTION));
    return snapshot.docs.map(doc => doc.data().token);
  },

  async removeToken(token: string): Promise<void> {
    const q = query(
      collection(db, PUSH_TOKENS_COLLECTION),
      where('token', '==', token),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      await deleteDoc(snapshot.docs[0].ref);
    }
  },
};

const ATTENDANCE_COLLECTION = 'attendance_records';

export const attendanceService = {
  async markAttendance(studentId: string, date: string, status: 'present' | 'absent' | 'late' | 'excused', timing: string | null = null): Promise<void> {
    const docId = `${studentId}_${date}`;
    await setDoc(doc(db, ATTENDANCE_COLLECTION, docId), {
      id: docId,
      student_id: studentId,
      date,
      status,
      class_timing: timing,
      notes: '',
      updated_at: serverTimestamp(),
    }, { merge: true });
    await cacheService.clearByPrefix('attendance_');
  },

  async clearAttendance(studentId: string, date: string): Promise<void> {
    const docId = `${studentId}_${date}`;
    await deleteDoc(doc(db, ATTENDANCE_COLLECTION, docId));
    await cacheService.clearByPrefix('attendance_');
  },

  async getAttendanceRecord(studentId: string, date: string): Promise<AttendanceRecord | null> {
    const docId = `${studentId}_${date}`;
    const docSnap = await getDoc(doc(db, ATTENDANCE_COLLECTION, docId));
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as AttendanceRecord;
  },

  async getStudentAttendance(studentId: string, startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    const allRecords = await this.getAllAttendanceForStudent(studentId);
    return allRecords.filter(r => r.date >= startDate && r.date <= endDate);
  },

  async getWeekAttendance(startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    return withCache(`attendance_week_${startDate}_${endDate}`, async () => {
      const q = query(
        collection(db, ATTENDANCE_COLLECTION),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
    }, CACHE_TTL.ATTENDANCE);
  },

  async getAttendanceSummary(studentId: string, enrollmentDate?: string, summerClass: boolean = false): Promise<{ total: number; present: number; absent: number; late: number; excused: number; percentage: number }> {
    const allRecords = await this.getAllAttendanceForStudent(studentId);
    const total = allRecords.length;
    if (total === 0) return { total: 0, present: 0, absent: 0, late: 0, excused: 0, percentage: 0 };

    const present = allRecords.filter(r => r.status === 'present').length;
    const late = allRecords.filter(r => r.status === 'late').length;
    const absent = allRecords.filter(r => r.status === 'absent').length;
    const excused = allRecords.filter(r => r.status === 'excused').length;

    let expectedClasses = total;
    if (summerClass) {
      expectedClasses = Math.max(30, total);
    } else if (enrollmentDate) {
      const enrollment = parseDate(enrollmentDate);
      const now = new Date();
      const monthsDiff = (now.getFullYear() - enrollment.getFullYear()) * 12 + (now.getMonth() - enrollment.getMonth()) + 1;
      expectedClasses = Math.max(monthsDiff * 8, total);
    }

    const percentage = Math.round(((present + late) / expectedClasses) * 100);

    return { total, present, absent, late, excused, percentage };
  },

  subscribeToMonthAttendance(startDate: string, endDate: string, callback: (records: AttendanceRecord[]) => void) {
    const q = query(
      collection(db, ATTENDANCE_COLLECTION),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord)));
    });
  },

  async getAllAttendanceForStudent(studentId: string): Promise<AttendanceRecord[]> {
    return withCache(`attendance_all_${studentId}`, async () => {
      const q = query(
        collection(db, ATTENDANCE_COLLECTION),
        where('student_id', '==', studentId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
    }, CACHE_TTL.ATTENDANCE_ALL);
  },

  async getCurrentMonthAttendance(studentId: string, summerClass: boolean = false): Promise<string> {
    const records = await this.getAllAttendanceForStudent(studentId);

    if (summerClass) {
      const count = records.reduce((sum, r) => {
        if (r.status === 'present' || r.status === 'late') return sum + 1;
        if (r.status === 'double_present') return sum + 2;
        return sum;
      }, 0);
      return `${count}/30`;
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    const monthRecords = records.filter(r => r.date >= startDate && r.date <= endDate);
    const count = monthRecords.reduce((sum, r) => {
      if (r.status === 'present' || r.status === 'late') return sum + 1;
      if (r.status === 'double_present') return sum + 2;
      return sum;
    }, 0);

    return `${count}/8`;
  },

  async getMonthAttendanceForStudent(studentId: string, year: number, month: number): Promise<AttendanceRecord[]> {
    return withCache(`attendance_month_${studentId}_${year}_${month}`, async () => {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

      const q = query(
        collection(db, ATTENDANCE_COLLECTION),
        where('student_id', '==', studentId)
      );
      const snapshot = await getDocs(q);
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
      return records.filter(r => r.date >= startDate && r.date <= endDate);
    }, CACHE_TTL.ATTENDANCE_ALL);
  },
};

const FEE_PAYMENTS_COLLECTION = 'fee_payments';

export const feePaymentService = {
  subscribeToMonthPayments(month: number, year: number, callback: (payments: FeePayment[]) => void) {
    const q = query(
      collection(db, FEE_PAYMENTS_COLLECTION),
      where('month', '==', month),
      where('year', '==', year)
    );
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeePayment)));
    });
  },

  async setPayment(studentId: string, month: number, year: number, status: 'paid' | 'pending', paidDate: string | null, paymentMode: string | null, amount: number): Promise<void> {
    const docId = `${studentId}_${year}_${month}`;
    await setDoc(doc(db, FEE_PAYMENTS_COLLECTION, docId), {
      id: docId,
      student_id: studentId,
      month,
      year,
      status,
      paid_date: paidDate,
      payment_mode: paymentMode,
      amount,
      updated_at: serverTimestamp(),
    }, { merge: true });
    await cacheService.clearByPrefix('fee_payments_');
  },

  async getStudentPayments(studentId: string): Promise<FeePayment[]> {
    return withCache(`fee_payments_${studentId}`, async () => {
      const q = query(collection(db, FEE_PAYMENTS_COLLECTION), where('student_id', '==', studentId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeePayment));
    }, CACHE_TTL.FEE_PAYMENTS);
  },

  async getMonthPayments(month: number, year: number): Promise<FeePayment[]> {
    return withCache(`fee_payments_month_${month}_${year}`, async () => {
      const q = query(
        collection(db, FEE_PAYMENTS_COLLECTION),
        where('month', '==', month),
        where('year', '==', year)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeePayment));
    }, CACHE_TTL.FEE_PAYMENTS);
  },
};
