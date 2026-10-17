import { Money } from './money';
import { getCurrencyMeta } from './iso4217';

export interface FormatMoneyOptions {
  locale?: string;
  grouping?: 'indian' | 'international';
  notation?: 'standard' | 'compact';
  showCode?: boolean;
}

/**
 * Formats integer or fractional strings into Indian digit grouping:
 * 1234567.50 -> 12,34,567.50
 */
function applyIndianGrouping(intPart: string): string {
  if (intPart.length <= 3) return intPart;
  const lastThree = intPart.slice(-3);
  const otherNumbers = intPart.slice(0, -3);
  const formattedOthers = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${formattedOthers},${lastThree}`;
}

/**
 * Formats standard international grouping:
 * 1234567.50 -> 1,234,567.50
 */
function applyInternationalGrouping(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatMoney(money: Money, options: FormatMoneyOptions = {}): string {
  const {
    grouping = 'indian',
    notation = 'standard',
    showCode = false,
  } = options;

  const meta = getCurrencyMeta(money.currencyCode);
  const major = money.toMajor();
  const symbol = meta.symbol;

  // Compact Indian notation (Lakhs & Crores)
  if (notation === 'compact') {
    const absVal = Math.abs(major);
    const sign = major < 0 ? '-' : '';

    if (grouping === 'indian') {
      if (absVal >= 10000000) {
        // Crores
        const cr = absVal / 10000000;
        return `${sign}${symbol}${cr.toFixed(2).replace(/\.00$/, '')} Cr`;
      }
      if (absVal >= 100000) {
        // Lakhs
        const lakh = absVal / 100000;
        return `${sign}${symbol}${lakh.toFixed(2).replace(/\.00$/, '')} L`;
      }
    } else {
      // International compact (K, M, B)
      if (absVal >= 1000000000) {
        return `${sign}${symbol}${(absVal / 1000000000).toFixed(2).replace(/\.00$/, '')} B`;
      }
      if (absVal >= 1000000) {
        return `${sign}${symbol}${(absVal / 1000000).toFixed(2).replace(/\.00$/, '')} M`;
      }
      if (absVal >= 1000) {
        return `${sign}${symbol}${(absVal / 1000).toFixed(2).replace(/\.00$/, '')} K`;
      }
    }
  }

  // Standard notation
  const majorStr = money.toMajorString();
  const [intStr = '0', decStr] = majorStr.split('.');
  const isNegative = intStr.startsWith('-');
  const rawInt = isNegative ? intStr.slice(1) : intStr;

  const groupedInt = grouping === 'indian'
    ? applyIndianGrouping(rawInt)
    : applyInternationalGrouping(rawInt);

  const formattedNumber = `${isNegative ? '-' : ''}${groupedInt}${decStr ? `.${decStr}` : ''}`;

  if (showCode) {
    return `${meta.code} ${formattedNumber}`;
  }

  return `${symbol}${formattedNumber}`;
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertBelowThousand(n: number): string {
  let str = '';
  if (n >= 100) {
    str += `${ONES[Math.floor(n / 100)]} Hundred `;
    n %= 100;
  }
  if (n >= 20) {
    const t = Math.floor(n / 10);
    const rem = n % 10;
    if (rem > 0) {
      str += `${TENS[t]}-${ONES[rem]} `;
      n = 0;
    } else {
      str += `${TENS[t]} `;
      n = 0;
    }
  }
  if (n > 0) {
    str += `${ONES[n]} `;
  }
  return str.trim();
}

/**
 * Converts a Money object into official words using the Indian numbering system.
 * Example: ₹12,34,567.50 -> "Rupees Twelve Lakh Thirty-Four Thousand Five Hundred Sixty-Seven and Fifty Paise Only"
 */
export function amountInWordsIndian(money: Money): string {
  const major = money.toMajor();
  if (major === 0) {
    return 'Rupees Zero Only';
  }

  const isNegative = major < 0;
  const absMajor = Math.abs(major);
  let intPart = Math.floor(absMajor);
  const factor = Math.pow(10, money.exponent);
  const paisePart = Math.round((absMajor - intPart) * factor);

  const crores = Math.floor(intPart / 10000000);
  intPart %= 10000000;
  const lakhs = Math.floor(intPart / 100000);
  intPart %= 100000;
  const thousands = Math.floor(intPart / 1000);
  intPart %= 1000;
  const remainder = intPart;

  const parts: string[] = [];
  if (crores > 0) {
    parts.push(`${convertBelowThousand(crores)} Crore`);
  }
  if (lakhs > 0) {
    parts.push(`${convertBelowThousand(lakhs)} Lakh`);
  }
  if (thousands > 0) {
    parts.push(`${convertBelowThousand(thousands)} Thousand`);
  }
  if (remainder > 0) {
    parts.push(convertBelowThousand(remainder));
  }

  const rupeeWords = parts.join(' ').trim();
  let result = `Rupees ${rupeeWords}`;

  if (paisePart > 0) {
    result += ` and ${convertBelowThousand(paisePart)} Paise`;
  }

  result += ' Only';
  return isNegative ? `Minus ${result}` : result;
}

export function formatCompactMoney(money: Money, options: Omit<FormatMoneyOptions, 'notation'> = {}): string {
  return formatMoney(money, { ...options, notation: 'compact' });
}

export function amountInWords(money: Money): string {
  return amountInWordsIndian(money);
}
