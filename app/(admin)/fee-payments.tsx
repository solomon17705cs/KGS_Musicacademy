import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { studentService, feePaymentService } from '@/lib/firestore';
import { Student, FeePayment, PaymentMode } from '@/types/database';
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar, Check, X } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PAYMENT_MODES: PaymentMode[] = ['UPI', 'cash', 'bank_transfer'];

function canGoPrev(viewDate: Date): boolean {
  const now = new Date();
  const oldest = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  return viewDate > oldest;
}

export default function FeePaymentsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState(new Date());
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editModal, setEditModal] = useState(false);
  const [editStatus, setEditStatus] = useState<'paid' | 'pending'>('pending');
  const [editPaidDate, setEditPaidDate] = useState('');
  const [editPaymentMode, setEditPaymentMode] = useState<PaymentMode | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const webDateRef = useRef<any>(null);
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;

  const currentMonth = viewMonth.getMonth();
  const currentYear = viewMonth.getFullYear();

  useEffect(() => {
    loadData();
  }, [viewMonth]);

  async function loadData() {
    try {
      const [allStudents, monthPayments] = await Promise.all([
        studentService.getAllStudents(),
        feePaymentService.getMonthPayments(currentMonth + 1, currentYear),
      ]);
      setStudents(allStudents);
      setPayments(monthPayments);
    } catch (err) {
      console.error('Failed to load fee data:', err);
    } finally {
      setLoading(false);
    }
  }

  function getPaymentForStudent(student: Student): FeePayment | undefined {
    const payment = payments.find(p => p.student_id === student.id && p.month === currentMonth + 1 && p.year === currentYear);
    if (!payment) {
      return {
        id: `${student.id}_${currentMonth + 1}_${currentYear}`,
        student_id: student.id,
        month: currentMonth + 1,
        year: currentYear,
        status: 'pending',
        paid_date: null,
        payment_mode: null,
        amount: 0,
        created_at: '',
        updated_at: '',
      };
    }
    return payment;
  }

  function openEditModal(student: Student) {
    setSelectedStudent(student);
    const existing = getPaymentForStudent(student);
    setEditStatus(existing?.status || 'pending');
    setEditPaidDate(existing?.paid_date || '');
    setEditPaymentMode(existing?.payment_mode || null);
    setEditAmount(existing?.amount?.toString() || '');
    setEditModal(true);
  }

  function formatDDMMYYYY(text: string): string {
    const digits = text.replace(/[^0-9]/g, '');
    let formatted = '';
    for (let i = 0; i < digits.length && i < 8; i++) {
      if (i === 2 || i === 4) formatted += '-';
      formatted += digits[i];
    }
    return formatted;
  }

  function parseDDMMYYYY(dateStr: string): Date | null {
    const parts = dateStr.split('-');
    if (parts.length !== 3 || parts.some(p => !p)) return null;
    const [day, month, year] = parts.map(Number);
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 2000 || year > 2100) return null;
    return new Date(year, month - 1, day);
  }

  function toDDMMYYYY(date: Date): string {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  }

  function openWebPicker() {
    if (Platform.OS === 'web' && webDateRef.current) {
      webDateRef.current.showPicker();
    } else {
      setShowDatePicker(true);
    }
  }

  function handleWebDateChange(value: string) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      setEditPaidDate(toDDMMYYYY(date));
    }
    setShowDatePicker(false);
  }

  async function savePayment() {
    if (!selectedStudent) return;
    await feePaymentService.setPayment(
      selectedStudent.id,
      currentMonth + 1,
      currentYear,
      editStatus,
      editPaidDate || null,
      editPaymentMode,
      editAmount ? parseFloat(editAmount) : 0,
    );
    await studentService.updateStudent(selectedStudent.id, {
      fee_status: editStatus === 'paid' ? 'paid' : 'pending',
    });
    setEditModal(false);
    loadData();
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
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Fee Payments</Text>
          <Text style={styles.headerSubtitle}>Tap a student to edit payment details</Text>
        </View>
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.list}>
          {students.map((student) => {
            const payment = getPaymentForStudent(student);
            const isPaid = payment?.status === 'paid';
            return (
              <View key={student.id} style={styles.studentCardWrapper}>
                <TouchableOpacity
                  style={styles.studentCard}
                  onPress={() => openEditModal(student)}>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{student.full_name}</Text>
                    <Text style={styles.studentInstrument}>{student.instrument}</Text>
                  </View>
                  <View style={[styles.statusBadge, isPaid ? styles.paidBadge : styles.pendingBadge]}>
                    <Text style={[styles.statusText, isPaid ? styles.paidText : styles.pendingText]}>
                      {isPaid ? 'Paid' : 'Pending'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Edit Payment Modal */}
      <Modal visible={editModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedStudent?.full_name}</Text>
                <Text style={styles.modalSubtitle}>{getMonthLabel(viewMonth)}</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={() => setEditModal(false)}>
                <X size={24} color="#1e293b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Status</Text>
                <View style={styles.statusToggle}>
                  <TouchableOpacity
                    style={[styles.statusOption, editStatus === 'paid' && styles.statusOptionActive]}
                    onPress={() => setEditStatus('paid')}>
                    <Check size={16} color={editStatus === 'paid' ? '#fff' : '#16a34a'} />
                    <Text style={[styles.statusOptionText, editStatus === 'paid' && styles.statusOptionTextActive]}>Paid</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.statusOption, editStatus === 'pending' && styles.statusOptionActive]}
                    onPress={() => setEditStatus('pending')}>
                    <X size={16} color={editStatus === 'pending' ? '#fff' : '#ef4444'} />
                    <Text style={[styles.statusOptionText, editStatus === 'pending' && styles.statusOptionTextActive]}>Pending</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {editStatus === 'paid' && (
                <>
                  <View style={styles.sideBySideRow}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Fee Amount</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="2000"
                        value={editAmount}
                        onChangeText={setEditAmount}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Payment Date</Text>
                      <View style={styles.dateInputRow}>
                        <TextInput
                          style={[styles.input, { flex: 1 }]}
                          placeholder="DD-MM-YYYY"
                          value={editPaidDate}
                          onChangeText={(text) => setEditPaidDate(formatDDMMYYYY(text))}
                          keyboardType="numeric"
                          maxLength={10}
                        />
                        <TouchableOpacity style={styles.calendarButton} onPress={openWebPicker}>
                          <Calendar size={16} color="#1e40af" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  <View style={styles.inputGroupCompact}>
                    <Text style={styles.label}>Payment Mode</Text>
                    <View style={styles.modeRow}>
                      {PAYMENT_MODES.map(mode => (
                        <TouchableOpacity
                          key={mode}
                          style={[styles.modeButton, editPaymentMode === mode && styles.modeButtonActive]}
                          onPress={() => setEditPaymentMode(mode)}>
                          <Text style={[styles.modeText, editPaymentMode === mode && styles.modeTextActive]}>
                            {mode === 'UPI' ? 'UPI' : mode === 'cash' ? 'Cash' : 'Bank'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </>
              )}

              <TouchableOpacity style={styles.saveButton} onPress={savePayment}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {Platform.OS === 'web' && (
        <input
          ref={webDateRef}
          type="date"
          style={{ position: 'absolute', top: '40px', left: '50%', opacity: 0, width: '200px', height: '30px', zIndex: -1 }}
          onChange={(e) => handleWebDateChange(e.target.value)}
        />
      )}

      {Platform.OS !== 'web' && showDatePicker && (
        <DateTimePicker
          value={parseDDMMYYYY(editPaidDate) || new Date()}
          mode="date"
          display="default"
          onChange={(_, selectedDate) => {
            if (selectedDate) {
              setEditPaidDate(toDDMMYYYY(selectedDate));
            }
            setShowDatePicker(false);
          }}
        />
      )}
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
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  studentInfo: {
    flex: 1,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  paidBadge: {
    backgroundColor: '#f0fdf4',
  },
  pendingBadge: {
    backgroundColor: '#fef2f2',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  paidText: {
    color: '#16a34a',
  },
  pendingText: {
    color: '#ef4444',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    paddingTop: 8,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputGroupCompact: {
    marginBottom: 12,
  },
  sideBySideRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#f8fafc',
  },
  statusToggle: {
    flexDirection: 'row',
    gap: 10,
  },
  statusOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  statusOptionActive: {
    borderColor: 'transparent',
    backgroundColor: '#16a34a',
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  statusOptionTextActive: {
    color: '#fff',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  modeButtonActive: {
    borderColor: '#1e40af',
    backgroundColor: '#eff6ff',
  },
  modeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  modeTextActive: {
    color: '#1e40af',
  },
  dateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateInput: {
    flex: 1,
  },
  calendarButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: '#1e40af',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
