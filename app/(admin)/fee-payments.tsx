import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { studentService, feePaymentService, unpaidClassService } from '@/lib/firestore';
import { Student, FeePayment, UnpaidClassRecord } from '@/types/database';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar, Search, Check, X } from 'lucide-react-native';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function canGoPrev(viewDate: Date): boolean {
  const now = new Date();
  const oldest = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  return viewDate > oldest;
}

export default function FeePaymentsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState(new Date());
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'paid' | 'pending' | 'not_attended' | null>(null);
  const insets = useSafeAreaInsets();
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [unpaidRecords, setUnpaidRecords] = useState<UnpaidClassRecord[]>([]);
  const [showDebtModal, setShowDebtModal] = useState(false);

  const currentMonth = viewMonth.getMonth();
  const currentYear = viewMonth.getFullYear();

  const [addMode, setAddMode] = useState(false);
  const [newMonth, setNewMonth] = useState(currentMonth);
  const [newYear, setNewYear] = useState(currentYear);
  const [newClassesCount, setNewClassesCount] = useState('1');
  const [newClassDates, setNewClassDates] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadData();
  }, [viewMonth]);

  async function loadData() {
    try {
      const month = currentMonth + 1;
      const [allStudents, monthPayments] = await Promise.all([
        studentService.getAllStudents(),
        feePaymentService.getMonthPayments(month, currentYear),
      ]);
      setStudents(allStudents);
      setPayments(monthPayments);
    } catch (err) {
      console.error('Failed to load fee data:', err);
    } finally {
      setLoading(false);
    }
  }

  function getMonthName(month: number): string {
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return names[month - 1] || '';
  }

  async function openDebtModal(student: Student) {
    setSelectedStudent(student);
    const records = await unpaidClassService.getUnsettledRecords(student.id);
    setUnpaidRecords(records);
    setShowDebtModal(true);
  }

  async function handleSettle(record: UnpaidClassRecord) {
    if (!user) return;
    await unpaidClassService.settleRecord(record.id, user.uid);
    const newUnpaidClasses = Math.max(0, (selectedStudent?.unpaid_classes || 0) - record.classes_attended);
    await studentService.updateStudent(record.student_id, {
      unpaid_classes: newUnpaidClasses,
    } as any);
    const updated = await unpaidClassService.getUnsettledRecords(record.student_id);
    setUnpaidRecords(updated);
    if (selectedStudent) {
      setSelectedStudent({ ...selectedStudent, unpaid_classes: newUnpaidClasses });
    }
    loadData();
  }

  async function handleAddManual() {
    if (!selectedStudent || !user) return;
    const count = parseInt(newClassesCount, 10);
    if (isNaN(count) || count <= 0) return;

    const dates = newClassDates
      .split(/[,.\s/]+/)
      .map(s => s.trim())
      .filter(s => /^\d{1,2}$/.test(s))
      .map(d => `${newYear}-${String(newMonth + 1).padStart(2, '0')}-${d.padStart(2, '0')}`);

    if (dates.length === 0) {
      for (let i = 0; i < count; i++) {
        dates.push(`${newYear}-${String(newMonth + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`);
      }
    }

    setAdding(true);
    try {
      await unpaidClassService.addUnsettledRecord(
        selectedStudent.id,
        selectedStudent.full_name,
        newMonth + 1,
        newYear,
        Math.min(count, dates.length),
        dates.slice(0, count)
      );
      const updated = await unpaidClassService.getUnsettledRecords(selectedStudent.id);
      setUnpaidRecords(updated);
      const newUnpaid = (selectedStudent.unpaid_classes || 0) + Math.min(count, dates.length);
      setSelectedStudent({ ...selectedStudent, unpaid_classes: newUnpaid });
      setAddMode(false);
      setNewClassesCount('1');
      setNewClassDates('');
      loadData();
    } finally {
      setAdding(false);
    }
  }

  function getPaymentForStudent(student: Student): FeePayment {
    const payment = payments.find(p => p.student_id === student.id && p.month === currentMonth + 1 && p.year === currentYear);
    if (!payment) {
      return {
        id: `${student.id}_${currentMonth + 1}_${currentYear}`,
        student_id: student.id,
        month: currentMonth + 1,
        year: currentYear,
        status: 'not_attended',
        paid_date: null,
        payment_mode: null,
        amount: 0,
        created_at: '',
        updated_at: '',
      };
    }
    return payment;
  }

  async function togglePaymentStatus(student: Student) {
    const existing = getPaymentForStudent(student);
    let newStatus: 'paid' | 'pending' | 'not_attended';
    if (existing.status === 'paid') {
      newStatus = 'pending';
    } else if (existing.status === 'pending') {
      newStatus = 'not_attended';
    } else {
      newStatus = 'paid';
    }
    const paidDate = newStatus === 'paid' ? toDDMMYYYY(new Date()) : null;

    await feePaymentService.setPayment(
      student.id,
      currentMonth + 1,
      currentYear,
      newStatus,
      paidDate,
      null,
      0,
    );
    await studentService.updateStudent(student.id, {
      fee_status: newStatus === 'paid' ? 'paid' : newStatus === 'pending' ? 'pending' : 'not_attended',
    });
    loadData();
  }

  function toDDMMYYYY(date: Date): string {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  }

  const handlePrevMonth = () => {
    const now = new Date();
    const oldestMonth = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    if (viewMonth >= oldestMonth) {
      const prev = new Date(viewMonth);
      prev.setMonth(prev.getMonth() - 1);
      setViewMonth(prev);
    }
  };

  const handleNextMonth = () => {
    const now = new Date();
    if (viewMonth.getMonth() < now.getMonth() || viewMonth.getFullYear() < now.getFullYear()) {
      const next = new Date(viewMonth);
      next.setMonth(next.getMonth() + 1);
      setViewMonth(next);
    }
  };

  const filteredStudents = students
    .filter(s => (s.full_name || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (!sortBy) return 0;
      const statusA = getPaymentForStudent(a).status;
      const statusB = getPaymentForStudent(b).status;
      if (statusA === sortBy && statusB !== sortBy) return -1;
      if (statusA !== sortBy && statusB === sortBy) return 1;
      return 0;
    });

  const paidCount = students.reduce((count, s) => count + (getPaymentForStudent(s).status === 'paid' ? 1 : 0), 0);
  const pendingCount = students.reduce((count, s) => count + (getPaymentForStudent(s).status === 'pending' ? 1 : 0), 0);
  const notAttendedCount = students.length - paidCount - pendingCount;

  function getMonthLabel(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  function isFutureMonth(date: Date): boolean {
    const now = new Date();
    return date.getFullYear() > now.getFullYear() ||
      (date.getFullYear() === now.getFullYear() && date.getMonth() > now.getMonth());
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1e40af" />
        <Text style={styles.loadingText}>Loading payments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Fee Payments</Text>
          <Text style={styles.headerSubtitle}>Tap a student to toggle tuition fee status</Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <TouchableOpacity
          style={[styles.summaryChip, { backgroundColor: sortBy === 'paid' ? '#dcfce7' : '#f0fdf4' }, sortBy === 'paid' && styles.summaryChipActive]}
          onPress={() => setSortBy(sortBy === 'paid' ? null : 'paid')}>
          <View style={[styles.summaryDot, { backgroundColor: '#16a34a' }]} />
          <Text style={[styles.summaryText, { color: '#16a34a' }]}>Paid: {paidCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.summaryChip, { backgroundColor: sortBy === 'pending' ? '#fecaca' : '#fef2f2' }, sortBy === 'pending' && styles.summaryChipActive]}
          onPress={() => setSortBy(sortBy === 'pending' ? null : 'pending')}>
          <View style={[styles.summaryDot, { backgroundColor: '#ef4444' }]} />
          <Text style={[styles.summaryText, { color: '#ef4444' }]}>Pending: {pendingCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.summaryChip, { backgroundColor: sortBy === 'not_attended' ? '#e2e8f0' : '#f1f5f9' }, sortBy === 'not_attended' && styles.summaryChipActive]}
          onPress={() => setSortBy(sortBy === 'not_attended' ? null : 'not_attended')}>
          <View style={[styles.summaryDot, { backgroundColor: '#94a3b8' }]} />
          <Text style={[styles.summaryText, { color: '#94a3b8' }]}>Not Attended: {notAttendedCount}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.monthNav}>
        <TouchableOpacity
          style={[styles.navButton, !canGoPrev(viewMonth) && styles.navButtonDisabled]}
          onPress={handlePrevMonth}
          disabled={!canGoPrev(viewMonth)}>
          <ChevronLeft size={20} color={canGoPrev(viewMonth) ? '#1e40af' : '#cbd5e1'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.monthLabel} onPress={() => setViewMonth(new Date())}>
          <Calendar size={16} color="#1e40af" />
          <Text style={styles.monthLabelText}>{getMonthLabel(viewMonth)}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, isFutureMonth(new Date(new Date(viewMonth).getFullYear(), viewMonth.getMonth() + 1)) && styles.navButtonDisabled]}
          onPress={handleNextMonth}
          disabled={isFutureMonth(new Date(new Date(viewMonth).getFullYear(), viewMonth.getMonth() + 1))}>
          <ChevronRight size={20} color={isFutureMonth(new Date(new Date(viewMonth).getFullYear(), viewMonth.getMonth() + 1)) ? '#cbd5e1' : '#1e40af'} />
        </TouchableOpacity>
      </View>

      {students.length > 0 && (
        <View style={styles.searchContainer}>
          <Search size={18} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#94a3b8"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredStudents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptyText}>No student matches "{search}"</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filteredStudents.map((student) => {
              const payment = getPaymentForStudent(student);
              const status = payment?.status || 'not_attended';
              return (
                  <View key={student.id} style={styles.studentCardWrapper}>
                  <TouchableOpacity
                    style={styles.studentCard}
                    onPress={() => openDebtModal(student)}
                    activeOpacity={(student.unpaid_classes || 0) > 0 ? 0.7 : 1}>
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName}>{student.full_name}{student.summer_class ? ' ☀️' : ''}</Text>
                      {(student.unpaid_classes || 0) > 0 && (
                        <Text style={styles.unpaidClassText}>
                          {student.unpaid_classes} pending classes
                        </Text>
                      )}
                      <Text style={styles.studentInstrument}>{student.instrument}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.statusBadge, status === 'paid' ? styles.paidBadge : status === 'pending' ? styles.pendingBadge : styles.notAttendedBadge]}
                      onPress={() => togglePaymentStatus(student)}>
                      {status === 'paid' ? (
                        <Check size={14} color="#16a34a" />
                      ) : status === 'pending' ? (
                        <X size={14} color="#ef4444" />
                      ) : (
                        <X size={14} color="#94a3b8" />
                      )}
                      <Text style={[styles.statusText, status === 'paid' ? styles.paidText : status === 'pending' ? styles.pendingText : styles.notAttendedText]}>
                        {status === 'paid' ? 'Paid' : status === 'pending' ? 'Pending' : 'Not Attended'}
                      </Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Debt Management Modal */}
      <Modal visible={showDebtModal} transparent animationType="slide">
        <View style={modalStyles.overlay}>
          <View style={modalStyles.sheet}>
            <View style={modalStyles.handle} />

            <Text style={modalStyles.title}>
              Pending Classes — {selectedStudent?.full_name}
            </Text>
            <Text style={modalStyles.subtitle}>
              These classes were attended without fee payment. Mark as settled once resolved with the parent.
            </Text>

            {unpaidRecords.length === 0 && !addMode ? (
              <View style={modalStyles.emptyState}>
                <Text style={modalStyles.emptyText}>No pending classes</Text>
              </View>
            ) : (
              unpaidRecords.map(record => (
                <View key={record.id} style={modalStyles.recordCard}>
                  <View style={modalStyles.recordLeft}>
                    <Text style={modalStyles.recordMonth}>
                      {getMonthName(record.month)} {record.year}
                    </Text>
                    <Text style={modalStyles.recordCount}>
                      {record.classes_attended} classes attended
                    </Text>
                    <Text style={modalStyles.recordDates}>
                      Dates: {record.class_dates
                        .map(d => new Date(d + 'T00:00:00').getDate())
                        .join(', ')} {getMonthName(record.month).slice(0, 3)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={modalStyles.settleBtn}
                    onPress={() => handleSettle(record)}>
                    <Text style={modalStyles.settleBtnText}>Settle</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}

            {addMode ? (
              <View style={modalStyles.addForm}>
                <Text style={modalStyles.addFormTitle}>Add Manual Entry</Text>

                <Text style={modalStyles.addLabel}>Month</Text>
                <View style={modalStyles.monthRow}>
                  {MONTH_NAMES.map((name, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[modalStyles.monthBtn, newMonth === i && modalStyles.monthBtnActive]}
                      onPress={() => setNewMonth(i)}>
                      <Text style={[modalStyles.monthBtnText, newMonth === i && modalStyles.monthBtnTextActive]}>
                        {name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={modalStyles.addLabel}>Year</Text>
                <View style={modalStyles.yearRow}>
                  {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                    <TouchableOpacity
                      key={y}
                      style={[modalStyles.yearBtn, newYear === y && modalStyles.yearBtnActive]}
                      onPress={() => setNewYear(y)}>
                      <Text style={[modalStyles.yearBtnText, newYear === y && modalStyles.yearBtnTextActive]}>
                        {y}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={modalStyles.addLabel}>Number of classes</Text>
                <TextInput
                  style={modalStyles.addInput}
                  value={newClassesCount}
                  onChangeText={setNewClassesCount}
                  keyboardType="number-pad"
                  placeholder="e.g. 3"
                  placeholderTextColor="#94a3b8"
                />

                <Text style={modalStyles.addLabel}>Class dates (comma-separated day numbers, optional)</Text>
                <TextInput
                  style={modalStyles.addInput}
                  value={newClassDates}
                  onChangeText={setNewClassDates}
                  placeholder="e.g. 5, 12, 19"
                  placeholderTextColor="#94a3b8"
                />

                <View style={modalStyles.addActions}>
                  <TouchableOpacity
                    style={modalStyles.addCancelBtn}
                    onPress={() => { setAddMode(false); setNewClassesCount('1'); setNewClassDates(''); }}>
                    <Text style={modalStyles.addCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[modalStyles.addConfirmBtn, adding && { opacity: 0.6 }]}
                    onPress={handleAddManual}
                    disabled={adding}>
                    <Text style={modalStyles.addConfirmBtnText}>{adding ? 'Adding...' : 'Add'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={modalStyles.addManualBtn}
                onPress={() => setAddMode(true)}>
                <Text style={modalStyles.addManualBtnText}>+ Add Manually</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={modalStyles.closeBtn}
              onPress={() => { setShowDebtModal(false); setAddMode(false); }}>
              <Text style={modalStyles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 0,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  summaryChipActive: {
    borderColor: '#1e293b',
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '700',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 12,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonDisabled: {
    backgroundColor: '#f1f5f9',
  },
  monthLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
  },
  monthLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
  },
  content: {
    flex: 1,
  },
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  studentCardWrapper: {
    width: '48%',
  },
  studentCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  studentInfo: {
    flex: 1,
    marginRight: 8,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  studentInstrument: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  paidBadge: {
    backgroundColor: '#f0fdf4',
  },
  pendingBadge: {
    backgroundColor: '#fef2f2',
  },
  notAttendedBadge: {
    backgroundColor: '#f1f5f9',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  paidText: {
    color: '#16a34a',
  },
  pendingText: {
    color: '#ef4444',
  },
  notAttendedText: {
    color: '#94a3b8',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1e293b',
  },
  clearText: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#334155',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
  unpaidClassText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#d97706',
    marginTop: 2,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 20,
  },
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
    padding: 14,
    marginBottom: 10,
  },
  recordLeft: {
    flex: 1,
  },
  recordMonth: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400e',
  },
  recordCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#b45309',
    marginTop: 2,
  },
  recordDates: {
    fontSize: 11,
    color: '#d97706',
    marginTop: 4,
  },
  settleBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  settleBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  closeBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  addManualBtn: {
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#7dd3fc',
  },
  addManualBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0369a1',
  },
  addForm: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
    padding: 16,
    marginTop: 12,
  },
  addFormTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0c4a6e',
    marginBottom: 12,
  },
  addLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 6,
  },
  monthRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  monthBtn: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  monthBtnActive: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  monthBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0369a1',
  },
  monthBtnTextActive: {
    color: '#fff',
  },
  yearRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  yearBtn: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  yearBtnActive: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  yearBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0369a1',
  },
  yearBtnTextActive: {
    color: '#fff',
  },
  addInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bae6fd',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1e293b',
    marginBottom: 12,
  },
  addActions: {
    flexDirection: 'row',
    gap: 10,
  },
  addCancelBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  addConfirmBtn: {
    flex: 1,
    backgroundColor: '#0ea5e9',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addConfirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
