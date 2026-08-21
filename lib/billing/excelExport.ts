import { Bill } from '@/types/billing';
import { getMonthName } from './amountInWords';

function parseTimestamp(ts: any): string {
  if (!ts) return '';
  if (ts.toDate) return ts.toDate().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const d = new Date(ts);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export async function exportBillsAsExcel(
  bills: Bill[],
  fromMonth: number,
  fromYear: number,
  toMonth: number,
  toYear: number,
): Promise<void> {
  const XLSX = await import('xlsx');

  const filtered = bills.filter(b => {
    const billDate = b.year * 100 + b.month;
    const from     = fromYear * 100 + fromMonth;
    const to       = toYear   * 100 + toMonth;
    return billDate >= from && billDate <= to;
  });

  if (filtered.length === 0) {
    throw new Error('No bills found for the selected period.');
  }

  const rows = filtered.map((b, i) => ({
    'S.No':           i + 1,
    'Bill No':        b.bill_number,
    'Date':           b.paid_date || parseTimestamp(b.created_at),
    'Student Name':   b.student_name,
    'Parent Name':    b.parent_name || '',
    'Instrument':     b.instrument,
    'Fee Type':       b.fee_items?.map(item => item.fee_type === 'Other' && item.other_name ? item.other_name : item.fee_type).join(', ') || b.fee_type,
    'Amount (₹)':     b.amount,
    'Payment Mode':   b.payment_mode,
    'Reference No':   b.payment_reference || '',
    'Notes':          b.notes || '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  ws['!cols'] = [
    { wch: 5  },
    { wch: 15 },
    { wch: 14 },
    { wch: 22 },
    { wch: 20 },
    { wch: 12 },
    { wch: 16 },
    { wch: 12 },
    { wch: 14 },
    { wch: 20 },
    { wch: 25 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bills Ledger');

  const fyLabel  = `${fromYear}-${String(toYear).slice(2)}`;
  const filename = `KGS_Bills_FY${fyLabel}.xlsx`;
  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const binary = atob(wbout);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } else {
    const Sharing = await import('expo-sharing');
    const { File, Paths } = await import('expo-file-system');

    const file = new File(Paths.document, filename);
    file.write(wbout, { encoding: 'base64' });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(file.uri, {
        mimeType:    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: `Export ${filename}`,
        UTI:         'com.microsoft.excel.xlsx',
      });
    }
  }
}
