import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Platform, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2, ChevronDown, Calendar } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '@/contexts/AuthContext';
import { studentService, feePaymentService } from '@/lib/firestore';
import { Student } from '@/types/database';
import { billService, auditLogService } from '@/lib/billing/firestoreHelpers';
import { FeeType, BillingPaymentMode, FeeItem } from '@/types/billing';
import { formatCurrency, getCurrentGradeLevel, getMonthName, getFeeForGrade } from '@/lib/billing/amountInWords';
import { useBottomPadding } from '@/hooks/useBottomPadding';

const FEE_TYPES: FeeType[] = [
  'Tuition Fee', 'Exam Fee', 'Registration Fee', 'Other',
];
const PAYMENT_MODES: BillingPaymentMode[] = ['Cash', 'UPI', 'Net Banking', 'Card'];
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

function toDDMMYYYY(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function parseDDMMYYYY(s: string): Date | null {
  const parts = s.split('-');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts.map(Number);
  const d = new Date(yyyy, mm - 1, dd);
  return isNaN(d.getTime()) ? null : d;
}

function toYYYYMMDD(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function CreateBill() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, user } = useAuth();
  const { width } = useWindowDimensions();
  const isWeb = width > 768;
  const webDateRef = useRef<HTMLInputElement>(null);
  const bottomPadding = useBottomPadding(16);

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedFeeTypes, setSelectedFeeTypes] = useState<FeeType[]>(['Tuition Fee']);
  const [feeAmounts, setFeeAmounts] = useState<Record<FeeType, string>>({
    'Tuition Fee': '0',
    'Exam Fee': '0',
    'Registration Fee': '0',
    'Other': '0',
  });
  const [paymentMode, setPaymentMode] = useState<BillingPaymentMode>('Cash');
  const [paymentRef, setPaymentRef] = useState('');
  const [notes, setNotes] = useState('');
  const [otherFeeName, setOtherFeeName] = useState('');
  const [date, setDate] = useState(toDDMMYYYY(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [error, setError] = useState('');
  const now = new Date();
  const [feeMonths, setFeeMonths] = useState<number[]>([now.getMonth() + 1]);
  const [feeYear, setFeeYear] = useState(now.getFullYear());

  function toggleMonth(m: number) {
    setFeeMonths(prev => {
      if (prev.includes(m)) {
        return prev.length === 1 ? prev : prev.filter(x => x !== m);
      }
      return [...prev, m].sort((a, b) => a - b);
    });
  }

  const totalAmount = selectedFeeTypes.reduce((sum, ft) => {
    const val = Number(feeAmounts[ft]);
    return sum + (isNaN(val) ? 0 : val);
  }, 0) * feeMonths.length;

  function toggleFeeType(ft: FeeType) {
    setSelectedFeeTypes(prev => {
      if (prev.includes(ft)) {
        return prev.filter(t => t !== ft);
      }
      return [...prev, ft];
    });
    if (ft === 'Registration Fee' && !selectedFeeTypes.includes('Registration Fee')) {
      setFeeAmounts(prev => ({ ...prev, 'Registration Fee': '1500' }));
    }
  }

  useEffect(() => {
    studentService.getAllStudents().then(setStudents);
  }, []);

  const filteredStudents = students.filter(s =>
    s.full_name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  function openWebPicker() {
    if (Platform.OS === 'web' && webDateRef.current) {
      webDateRef.current.showPicker();
    } else {
      setShowDatePicker(true);
    }
  }

  function handleDateChange(value: Date | string) {
    if (typeof value === 'string') {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setDate(toDDMMYYYY(d));
      }
    } else {
      setDate(toDDMMYYYY(value));
    }
    setShowDatePicker(false);
  }

  function formatDDMMYYYYInput(text: string): string {
    const digits = text.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 8)}`;
  }

  async function handleCreate() {
    if (!selectedStudent) {
      setError('Please select a student');
      return;
    }
    setError('');
    if (selectedFeeTypes.length === 0)
      return Alert.alert('Error', 'Please select at least one fee type');
    const feeItems: FeeItem[] = selectedFeeTypes.map(ft => ({
      fee_type: ft,
      amount: Number(feeAmounts[ft]) || 0,
      ...(ft === 'Other' && otherFeeName.trim() ? { other_name: otherFeeName.trim() } : {}),
    })).filter(item => item.amount > 0);
    if (feeItems.length === 0)
      return Alert.alert('Error', 'Please enter a valid amount for at least one fee type');
    const total = feeItems.reduce((sum, item) => sum + item.amount, 0) * feeMonths.length;
    if (!profile || !user) return;

    setLoading(true);
    try {
      const billId = await billService.createBill({
        student_id: selectedStudent.id,
        student_name: selectedStudent.full_name,
        parent_name: selectedStudent.father_name || selectedStudent.mother_name || null,
        parent_phone: selectedStudent.father_phone || selectedStudent.mother_phone || null,
        instrument: selectedStudent.instrument,
        grade_level: getCurrentGradeLevel(selectedStudent.completed_grades || []),
        fee_type: feeItems[0].fee_type,
        fee_items: feeItems,
        amount: total,
        payment_mode: paymentMode,
        payment_reference: (paymentMode === 'Cash' || paymentMode === 'Card') ? '-' : (paymentRef.trim() || 'Not provided'),
        month: feeMonths[0],
        months: feeMonths,
        year: feeYear,
        issued_by_uid: user.uid,
        issued_by_name: profile.full_name,
        notes: notes.trim(),
        paid_date: date,
      });

      await auditLogService.log({
        bill_id: billId,
        bill_number: '',
        action: 'created',
        performed_by_uid: user.uid,
        performed_by_name: profile.full_name,
        note: `Created for ${selectedStudent.full_name}`,
      });

      if (selectedFeeTypes.includes('Tuition Fee')) {
        for (const m of feeMonths) {
          await feePaymentService.setPayment(
            selectedStudent.id, m, feeYear, 'paid', date, paymentMode, total / feeMonths.length,
          );
        }
        await studentService.updateStudent(selectedStudent.id, { fee_status: 'paid' });
      }

      Alert.alert('✓ Bill Created', 'Receipt has been generated successfully.', [
        { text: 'View Receipt', onPress: () => router.replace(`/(staff)/billing/view/${billId}`) },
        { text: 'Create Another', onPress: () => resetForm() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create bill');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setSelectedStudent(null);
    setSelectedFeeTypes(['Tuition Fee']);
    setFeeAmounts({
      'Tuition Fee': '0',
      'Exam Fee': '0',
      'Registration Fee': '0',
      'Other': '0',
    });
    setPaymentRef('');
    setNotes('');
    setStudentSearch('');
    setDate(toDDMMYYYY(new Date()));
    const n = new Date();
    setFeeMonths([n.getMonth() + 1]);
    setFeeYear(n.getFullYear());
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Fee Receipt</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]} keyboardShouldPersistTaps="handled">

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>STUDENT</Text>
          <TouchableOpacity
            style={styles.selectorBox}
            onPress={() => setShowStudentPicker(!showStudentPicker)}>
            <Text style={selectedStudent ? styles.selectorValue : styles.selectorPlaceholder}>
              {selectedStudent ? selectedStudent.full_name : 'Select student...'}
            </Text>
            <ChevronDown size={18} color="#94a3b8" />
          </TouchableOpacity>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {showStudentPicker && (
            <View style={styles.pickerDropdown}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search student..."
                value={studentSearch}
                onChangeText={setStudentSearch}
                autoFocus
              />
              {filteredStudents.slice(0, 8).map(s => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.pickerRow}
                  onPress={() => {
                    setSelectedStudent(s);
                    setShowStudentPicker(false);
                    setStudentSearch('');
                    setError('');
                    const fee = getFeeForGrade(s.completed_grades || []);
                    setFeeAmounts(prev => ({ ...prev, 'Tuition Fee': String(fee) }));
                  }}>
                  <Text style={styles.pickerRowName}>{s.full_name}</Text>
                  <Text style={styles.pickerRowSub}>{s.instrument}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {isWeb ? (
          <View style={styles.row}>
            <View style={[styles.section, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.sectionLabel}>PAID DATE</Text>
              <View style={styles.dateInputBox}>
                <TextInput
                  style={styles.dateInput}
                  value={date}
                  onChangeText={(text) => {
                    const formatted = formatDDMMYYYYInput(text);
                    setDate(formatted);
                  }}
                  placeholder="DD-MM-YYYY"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  maxLength={10}
                />
                <TouchableOpacity style={styles.calendarButton} onPress={openWebPicker}>
                  <Calendar size={16} color="#1e40af" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>PAID DATE</Text>
              <View style={styles.dateInputBox}>
                <TextInput
                  style={styles.dateInput}
                  value={date}
                  onChangeText={(text) => {
                    const formatted = formatDDMMYYYYInput(text);
                    setDate(formatted);
                  }}
                  placeholder="DD-MM-YYYY"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  maxLength={10}
                />
                <TouchableOpacity style={styles.calendarButton} onPress={openWebPicker}>
                  <Calendar size={16} color="#1e40af" />
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>FEE FOR MONTH</Text>
          <View style={styles.chipGrid}>
            {MONTHS.map(m => {
              const selected = feeMonths.includes(m);
              return (
                <TouchableOpacity
                  key={m}
                  style={[styles.typeChip, selected && styles.periodChipActive]}
                  onPress={() => toggleMonth(m)}>
                  <Text style={[styles.typeChipText, selected && styles.periodChipTextActive]}>
                    {getMonthName(m).slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={[styles.chipGrid, { marginTop: 8 }]}>
            {YEARS.map(y => (
              <TouchableOpacity
                key={y}
                style={[styles.typeChip, feeYear === y && styles.periodChipActive]}
                onPress={() => setFeeYear(y)}>
                <Text style={[styles.typeChipText, feeYear === y && styles.periodChipTextActive]}>
                  {y}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>FEE TYPE</Text>
          <View style={styles.chipGrid}>
            {FEE_TYPES.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.typeChip, selectedFeeTypes.includes(t) && styles.typeChipActive]}
                onPress={() => toggleFeeType(t)}>
                <Text style={[styles.typeChipText, selectedFeeTypes.includes(t) && styles.typeChipTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {selectedFeeTypes.map(ft => (
          <View key={ft} style={styles.section}>
            <Text style={styles.sectionLabel}>
              <Text style={{ fontWeight: '900' }}>{ft.toUpperCase()}</Text>
            </Text>
            <View style={styles.amountBox}>
              <Text style={styles.rupeeSymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                value={feeAmounts[ft]}
                onChangeText={(v) => setFeeAmounts(prev => ({ ...prev, [ft]: v }))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#94a3b8"
              />
            </View>
            {ft === 'Other' && selectedFeeTypes.includes('Other') && (
              <TextInput
                style={[styles.textField, { marginTop: 8 }]}
                placeholder="enter the fee name"
                placeholderTextColor="#94a3b8"
                value={otherFeeName}
                onChangeText={setOtherFeeName}
              />
            )}
          </View>
        ))}

        {selectedFeeTypes.length > 0 && totalAmount > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>TOTAL AMOUNT</Text>
            <Text style={[styles.amountPreview, { fontSize: 18, fontWeight: '800', color: '#1e293b' }]}>{formatCurrency(totalAmount)}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PAYMENT MODE</Text>
          <View style={styles.chipGrid}>
            {PAYMENT_MODES.map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.typeChip, paymentMode === m && styles.modeChipActive]}
                onPress={() => setPaymentMode(m)}>
                <Text style={[styles.typeChipText, paymentMode === m && styles.typeChipTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {(paymentMode === 'UPI' || paymentMode === 'Net Banking') && (
            <TextInput
              style={[styles.textField, { marginTop: 10 }]}
              placeholder={
                paymentMode === 'UPI' ? 'UPI Transaction ID (optional)' : 'Transaction Reference (optional)'
              }
              placeholderTextColor="#94a3b8"
              value={paymentRef}
              onChangeText={setPaymentRef}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>REMARKS (OPTIONAL)</Text>
          <TextInput
            style={[styles.textField, styles.textArea]}
            placeholder="Any additional notes for this receipt..."
            placeholderTextColor="#94a3b8"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        {selectedStudent && totalAmount > 0 && (
          <View style={styles.previewCard}>
            <CheckCircle2 size={16} color="#16a34a" />
            <Text style={styles.previewText}>
              Receipt for <Text style={styles.previewBold}>{selectedStudent.full_name}</Text>
              {' · '}{formatCurrency(totalAmount)}
              {' · '}{date}
              {' · '}{paymentMode}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.createBtn, loading && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createBtnText}>Generate Receipt</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {Platform.OS === 'web' && (
        <input
          ref={webDateRef}
          type="date"
          style={{ position: 'absolute', top: '40px', left: '50%', opacity: 0, width: '200px', height: '30px', zIndex: -1 }}
          value={toYYYYMMDD(parseDDMMYYYY(date) || new Date())}
          onChange={(e) => handleDateChange(e.target.value)}
        />
      )}

      {Platform.OS !== 'web' && showDatePicker && (
        <DateTimePicker
          value={parseDDMMYYYY(date) || new Date()}
          mode="date"
          display="default"
          onChange={(_, selectedDate) => {
            if (selectedDate) {
              setDate(toDDMMYYYY(selectedDate));
            }
            setShowDatePicker(false);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  section: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 10, fontWeight: '800', color: '#94a3b8',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10,
  },
  row: { flexDirection: 'row' },
  rowChips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  halfSection: { flex: 1 },
  fieldLabel: { fontSize: 12, color: '#64748b', fontWeight: '600', marginBottom: 6 },

  selectorBox: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5,
    borderColor: '#e2e8f0', padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  selectorPlaceholder: { fontSize: 14, color: '#94a3b8' },
  selectorValue: { fontSize: 14, color: '#1e293b', fontWeight: '600' },
  errorText: { fontSize: 12, color: '#dc2626', marginTop: 4 },
  pickerDropdown: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1,
    borderColor: '#e2e8f0', marginTop: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
  },
  searchInput: {
    padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
    fontSize: 14, color: '#1e293b',
  },
  pickerRow: {
    padding: 12, borderBottomWidth: 1, borderBottomColor: '#f8fafc',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  pickerRowName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  pickerRowSub: { fontSize: 12, color: '#64748b' },

  dateInputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5,
    borderColor: '#e2e8f0', paddingHorizontal: 14, paddingVertical: 12,
  },
  dateInput: {
    flex: 1, fontSize: 14, color: '#1e293b', padding: 0,
  },
  calendarButton: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center',
  },

  chipScroll: { marginTop: 0 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  periodChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f1f5f9', borderWidth: 1.5, borderColor: '#e2e8f0',
    marginRight: 6,
  },
  periodChipActive: { backgroundColor: '#1e40af', borderColor: '#1e40af' },
  periodChipText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  periodChipTextActive: { color: '#fff' },
  typeChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f1f5f9', borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  typeChipActive: { backgroundColor: '#ede9fe', borderColor: '#7c3aed' },
  modeChipActive: { backgroundColor: '#dcfce7', borderColor: '#16a34a' },
  typeChipText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  typeChipTextActive: { color: '#1e293b', fontWeight: '700' },

  amountBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 2,
    borderColor: '#1e40af', padding: 14,
  },
  rupeeSymbol: { fontSize: 28, fontWeight: '700', color: '#1e40af', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 32, fontWeight: '800', color: '#1e293b' },
  amountPreview: { fontSize: 13, color: '#64748b', marginTop: 6, marginLeft: 4 },

  textField: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5,
    borderColor: '#e2e8f0', padding: 14,
    fontSize: 14, color: '#1e293b',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },

  previewCard: {
    backgroundColor: '#f0fdf4', borderRadius: 12, borderWidth: 1,
    borderColor: '#bbf7d0', padding: 14,
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 16,
  },
  previewText: { flex: 1, fontSize: 13, color: '#166534', lineHeight: 20 },
  previewBold: { fontWeight: '700' },

  createBtn: {
    backgroundColor: '#1e40af', borderRadius: 14, padding: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
});
