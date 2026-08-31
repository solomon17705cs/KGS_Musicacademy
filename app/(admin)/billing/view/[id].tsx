import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Platform, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Download, Printer, Check,
  User, Music2, CreditCard, FileText,
} from 'lucide-react-native';
import { Bill } from '@/types/billing';
import { billService, auditLogService } from '@/lib/billing/firestoreHelpers';
import { exportBillAsPDF, printBill } from '@/lib/billing/pdfExport';
import { amountInWords, formatCurrency, getMonthName } from '@/lib/billing/amountInWords';

function parseTimestamp(ts: any): string {
  if (!ts) return '—';
  if (ts.toDate) return ts.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const d = new Date(ts);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function ViewBill() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const notesDirty = bill !== null && notesDraft !== (bill.notes || '');

  useEffect(() => {
    if (!id) return;
    loadBill();
  }, [id]);

  async function loadBill() {
    try {
      const data = await billService.getBill(id!);
      setBill(data);
      setNotesDraft(data?.notes || '');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function saveNotes() {
    if (!bill || !notesDirty) return;
    setSavingNotes(true);
    try {
      await billService.updateNotes(bill.id, notesDraft);
      setBill({ ...bill, notes: notesDraft });
    } catch (e) {
      console.error(e);
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleExportPDF() {
    if (!bill) return;
    setActionLoading('pdf');
    try {
      await exportBillAsPDF(bill);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to export PDF');
    } finally {
      setActionLoading('');
    }
  }

  async function handlePrint() {
    if (!bill) return;
    setActionLoading('print');
    try {
      await printBill(bill);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to print');
    } finally {
      setActionLoading('');
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  if (!bill) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={22} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Receipt Not Found</Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>This receipt could not be found.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{bill.bill_number}</Text>
          <Text style={styles.headerSub}>
            {getMonthName(bill.month)} {bill.year} · {parseTimestamp(bill.created_at)}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>

        <View style={styles.successBanner}>
          <Text style={styles.successBannerText}>
            Payment confirmed. Bill number <Text style={{ fontWeight: '800' }}>{bill.bill_number}</Text>
          </Text>
        </View>

        <LinearGradient
          colors={['#1e40af', '#3b82f6']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.amountHero}>
          <View>
            <Text style={styles.amountHeroLabel}>Amount Paid</Text>
            <Text style={styles.amountHeroValue}>{formatCurrency(bill.amount)}</Text>
            <Text style={styles.amountHeroPeriod}>
              {getMonthName(bill.month)} {bill.year} · {bill.fee_type}
            </Text>
          </View>
          <View style={styles.paymentModeBadge}>
            <Text style={styles.paymentModeText}>{bill.payment_mode}</Text>
          </View>
        </LinearGradient>

        <View style={styles.wordsCard}>
          <Text style={styles.wordsLabel}>In Words</Text>
          <Text style={styles.wordsValue}>{amountInWords(bill.amount)}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <User size={16} color="#1e40af" />
            <Text style={styles.cardTitle}>Student Details</Text>
          </View>
          <DetailRow label="Name" value={bill.student_name} />
          <DetailRow label="Parent / Guardian" value={bill.parent_name || '—'} />
          <View style={styles.cardHeader}>
            <Music2 size={16} color="#1e40af" />
            <Text style={styles.cardTitle}>Course</Text>
          </View>
          <DetailRow label="Instrument" value={bill.instrument} />
          <DetailRow label="Fee Type" value={bill.fee_type} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <CreditCard size={16} color="#1e40af" />
            <Text style={styles.cardTitle}>Payment Details</Text>
          </View>
          <DetailRow label="Payment Mode" value={bill.payment_mode} />
          {bill.payment_reference && (
            <DetailRow label="Reference No." value={bill.payment_reference} />
          )}
          <DetailRow label="Period" value={`${getMonthName(bill.month)} ${bill.year}`} />
          <DetailRow label="Date Issued" value={parseTimestamp(bill.created_at)} />
          <DetailRow label="Issued By" value={bill.issued_by_name} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FileText size={16} color="#1e40af" />
            <Text style={styles.cardTitle}>Remarks</Text>
          </View>
          <TextInput
            style={styles.notesInput}
            value={notesDraft}
            onChangeText={setNotesDraft}
            placeholder="Add a note..."
            placeholderTextColor="#94a3b8"
            multiline
          />
          {notesDirty && (
            <TouchableOpacity
              style={styles.saveNotesBtn}
              onPress={saveNotes}
              disabled={savingNotes}>
              {savingNotes ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Check size={14} color="#fff" />
                  <Text style={styles.saveNotesBtnText}>Save</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnBlue]}
            onPress={handleExportPDF}
            disabled={!!actionLoading}>
            {actionLoading === 'pdf'
              ? <ActivityIndicator size="small" color="#fff" />
              : <Download size={18} color="#fff" />}
            <Text style={styles.actionBtnText}>Save PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnGreen]}
            onPress={handlePrint}
            disabled={!!actionLoading}>
            {actionLoading === 'print'
              ? <ActivityIndicator size="small" color="#fff" />
              : <Printer size={18} color="#fff" />}
            <Text style={styles.actionBtnText}>Print</Text>
          </TouchableOpacity>
        </View>

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
  errorText: { fontSize: 15, color: '#ef4444', fontWeight: '600' },

  header: {
    backgroundColor: '#fff',
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 16, gap: 12,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  headerSub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },

  successBanner: {
    backgroundColor: '#f0fdf4', borderRadius: 12,
    borderWidth: 1, borderColor: '#bbf7d0',
    padding: 14, flexDirection: 'row', alignItems: 'center',
    gap: 10, marginBottom: 16,
  },
  successBannerText: { flex: 1, fontSize: 13, color: '#166534', lineHeight: 20 },

  amountHero: {
    borderRadius: 20, padding: 24, marginBottom: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  amountHeroLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  amountHeroValue: { fontSize: 36, fontWeight: '900', color: '#fff' },
  amountHeroPeriod: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  paymentModeBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  paymentModeText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  wordsCard: {
    backgroundColor: '#fffbeb', borderRadius: 12,
    borderWidth: 1, borderColor: '#fde68a',
    padding: 14, marginBottom: 12,
  },
  wordsLabel: { fontSize: 10, fontWeight: '700', color: '#92400e', marginBottom: 4, letterSpacing: 0.5 },
  wordsValue: { fontSize: 13, color: '#78350f', fontWeight: '600', lineHeight: 20 },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  detailRow: {
    flexDirection: 'row', alignItems: 'baseline', paddingVertical: 7,
    borderBottomWidth: 1, borderBottomColor: '#f8fafc',
  },
  detailLabel: { fontSize: 12, color: '#64748b' },
  detailValue: { fontSize: 13, fontWeight: '600', color: '#1e293b', marginLeft: 8 },
  notesText: { fontSize: 13, color: '#64748b', lineHeight: 20, fontStyle: 'italic' },
  notesInput: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    padding: 12, fontSize: 13, color: '#1e293b', lineHeight: 20,
    minHeight: 60, textAlignVertical: 'top',
  },
  saveNotesBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1e40af', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
    alignSelf: 'flex-end', marginTop: 10,
  },
  saveNotesBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    borderRadius: 12, paddingVertical: 14,
  },
  actionBtnBlue: { backgroundColor: '#1e40af' },
  actionBtnGreen: { backgroundColor: '#16a34a' },
  actionBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
