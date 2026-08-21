import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Plus, Search, ChevronRight,
  FileText, ArrowLeft,
} from 'lucide-react-native';
import { Bill } from '@/types/billing';
import { billService } from '@/lib/billing/firestoreHelpers';
import { formatCurrency, getMonthName } from '@/lib/billing/amountInWords';

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: getMonthName(i + 1).slice(0, 3) }));
const CURRENT_YEAR = new Date().getFullYear();

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
      const matchSearch = !search.trim() ||
        b.student_name.toLowerCase().includes(search.toLowerCase()) ||
        b.bill_number.toLowerCase().includes(search.toLowerCase());
      return matchMonth && matchSearch;
    });
  }, [bills, filterMonth, filterYear, search]);

  const stats = useMemo(() => {
    const total = filteredBills.reduce((s, b) => s + b.amount, 0);
    return { count: filteredBills.length, total };
  }, [filteredBills]);

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

        <LinearGradient
          colors={['#1e40af', '#3b82f6']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatCurrency(stats.total)}</Text>
            <Text style={styles.statLabel}>Collected · {getMonthName(filterMonth)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.count}</Text>
            <Text style={styles.statLabel}>Receipts</Text>
          </View>
        </LinearGradient>

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

  statsCard: {
    borderRadius: 18, padding: 20, marginBottom: 16,
    flexDirection: 'row', alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 3, textAlign: 'center' },
  statDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.2)' },

  monthScroll: { marginBottom: 12 },
  monthChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f1f5f9', borderWidth: 1.5, borderColor: '#e2e8f0',
    marginRight: 8,
  },
  monthChipActive: { backgroundColor: '#1e40af', borderColor: '#1e40af' },
  monthChipText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  monthChipTextActive: { color: '#fff' },

  searchRow: { marginBottom: 16 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e2e8f0', paddingHorizontal: 12,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#1e293b' },

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
