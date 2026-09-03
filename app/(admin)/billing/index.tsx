import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Modal, Alert,
  useWindowDimensions, Pressable, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Plus, Search, ChevronRight,
  FileSpreadsheet, ArrowLeft, FileText,
  DollarSign, SlidersHorizontal, X,
} from 'lucide-react-native';
import { Bill, FeeType, BillingPaymentMode } from '@/types/billing';
import { billService } from '@/lib/billing/firestoreHelpers';
import { formatCurrency, getMonthName, getCurrentFinancialYear, getFinancialYears } from '@/lib/billing/amountInWords';
import { exportBillsAsExcel } from '@/lib/billing/excelExport';

const FEE_TYPES: FeeType[] = ['Tuition Fee', 'Exam Fee', 'Registration Fee', 'Other'];
const PAYMENT_MODES: BillingPaymentMode[] = ['Cash', 'UPI', 'Net Banking', 'Card'];

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: getMonthName(i + 1).slice(0, 3) }));
const CURRENT_YEAR = new Date().getFullYear();
const isAndroid = Platform.OS === 'android';

function parseTimestamp(ts: any): string {
  if (!ts) return '—';
  if (ts.toDate) return ts.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const d = new Date(ts);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function BillCard({ bill, onPress }: { bill: Bill; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.billCard} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.billCardLeft}>
        <FileText size={18} color="#1e40af" />
      </View>
      <View style={styles.billCardBody}>
        <View style={styles.billCardTop}>
          <Text style={styles.billCardName} numberOfLines={1}>{bill.student_name}</Text>
          <Text style={styles.billCardAmount}>
            {formatCurrency(bill.amount)}
          </Text>
        </View>
        <View style={styles.billCardBottom}>
          <Text style={styles.billCardSub}>
            {bill.bill_number} · {(() => {
              const months = bill.months && bill.months.length > 0 ? bill.months.sort((a, b) => a - b) : [bill.month];
              const names = months.map(m => getMonthName(m).slice(0, 3));
              return months.length > 1 ? `${names.join(' & ')} ${bill.year}` : `${names[0]} ${bill.year}`;
            })()}
          </Text>
          <Text style={styles.billCardDate}>{bill.paid_date || parseTimestamp(bill.created_at)}</Text>
        </View>
        <View style={styles.billCardTags}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{bill.payment_mode}</Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{bill.fee_type}</Text>
          </View>
        </View>
      </View>
      <ChevronRight size={16} color="#cbd5e1" />
    </TouchableOpacity>
  );
}

