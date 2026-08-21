import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { Bill } from '@/types/billing';
import { amountInWords, formatCurrency, getMonthName } from './amountInWords';
import { LOGO_BASE64 } from './logoBase64';


function parseTimestampDate(ts: any): string {
  if (!ts) return '';
  if (ts.toDate) return ts.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const d = new Date(ts);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function parseTimestampDateTime(ts: any): string {
  if (!ts) return '';
  const dateFn = (t: any) => {
    const d = t.toDate ? t.toDate() : new Date(t);
    if (isNaN(d.getTime())) return '';
    const date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${date}  ${time}`;
  };
  return dateFn(ts);
}

function generateReceiptHTML(bill: Bill): string {
  const dateStr = parseTimestampDate(bill.created_at);
  const dateTimeStr = parseTimestampDateTime(bill.created_at);
  const months = bill.months && bill.months.length > 0 ? bill.months.sort((a, b) => a - b) : [bill.month];
  const monthCount = months.length;
  const monthNames = months.map(m => getMonthName(m).slice(0, 3));
  const periodStr = months.length > 1
    ? `${monthNames.join(' & ')} ${bill.year}`
    : `${monthNames[0]} ${bill.year}`;
  const amtWords = amountInWords(bill.amount);
  const amtFormatted = formatCurrency(bill.amount);
  const feeItems = bill.fee_items || [{ fee_type: bill.fee_type, amount: bill.amount }];
  const logoSrc = LOGO_BASE64;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=559, initial-scale=1.0"/>
  <title>Receipt ${bill.bill_number}</title>
  <style>
    @page { size: A5 portrait; margin: 8mm; }

    @media print {
      html, body { margin: 0; padding: 0; width: 132mm; }
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    html, body {
      width: 132mm;
      margin: 0 auto;
    }

    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #fff;
      color: #111;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .receipt {
      width: 119mm;
      border: 1.2px solid #000;
      margin: 14mm auto 0;
    }

    .row {
      border-bottom: 1px solid #000;
      width: 100%;
    }
    .row:last-child {
      border-bottom: none;
    }

    /* ── Header ── */
    .header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .logo-img {
      width: 115px;
      height: 115px;
      flex-shrink: 0;
      object-fit: contain;
    }
    .academy-name-block {
      font-family: 'Times New Roman', Times, serif;
      text-align: center;
      white-space: nowrap;
    }
    .academy-name-block .academy-name {
      font-size: 40px;
      font-weight: 900;
      color: #000;
      letter-spacing: 0.5px;
      line-height: 1.1;
    }
    .academy-name-block .academy-sub {
      font-size: 24px;
      font-weight: 400;
      color: #333;
    }
    .header-right {
      text-align: right;
      font-size: 10px;
      color: #333;
      line-height: 1.7;
    }

    /* ── Receipt ID + Date ── */
    .meta-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 14px;
      font-size: 11px;
    }
    .meta-row b { font-weight: 700; }

    /* ── Two column section ── */
    .two-col-row {
      display: flex;
      align-items: stretch;
    }
    .col-left {
      flex: 1;
      padding: 10px 14px;
      border-right: 1px solid #000;
      font-size: 11px;
      line-height: 1.8;
    }
    .col-right {
      flex: 1;
      padding: 10px 14px;
      font-size: 11px;
      line-height: 1.8;
    }
    .col-section-label {
      font-size: 10.5px;
      color: #333;
      margin-bottom: 3px;
    }
    .student-name {
      font-family: 'Times New Roman', Times, serif;
      font-size: 17px;
      font-weight: 900;
      color: #000;
      margin-bottom: 4px;
      text-transform: uppercase;
      line-height: 1.2;
    }
    .payment-mode-value {
      font-size: 17px;
      font-weight: 900;
      color: #000;
      margin-bottom: 4px;
      text-transform: uppercase;
      line-height: 1.2;
    }

    /* ── Amount row ── */
    .amount-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      min-height: 56px;
    }
    .amount-left {
      font-size: 11px;
      line-height: 1.7;
    }
    .amount-left .amt-label { color: #444; font-size: 10px; }
    .amount-left .amt-type { font-weight: 700; font-size: 11px; text-transform: uppercase; }
    .amount-box {
      border: 1.2px solid #000;
      padding: 6px 14px;
      min-width: 200px;
      text-align: right;
    }
    .amount-box .amt-top {
      font-size: 10px;
      font-weight: 700;
      margin-bottom: 4px;
      border-bottom: 1px solid #000;
      padding-bottom: 3px;
    }
    .amount-box .amt-main {
      font-size: 20px;
      font-weight: 800;
    }
    .amount-box .amt-total-line {
      border-top: 1px solid #000;
      margin: 6px 0 4px;
    }
    .amount-box .amt-total-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .amount-box .amt-total-label {
      font-size: 13px;
      font-weight: 700;
    }
    .amount-box .amt-total-value {
      font-size: 18px;
      font-weight: 900;
    }

    /* ── Amount in words ── */
    .words-row {
      padding: 8px 14px;
      font-size: 11px;
    }
    .words-label { color: #444; }
    .words-value { font-size: 14px; font-weight: 700; }

    /* ── Seal + Signature ── */
    .seal-row {
      display: flex;
      align-items: flex-end;
      justify-content: space-around;
      padding: 14px 14px 8px;
      min-height: 140px;
    }
    .seal-block {
      text-align: center;
      font-size: 10px;
      color: #333;
    }
    .sig-line {
      border-top: 1px solid #000;
      width: 120px;
      margin: 0 auto 6px;
      height: 60px;
    }

    /* ── Footer ── */
    .footer-row {
      text-align: center;
      font-size: 9px;
      color: #666;
      padding: 6px 14px;
    }
  </style>
</head>
<body>
<div class="receipt">

  <!-- Header -->
  <div class="row">
    <div class="header-row">
      <div class="header-left">
        ${logoSrc
      ? `<img class="logo-img" src="${logoSrc}" alt="KGS Logo" />`
      : `<div style="width:115px;height:115px;border:1px solid #ccc;display:flex;align-items:center;justify-content:center;font-size:8px;color:#aaa;">LOGO</div>`
    }
        <div class="academy-name-block">
          <div class="academy-name">KGS</div>
          <div class="academy-sub">Music Academy</div>
        </div>
      </div>
      <div class="header-right">
        1/56, Agaram Main Road<br/>
        Thiruvanchery, Chennai - 600126<br/>
        Phone: +91 94879 27742<br/>
        www.kgsmusicacademy.in
      </div>
    </div>
  </div>

  <!-- Receipt ID + Date -->
  <div class="row">
    <div class="meta-row">
      <div>Receipt ID &nbsp;<b>${bill.bill_number}</b></div>
      <div>Date &nbsp;<b>${dateTimeStr}</b></div>
    </div>
  </div>

  <!-- Student + Payment columns -->
  <div class="row">
    <div class="two-col-row">
      <div class="col-left">
        <div class="col-section-label">Student Details</div>
        <div class="student-name">${bill.student_name}</div>
        <div>${bill.instrument}${bill.grade_level ? ` | ${bill.grade_level}` : ''}</div>
        <div>${periodStr}</div>
      </div>
      <div class="col-right">
        <div class="col-section-label">Payment Details</div>
        <div class="payment-mode-value">${bill.payment_mode}</div>
        <div>Reference ID - ${bill.payment_reference || 'Not Provided'}</div>
        <div>Paid On: ${bill.paid_date || dateStr}</div>
        <div>Bill No: ${bill.bill_number}</div>
        <div>Issued By: ${bill.issued_by_name}</div>
      </div>
    </div>
  </div>

  <!-- Amount -->
  <div class="row">
    <div class="amount-row">
      <div class="amount-left">
        <div class="amt-label">Amount Paid</div>
        ${feeItems.map(item => {
      const label = item.fee_type === 'Other' && item.other_name ? item.other_name : item.fee_type;
      return `<div class="amt-type">(${label})</div>`;
    }).join('')}
      </div>
      <div class="amount-box">
        ${feeItems.map(item => {
      const label = item.fee_type === 'Other' && item.other_name ? item.other_name : item.fee_type;
      const multiplier = monthCount > 1 ? ` x${monthCount}` : '';
      return `<div style="font-size:10px;font-weight:700;margin-bottom:2px;">${label}: ${formatCurrency(item.amount)}${multiplier}</div>`;
    }).join('')}
        <div class="amt-total-line"></div>
        <div class="amt-total-row">
          <span class="amt-total-label">Total:</span>
          <span class="amt-total-value">${amtFormatted}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Amount in words -->
  <div class="row">
    <div class="words-row">
      <span class="words-label">Amount in words &nbsp;</span>
      <span class="words-value">${amtWords}</span>
    </div>
  </div>

  <!-- Seal + Signature -->
  <div class="row">
    <div class="seal-row">
      <div class="seal-block">
        <div style="height:60px;"></div>
        Official Seal
      </div>
      <div class="seal-block">
        <div style="height:60px;"></div>
        Authorized Signatory
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="row">
    <div class="footer-row">
      Amount once paid is not refundable whatsoever.
    </div>
  </div>

</div>
</body>
</html>`;
}

function printOnWeb(html: string): void {
  const isElectron = typeof window !== 'undefined' && (window as any).electronAPI?.printHTML;
  if (isElectron) {
    (window as any).electronAPI.printHTML(html);
    return;
  }
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  }
}

export async function exportBillAsPDF(bill: Bill): Promise<void> {
  const html = generateReceiptHTML(bill);
  if (Platform.OS === 'web') {
    printOnWeb(html);
    return;
  }
  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
    width: 559,
    height: 794,
  });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Receipt ${bill.bill_number}`,
      UTI: 'com.adobe.pdf',
    });
  }
}

export async function printBill(bill: Bill): Promise<void> {
  const html = generateReceiptHTML(bill);
  if (Platform.OS === 'web') {
    printOnWeb(html);
    return;
  }
  await Print.printAsync({
    html,
    width: 559,
    height: 794,
  });
}
