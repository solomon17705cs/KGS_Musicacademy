const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];

const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty',
  'Sixty', 'Seventy', 'Eighty', 'Ninety',
];

function convertHundreds(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
  return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertHundreds(n % 100) : '');
}

export function amountInWords(amount: number): string {
  if (amount === 0) return 'Zero Only';

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  let result = '';

  if (rupees >= 10000000) {
    result += convertHundreds(Math.floor(rupees / 10000000)) + ' Crore ';
    result += amountInWords(rupees % 10000000).replace(' Only', '');
  } else if (rupees >= 100000) {
    result += convertHundreds(Math.floor(rupees / 100000)) + ' Lakh ';
    result += convertHundreds(Math.floor((rupees % 100000) / 1000)) !== ''
      ? convertHundreds(Math.floor((rupees % 100000) / 1000)) + ' Thousand ' : '';
    result += convertHundreds(rupees % 1000);
  } else if (rupees >= 1000) {
    result += convertHundreds(Math.floor(rupees / 1000)) + ' Thousand ';
    result += convertHundreds(rupees % 1000);
  } else {
    result += convertHundreds(rupees);
  }

  result = result.trim();

  if (paise > 0) {
    result += ' and ' + convertHundreds(paise) + ' Paise';
  }

  return result + ' Only';
}

export function formatCurrency(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function getMonthName(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleString('en-IN', { month: 'long' });
}

interface CompletedGrade {
  grade: string;
  type?: string;
}

export function getCurrentGradeLevel(completedGrades: CompletedGrade[]): string {
  const practical = completedGrades.filter(g => g.type === 'practical');
  if (!practical.length) return 'Basic';
  let maxNum = 0;
  let hasInitial = false;
  for (const g of practical) {
    const gs = (g.grade || '').trim();
    if (/^ini/i.test(gs)) { hasInitial = true; continue; }
    const match = gs.match(/(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  if (maxNum === 0 && hasInitial) return 'Grade 1';
  if (maxNum === 0) return 'Basic';
  return `Grade ${maxNum}`;
}

const FEE_MAP: Record<string, number> = {
  'Basic': 2000,
  'Grade 1': 2100,
  'Grade 2': 2200,
  'Grade 3': 2300,
  'Grade 4': 2400,
  'Grade 5': 2500,
  'Grade 6': 2700,
  'Grade 7': 2800,
  'Grade 8': 3000,
};

export function getFeeForGrade(completedGrades: CompletedGrade[]): number {
  const grade = getCurrentGradeLevel(completedGrades);
  return FEE_MAP[grade] ?? 2000;
}

export interface FinancialYear {
  label: string;
  fromMonth: number;
  fromYear: number;
  toMonth: number;
  toYear: number;
}

export function getCurrentFinancialYear(): FinancialYear {
  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  const fyStartYear = month >= 4 ? year : year - 1;
  const fyEndYear   = fyStartYear + 1;

  return {
    label:      `${fyStartYear}-${String(fyEndYear).slice(2)}`,
    fromMonth:  4,
    fromYear:   fyStartYear,
    toMonth:    3,
    toYear:     fyEndYear,
  };
}

export function getFYLabel(month: number, year: number): string {
  const fyStartYear = month >= 4 ? year : year - 1;
  const fyEndYear   = fyStartYear + 1;
  const start2 = String(fyStartYear).slice(2);
  const end2   = String(fyEndYear).slice(2);
  return `${start2}${end2}`;
}

export function getFinancialYears(count = 3): FinancialYear[] {
  const current = getCurrentFinancialYear();
  return Array.from({ length: count }, (_, i) => {
    const fyStartYear = current.fromYear - (count - 1 - i);
    const fyEndYear   = fyStartYear + 1;
    return {
      label:     `${fyStartYear}-${String(fyEndYear).slice(2)}`,
      fromMonth: 4,
      fromYear:  fyStartYear,
      toMonth:   3,
      toYear:    fyEndYear,
    };
  });
}