export default function BillingDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isWeb = width > 768;

  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear] = useState(CURRENT_YEAR);
  const [filterFeeType, setFilterFeeType] = useState<FeeType | null>(null);

  const currentFY = getCurrentFinancialYear();
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFromMonth, setExportFromMonth] = useState(currentFY.fromMonth);
  const [exportFromYear, setExportFromYear] = useState(currentFY.fromYear);
  const [exportToMonth, setExportToMonth] = useState(currentFY.toMonth);
  const [exportToYear, setExportToYear] = useState(currentFY.toYear);
  const [exporting, setExporting] = useState(false);
  const [showTotal, setShowTotal] = useState(false);

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterPaymentMode, setFilterPaymentMode] = useState<BillingPaymentMode | null>(null);
  const [filterDateFromMonth, setFilterDateFromMonth] = useState<number | null>(null);
  const [filterDateFromYear, setFilterDateFromYear] = useState<number | null>(null);
  const [filterDateToMonth, setFilterDateToMonth] = useState<number | null>(null);
  const [filterDateToYear, setFilterDateToYear] = useState<number | null>(null);

  useEffect(() => {
    const unsub = billService.subscribeToAllBills(data => {
      setBills(data);
      setLoading(false);
      setRefreshing(false);
    });
    return unsub;
  }, []);

  const filteredBills = useMemo(() => {
    return bills.filter(b => {
      const billedMonth = b.month;
      const billedYear = b.year;
      const matchMonth = billedMonth === filterMonth && billedYear === filterYear;
      const matchFeeType = !filterFeeType || b.fee_type === filterFeeType;
      const matchPaymentMode = !filterPaymentMode || b.payment_mode === filterPaymentMode;
      const matchSearch = !search.trim() ||
        b.student_name.toLowerCase().includes(search.toLowerCase()) ||
        b.bill_number.toLowerCase().includes(search.toLowerCase());

      let matchDateRange = true;
      if (filterDateFromMonth && filterDateFromYear && filterDateToMonth && filterDateToYear) {
        const billDateVal = billedYear * 100 + billedMonth;
        const fromDateVal = filterDateFromYear * 100 + filterDateFromMonth;
        const toDateVal = filterDateToYear * 100 + filterDateToMonth;
        matchDateRange = billDateVal >= fromDateVal && billDateVal <= toDateVal;
      }

      return matchMonth && matchFeeType && matchPaymentMode && matchDateRange && matchSearch;
    });
  }, [bills, filterMonth, filterYear, filterFeeType, filterPaymentMode, filterDateFromMonth, filterDateFromYear, filterDateToMonth, filterDateToYear, search]);

  const stats = useMemo(() => {
    const total = filteredBills.reduce((s, b) => s + b.amount, 0);
    return { count: filteredBills.length, total };
  }, [filteredBills]);

  async function handleExcelExport() {
    setExporting(true);
    try {
      await exportBillsAsExcel(
        bills,
        exportFromMonth,
        exportFromYear,
        exportToMonth,
        exportToYear,
      );
      setShowExportModal(false);
    } catch (e: any) {
      Alert.alert('Export Error', e.message);
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Fee Receipts</Text>
          <Text style={styles.headerSub}>KGS Music Academy</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.paymentsBtn}
            onPress={() => router.push('/(admin)/fee-payments')}>
            <DollarSign size={isAndroid ? 14 : 18} color="#1e40af" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.totalBadge}
            onPress={() => setShowTotal(!showTotal)}>
            <Text style={styles.totalBadgeText}>
              {showTotal ? formatCurrency(stats.total) : 'Total'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.exportBtn}
            onPress={() => setShowExportModal(true)}>
            <FileSpreadsheet size={isAndroid ? 14 : 18} color="#16a34a" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => router.push('/(admin)/billing/create')}>
            <Plus size={isAndroid ? 16 : 20} color="#fff" />
            <Text style={styles.newBtnText}>New</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(true)} />}>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
          {MONTHS.map(m => (
            <TouchableOpacity
              key={m.value}
              style={[styles.monthChip, filterMonth === m.value && styles.monthChipActive]}
              onPress={() => setFilterMonth(m.value)}>
              <Text style={[styles.monthChipText, filterMonth === m.value && styles.monthChipTextActive]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.feeTypeScroll}>
          <TouchableOpacity
            style={[styles.feeTypeChip, !filterFeeType && styles.feeTypeChipActive]}
            onPress={() => setFilterFeeType(null)}>
            <Text style={[styles.feeTypeChipText, !filterFeeType && styles.feeTypeChipTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          {FEE_TYPES.map(ft => (
            <TouchableOpacity
              key={ft}
              style={[styles.feeTypeChip, filterFeeType === ft && styles.feeTypeChipActive]}
              onPress={() => setFilterFeeType(ft)}>
              <Text style={[styles.feeTypeChipText, filterFeeType === ft && styles.feeTypeChipTextActive]}>
                {ft}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search size={16} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search student or bill no..."
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <TouchableOpacity
            style={[styles.filterBtn, (filterPaymentMode || filterDateFromMonth) ? styles.filterBtnActive : undefined]}
            onPress={() => setShowFilterModal(true)}>
            <SlidersHorizontal size={18} color={(filterPaymentMode || filterDateFromMonth) ? '#fff' : '#64748b'} />
          </TouchableOpacity>
        </View>

        {filteredBills.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No bills for {getMonthName(filterMonth)} {filterYear}</Text>
            <Text style={styles.emptyText}>Tap "New" to create the first receipt.</Text>
          </View>
        ) : (
          <View style={styles.billsList}>
            {filteredBills.map(bill => (
              <BillCard
                key={bill.id}
                bill={bill}
                onPress={() => router.push(`/(admin)/billing/view/${bill.id}`)}
              />
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal
        visible={showExportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExportModal(false)}>

        <Pressable style={modalStyles.overlay} onPress={() => setShowExportModal(false)}>
          <Pressable style={[
            modalStyles.sheet,
            isWeb && modalStyles.sheetWeb,
          ]} onPress={(e) => e.stopPropagation()}>

            <View style={modalStyles.handle} />
            <Text style={modalStyles.title}>Export Bills — Excel</Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={modalStyles.scrollContent}>
              <Text style={modalStyles.sectionLabel}>Financial Year</Text>
              <View style={modalStyles.fyRow}>
                {getFinancialYears(3).map(fy => {
                  const isActive =
                    exportFromMonth === fy.fromMonth &&
                    exportFromYear  === fy.fromYear  &&
                    exportToMonth   === fy.toMonth   &&
                    exportToYear    === fy.toYear;
                  return (
                    <TouchableOpacity
                      key={fy.label}
                      style={[modalStyles.chip, isActive && modalStyles.chipActive]}
                      onPress={() => {
                        setExportFromMonth(fy.fromMonth);
                        setExportFromYear(fy.fromYear);
                        setExportToMonth(fy.toMonth);
                        setExportToYear(fy.toYear);
                      }}>
                      <Text style={[modalStyles.chipText, isActive && modalStyles.chipTextActive]}>
                        FY {fy.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={modalStyles.sectionLabel}>From</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={modalStyles.monthScroll}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[modalStyles.chip, exportFromMonth === m && modalStyles.chipActive]}
                    onPress={() => setExportFromMonth(m)}>
                    <Text style={[modalStyles.chipText, exportFromMonth === m && modalStyles.chipTextActive]}>
                      {getMonthName(m).slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={modalStyles.yearRow}>
                {[currentFY.fromYear - 1, currentFY.fromYear, currentFY.toYear].map(y => (
                  <TouchableOpacity
                    key={y}
                    style={[modalStyles.chip, exportFromYear === y && modalStyles.chipActive]}
                    onPress={() => setExportFromYear(y)}>
                    <Text style={[modalStyles.chipText, exportFromYear === y && modalStyles.chipTextActive]}>
                      {y}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[modalStyles.sectionLabel, { marginTop: 16 }]}>To</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={modalStyles.monthScroll}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[modalStyles.chip, exportToMonth === m && modalStyles.chipActive]}
                    onPress={() => setExportToMonth(m)}>
                    <Text style={[modalStyles.chipText, exportToMonth === m && modalStyles.chipTextActive]}>
                      {getMonthName(m).slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={modalStyles.yearRow}>
                {[currentFY.fromYear - 1, currentFY.fromYear, currentFY.toYear].map(y => (
                  <TouchableOpacity
                    key={y}
                    style={[modalStyles.chip, exportToYear === y && modalStyles.chipActive]}
                    onPress={() => setExportToYear(y)}>
                    <Text style={[modalStyles.chipText, exportToYear === y && modalStyles.chipTextActive]}>
                      {y}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={modalStyles.preview}>
                <Text style={modalStyles.previewRange}>
                  {getMonthName(exportFromMonth)} {exportFromYear}
                  {' → '}
                  {getMonthName(exportToMonth)} {exportToYear}
                </Text>
                <Text style={modalStyles.previewCount}>
                  {bills.filter(b => {
                    let bdMonth = b.month;
                    let bdYear = b.year;
                    if (b.paid_date) {
                      const parts = b.paid_date.split('-');
                      if (parts.length === 3) {
                        bdMonth = parseInt(parts[1], 10);
                        bdYear = parseInt(parts[2], 10);
                      }
                    }
                    const bd = bdYear * 100 + bdMonth;
                    return (
                      bd >= exportFromYear * 100 + exportFromMonth &&
                      bd <= exportToYear   * 100 + exportToMonth
                    );
                  }).length} bills in this range
                </Text>
              </View>
            </ScrollView>

            <View style={modalStyles.btnRow}>
              <TouchableOpacity
                style={modalStyles.cancelBtn}
                onPress={() => setShowExportModal(false)}>
                <Text style={modalStyles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modalStyles.exportActionBtn, exporting && { opacity: 0.6 }]}
                onPress={handleExcelExport}
                disabled={exporting}>
                {exporting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={modalStyles.exportActionBtnText}>Export Excel</Text>}
              </TouchableOpacity>
            </View>

          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}>

        <Pressable style={modalStyles.overlay} onPress={() => setShowFilterModal(false)}>
          <Pressable style={[
            modalStyles.sheet,
            isWeb && modalStyles.sheetWeb,
          ]} onPress={(e) => e.stopPropagation()}>

            <View style={modalStyles.handle} />
            <View style={modalStyles.titleRow}>
              <Text style={modalStyles.title}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={modalStyles.scrollContent}>
              <Text style={modalStyles.sectionLabel}>Payment Mode</Text>
              <View style={modalStyles.chipRow}>
                <TouchableOpacity
                  style={[modalStyles.chip, !filterPaymentMode && modalStyles.chipActive]}
                  onPress={() => setFilterPaymentMode(null)}>
                  <Text style={[modalStyles.chipText, !filterPaymentMode && modalStyles.chipTextActive]}>
                    All
                  </Text>
                </TouchableOpacity>
                {PAYMENT_MODES.map(pm => (
                  <TouchableOpacity
                    key={pm}
                    style={[modalStyles.chip, filterPaymentMode === pm && modalStyles.chipActive]}
                    onPress={() => setFilterPaymentMode(pm)}>
                    <Text style={[modalStyles.chipText, filterPaymentMode === pm && modalStyles.chipTextActive]}>
                      {pm}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[modalStyles.sectionLabel, { marginTop: 20 }]}>Date Range</Text>
              <Text style={modalStyles.subLabel}>From</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={modalStyles.monthScroll}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[modalStyles.chip, filterDateFromMonth === m && modalStyles.chipActive]}
                    onPress={() => {
                      setFilterDateFromMonth(m);
                      if (!filterDateFromYear) setFilterDateFromYear(CURRENT_YEAR);
                    }}>
                    <Text style={[modalStyles.chipText, filterDateFromMonth === m && modalStyles.chipTextActive]}>
                      {getMonthName(m).slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={modalStyles.yearRow}>
                {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map(y => (
                  <TouchableOpacity
                    key={y}
                    style={[modalStyles.chip, filterDateFromYear === y && modalStyles.chipActive]}
                    onPress={() => setFilterDateFromYear(y)}>
                    <Text style={[modalStyles.chipText, filterDateFromYear === y && modalStyles.chipTextActive]}>
                      {y}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[modalStyles.subLabel, { marginTop: 16 }]}>To</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={modalStyles.monthScroll}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[modalStyles.chip, filterDateToMonth === m && modalStyles.chipActive]}
                    onPress={() => {
                      setFilterDateToMonth(m);
                      if (!filterDateToYear) setFilterDateToYear(CURRENT_YEAR);
                    }}>
                    <Text style={[modalStyles.chipText, filterDateToMonth === m && modalStyles.chipTextActive]}>
                      {getMonthName(m).slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={modalStyles.yearRow}>
                {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map(y => (
                  <TouchableOpacity
                    key={y}
                    style={[modalStyles.chip, filterDateToYear === y && modalStyles.chipActive]}
                    onPress={() => setFilterDateToYear(y)}>
                    <Text style={[modalStyles.chipText, filterDateToYear === y && modalStyles.chipTextActive]}>
                      {y}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={modalStyles.btnRow}>
              <TouchableOpacity
                style={modalStyles.cancelBtn}
                onPress={() => {
                  setFilterPaymentMode(null);
                  setFilterDateFromMonth(null);
                  setFilterDateFromYear(null);
                  setFilterDateToMonth(null);
                  setFilterDateToYear(null);
                }}>
                <Text style={modalStyles.cancelBtnText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={modalStyles.exportActionBtn}
                onPress={() => setShowFilterModal(false)}>
                <Text style={modalStyles.exportActionBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>

          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  header: {
    backgroundColor: '#fff', flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isAndroid ? 12 : 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    width: isAndroid ? 36 : 40, height: isAndroid ? 36 : 40, borderRadius: isAndroid ? 10 : 12,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, marginLeft: isAndroid ? 8 : 12 },
  headerTitle: { fontSize: isAndroid ? 17 : 20, fontWeight: '800', color: '#1e293b' },
  headerSub: { fontSize: isAndroid ? 10 : 11, color: '#94a3b8', marginTop: 2 },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: isAndroid ? 4 : 6,
    backgroundColor: '#1e40af', borderRadius: isAndroid ? 8 : 12,
    paddingHorizontal: isAndroid ? 10 : 16, paddingVertical: isAndroid ? 7 : 10,
  },
  newBtnText: { fontSize: isAndroid ? 12 : 14, fontWeight: '700', color: '#fff' },

  totalBadge: {
    backgroundColor: '#f0fdf4', borderWidth: 1.5, borderColor: '#bbf7d0',
    borderRadius: isAndroid ? 8 : 12, paddingHorizontal: isAndroid ? 8 : 12, paddingVertical: isAndroid ? 5 : 8,
  },
  totalBadgeText: { fontSize: isAndroid ? 11 : 13, fontWeight: '800', color: '#166534' },

  monthScroll: { marginBottom: 12 },
  monthChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f1f5f9', borderWidth: 1.5, borderColor: '#e2e8f0',
    marginRight: 8,
  },
  monthChipActive: { backgroundColor: '#1e40af', borderColor: '#1e40af' },
  monthChipText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  monthChipTextActive: { color: '#fff' },

  feeTypeScroll: { marginBottom: 12 },
  feeTypeChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f1f5f9', borderWidth: 1.5, borderColor: '#e2e8f0',
    marginRight: 8,
  },
  feeTypeChipActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  feeTypeChipText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  feeTypeChipTextActive: { color: '#fff' },

  searchRow: { marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e2e8f0', paddingHorizontal: 12,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#1e293b' },
  filterBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center',
  },
  filterBtnActive: {
    backgroundColor: '#1e40af', borderColor: '#1e40af',
  },

  billsList: { gap: 10 },
  billCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  billCardLeft: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#eff6ff',
  },
  billCardBody: { flex: 1 },
  billCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 },
  billCardName: { fontSize: 15, fontWeight: '700', color: '#1e293b', flex: 1 },
  billCardAmount: { fontSize: 15, fontWeight: '800', color: '#1e40af', marginLeft: 8 },
  billCardBottom: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  billCardSub: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  billCardDate: { fontSize: 11, color: '#94a3b8' },
  billCardTags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tag: {
    backgroundColor: '#f1f5f9', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  tagText: { fontSize: 10, fontWeight: '700', color: '#64748b' },

  emptyBox: {
    backgroundColor: '#fff', borderRadius: 16, padding: 40,
    alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 6 },
  emptyText: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  paymentsBtn: {
    width: isAndroid ? 32 : 40, height: isAndroid ? 32 : 40, borderRadius: isAndroid ? 8 : 12,
    backgroundColor: '#eff6ff', borderWidth: 1.5, borderColor: '#bfdbfe',
    alignItems: 'center', justifyContent: 'center',
  },
  exportBtn: {
    width: isAndroid ? 32 : 40, height: isAndroid ? 32 : 40, borderRadius: isAndroid ? 8 : 12,
    backgroundColor: '#f0fdf4', borderWidth: 1.5, borderColor: '#bbf7d0',
    alignItems: 'center', justifyContent: 'center',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingTop: 12,
    maxHeight: '90%',
    width: '100%',
  },
  sheetWeb: {
    maxWidth: 520,
    width: '100%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center', marginBottom: 12,
  },
  title: {
    fontSize: 18, fontWeight: '800',
    color: '#1e293b',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  sectionLabel: {
    fontSize: 10, fontWeight: '800', color: '#94a3b8',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8,
  },
  subLabel: {
    fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  titleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 12,
  },
  fyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  monthScroll: { marginBottom: 8 },
  yearRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, marginRight: 6,
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  chipActive: { backgroundColor: '#1e40af', borderColor: '#1e40af' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  chipTextActive: { color: '#fff' },
  preview: {
    backgroundColor: '#f0fdf4', borderRadius: 10,
    borderWidth: 1, borderColor: '#bbf7d0',
    padding: 12, marginTop: 16, alignItems: 'center',
  },
  previewRange: {
    fontSize: 14, fontWeight: '700', color: '#166534',
  },
  previewCount: {
    fontSize: 12, color: '#16a34a', marginTop: 4,
  },
  btnRow: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: '#e2e8f0',
  },
  cancelBtn: {
    flex: 1, padding: 14, borderRadius: 12,
    backgroundColor: '#f1f5f9', alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  exportActionBtn: {
    flex: 2, padding: 14, borderRadius: 12,
    backgroundColor: '#16a34a', alignItems: 'center',
  },
  exportActionBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
