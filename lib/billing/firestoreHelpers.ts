import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Bill, BillAuditLog, FeeType, BillingPaymentMode, FeeItem } from '@/types/billing';
import { getFYLabel } from '@/lib/billing/amountInWords';

const BILLS_COLLECTION = 'bills';
const AUDIT_COLLECTION = 'bill_audit_logs';

async function generateBillNumber(month: number, year: number): Promise<string> {
  const fyLabel = getFYLabel(month, year);

  try {
    const q = query(
      collection(db, BILLS_COLLECTION),
      where('bill_fy', '==', fyLabel)
    );
    const snap = await getDocs(q);
    const nextNum = snap.size + 1;

    return `KGS-${fyLabel}-${String(nextNum).padStart(4, '0')}`;
  } catch (e) {
    console.warn('generateBillNumber fallback:', e);
    return `KGS-${fyLabel}-0001`;
  }
}

export const billService = {
  async createBill(data: {
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
    paid_date: string;
  }): Promise<string> {
    const bill_number = await generateBillNumber(data.month, data.year);

    const docRef = await addDoc(collection(db, BILLS_COLLECTION), {
      ...data,
      bill_number,
      bill_fy: getFYLabel(data.month, data.year),
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    return docRef.id;
  },

  async getBill(billId: string): Promise<Bill | null> {
    const snap = await getDoc(doc(db, BILLS_COLLECTION, billId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Bill;
  },

  async getAllBills(): Promise<Bill[]> {
    const q = query(
      collection(db, BILLS_COLLECTION),
      orderBy('created_at', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Bill));
  },

  async getBillsByStudent(studentId: string): Promise<Bill[]> {
    const q = query(
      collection(db, BILLS_COLLECTION),
      where('student_id', '==', studentId),
      orderBy('created_at', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Bill));
  },

  async checkDuplicateBill(
    studentId: string,
    amount: number,
    feeType: FeeType,
    month: number,
    year: number
  ): Promise<Bill | null> {
    const q = query(
      collection(db, BILLS_COLLECTION),
      where('student_id', '==', studentId),
      where('amount', '==', amount),
      where('fee_type', '==', feeType),
      where('month', '==', month),
      where('year', '==', year)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as Bill;
  },

  async getBillsByMonth(month: number, year: number): Promise<Bill[]> {
    const q = query(
      collection(db, BILLS_COLLECTION),
      where('month', '==', month),
      where('year', '==', year),
      orderBy('created_at', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Bill));
  },

  subscribeToAllBills(callback: (bills: Bill[]) => void) {
    const q = query(
      collection(db, BILLS_COLLECTION),
      orderBy('created_at', 'desc')
    );
    return onSnapshot(q, snap => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Bill)));
    });
  },

  subscribeToMonthBills(
    month: number,
    year: number,
    callback: (bills: Bill[]) => void
  ) {
    const q = query(
      collection(db, BILLS_COLLECTION),
      where('month', '==', month),
      where('year', '==', year),
      orderBy('created_at', 'desc')
    );
    return onSnapshot(q, snap => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Bill)));
    });
  },
};

export const auditLogService = {
  async log(data: {
    bill_id: string;
    bill_number: string;
    action: BillAuditLog['action'];
    performed_by_uid: string;
    performed_by_name: string;
    note?: string;
  }): Promise<void> {
    try {
      await addDoc(collection(db, AUDIT_COLLECTION), {
        ...data,
        note: data.note || '',
        performed_at: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Audit log failed:', e);
    }
  },

  async getLogsForBill(billId: string): Promise<BillAuditLog[]> {
    const q = query(
      collection(db, AUDIT_COLLECTION),
      where('bill_id', '==', billId),
      orderBy('performed_at', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as BillAuditLog));
  },
};
