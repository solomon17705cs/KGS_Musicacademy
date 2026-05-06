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
    const docRef = doc(db, PROFILES_COLLECTION, userId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as Profile;
  },

  async createProfile(userId: string, data: Omit<Profile, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
    await setDoc(doc(db, PROFILES_COLLECTION, userId), {
      ...data,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  },

  async updateProfile(userId: string, data: Partial<Profile>): Promise<void> {
    await updateDoc(doc(db, PROFILES_COLLECTION, userId), {
      ...data,
      updated_at: serverTimestamp(),
    });
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
    const snapshot = await getDocs(collection(db, PROFILES_COLLECTION));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Profile));
  },
};

export const studentService = {
  async getStudent(studentId: string): Promise<Student | null> {
    const docRef = doc(db, STUDENTS_COLLECTION, studentId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as Student;
  },

  async getAllStudents(): Promise<Student[]> {
    const snapshot = await getDocs(collection(db, STUDENTS_COLLECTION));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
  },

  async getStudentsByParentEmail(parentEmail: string): Promise<Student[]> {
    const normalizedEmail = parentEmail.toLowerCase().trim();
    const q = query(collection(db, STUDENTS_COLLECTION), where('parent_email', '==', normalizedEmail));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
  },

  async getStudentByUserId(userId: string): Promise<Student | null> {
    const q = query(collection(db, STUDENTS_COLLECTION), where('user_id', '==', userId), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Student;
  },

  async createStudent(data: Omit<Student, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const docRef = await addDoc(collection(db, STUDENTS_COLLECTION), {
      ...data,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    return docRef.id;
  },

  async updateStudent(studentId: string, data: Partial<Student>): Promise<void> {
    await updateDoc(doc(db, STUDENTS_COLLECTION, studentId), {
      ...data,
      updated_at: serverTimestamp(),
    });
  },

  async deleteStudent(studentId: string): Promise<void> {
    await deleteDoc(doc(db, STUDENTS_COLLECTION, studentId));
  },

  async getLeaderboard(field: 'streak' | 'points'): Promise<Student[]> {
    const q = query(collection(db, STUDENTS_COLLECTION), orderBy(field, 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
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
    const q = query(
      collection(db, PROGRESS_COLLECTION),
      where('student_id', '==', studentId)
    );
    const snapshot = await getDocs(q);
    const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProgressRecord));
    return records.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
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
    return docRef.id;
  },

  async updateProgressRecord(recordId: string, data: Partial<ProgressRecord>): Promise<void> {
    await updateDoc(doc(db, PROGRESS_COLLECTION, recordId), {
      ...data,
      updated_at: serverTimestamp(),
    });
  },

  async deleteProgressRecord(recordId: string): Promise<void> {
    await deleteDoc(doc(db, PROGRESS_COLLECTION, recordId));
  },

  subscribeToProgress(studentId: string, callback: (records: ProgressRecord[]) => void) {
    const q = query(
      collection(db, PROGRESS_COLLECTION),
      where('student_id', '==', studentId)
    );
    return onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProgressRecord));
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
    return docRef.id;
  },

  async getUserNotifications(userId: string): Promise<Notification[]> {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      orderBy('sent_at', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
  },

  async markAsRead(notificationId: string): Promise<void> {
    await updateDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId), { read: true });
  },

  async getNotificationById(notificationId: string): Promise<Notification | null> {
    const docRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Notification;
    }
    return null;
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
  async saveToken(userId: string, token: string): Promise<void> {
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
        platform: 'mobile',
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
  },

  async clearAttendance(studentId: string, date: string): Promise<void> {
    const docId = `${studentId}_${date}`;
    await deleteDoc(doc(db, ATTENDANCE_COLLECTION, docId));
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
    const q = query(collection(db, ATTENDANCE_COLLECTION));
    const snapshot = await getDocs(q);
    const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
    return all.filter(r => r.date >= startDate && r.date <= endDate);
  },

  async getAttendanceSummary(studentId: string, enrollmentDate?: string): Promise<{ total: number; present: number; absent: number; late: number; excused: number; percentage: number }> {
    const allRecords = await this.getAllAttendanceForStudent(studentId);
    const total = allRecords.length;
    if (total === 0) return { total: 0, present: 0, absent: 0, late: 0, excused: 0, percentage: 0 };

    const present = allRecords.filter(r => r.status === 'present').length;
    const late = allRecords.filter(r => r.status === 'late').length;
    const absent = allRecords.filter(r => r.status === 'absent').length;
    const excused = allRecords.filter(r => r.status === 'excused').length;

    let expectedClasses = total;
    if (enrollmentDate) {
      const enrollment = parseDate(enrollmentDate);
      const now = new Date();
      const monthsDiff = (now.getFullYear() - enrollment.getFullYear()) * 12 + (now.getMonth() - enrollment.getMonth()) + 1;
      expectedClasses = Math.max(monthsDiff * 8, total);
    }

    const percentage = Math.round(((present + late) / expectedClasses) * 100);

    return { total, present, absent, late, excused, percentage };
  },

  async getAllAttendanceForStudent(studentId: string): Promise<AttendanceRecord[]> {
    const q = query(
      collection(db, ATTENDANCE_COLLECTION),
      where('student_id', '==', studentId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
  },
};

const FEE_PAYMENTS_COLLECTION = 'fee_payments';

export const feePaymentService = {
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
  },

  async getStudentPayments(studentId: string): Promise<FeePayment[]> {
    const q = query(collection(db, FEE_PAYMENTS_COLLECTION), where('student_id', '==', studentId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeePayment));
  },

  async getMonthPayments(month: number, year: number): Promise<FeePayment[]> {
    const q = query(collection(db, FEE_PAYMENTS_COLLECTION));
    const snapshot = await getDocs(q);
    const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeePayment));
    return all.filter(p => p.month === month && p.year === year);
  },
};
