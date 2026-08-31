import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Plus, Search, ChevronRight,
  FileText, ArrowLeft, SlidersHorizontal, X,
} from 'lucide-react-native';
import { Bill, BillingPaymentMode } from '@/types/billing';
import { billService } from '@/lib/billing/firestoreHelpers';
import { formatCurrency, getMonthName } from '@/lib/billing/amountInWords';

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: getMonthName(i + 1).slice(0, 3) }));
const CURRENT_YEAR = new Date().getFullYear();
const PAYMENT_MODES: BillingPaymentMode[] = ['Cash', 'UPI', 'Net Banking', 'Card'];

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

  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear] = useState(CURRENT_YEAR);

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
      let billedMonth = b.month;
      let billedYear = b.year;
      if (b.paid_date) {
        const parts = b.paid_date.split('-');
        if (parts.length === 3) {
          billedMonth = parseInt(parts[1], 10);
          billedYear = parseInt(parts[2], 10);
        }
      }
      const matchMonth = billedMonth === filterMonth && billedYear === filterYear;
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

      return matchMonth && matchPaymentMode && matchDateRange && matchSearch;
    });
  }, [bills, filterMonth, filterYear, filterPaymentMode, filterDateFromMonth, filterDateFromYear, filterDateToMonth, filterDateToYear, search]);

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
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => router.push('/(staff)/billing/create')}>
          <Plus size={20} color="#fff" />
          <Text style={styles.newBtnText}>New</Text>
        </TouchableOpacity>
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
                onPress={() => router.push(`/(staff)/billing/view/${bill.id}`)}
              />
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}>

        <Pressable style={modalStyles.overlay} onPress={() => setShowFilterModal(false)}>
          <Pressable style={modalStyles.sheet} onPress={(e) => e.stopPropagation()}>

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
                style={modalStyles.applyBtn}
                onPress={() => setShowFilterModal(false)}>
                <Text style={modalStyles.applyBtnText}>Apply</Text>
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
    paddingHorizontal: 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  headerSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1e40af', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  newBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  monthScroll: { marginBottom: 12 },
  monthChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f1f5f9', borderWidth: 1.5, borderColor: '#e2e8f0',
    marginRight: 8,
  },
  monthChipActive: { backgroundColor: '#1e40af', borderColor: '#1e40af' },
  monthChipText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  monthChipTextActive: { color: '#fff' },

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
    borderRadius: 24,
    paddingTop: 12,
    maxHeight: '85%',
    width: '90%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center', marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 12,
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
  applyBtn: {
    flex: 2, padding: 14, borderRadius: 12,
    backgroundColor: '#1e40af', alignItems: 'center',
  },
  applyBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
