export interface CurrencyMeta {
  code: string;
  numericCode: string;
  exponent: number;
  symbol: string;
  name: string;
  nativeSymbol?: string;
}

export const ISO_4217_CURRENCIES: Record<string, CurrencyMeta> = {
  INR: {
    code: "INR",
    numericCode: "356",
    exponent: 2,
    symbol: "₹",
    name: "Indian Rupee",
    nativeSymbol: "₹",
  },
  USD: {
    code: "USD",
    numericCode: "840",
    exponent: 2,
    symbol: "$",
    name: "US Dollar",
    nativeSymbol: "$",
  },
  EUR: {
    code: "EUR",
    numericCode: "978",
    exponent: 2,
    symbol: "€",
    name: "Euro",
    nativeSymbol: "€",
  },
  GBP: {
    code: "GBP",
    numericCode: "826",
    exponent: 2,
    symbol: "£",
    name: "British Pound",
    nativeSymbol: "£",
  },
  AED: {
    code: "AED",
    numericCode: "784",
    exponent: 2,
    symbol: "AED",
    name: "UAE Dirham",
    nativeSymbol: "د.إ",
  },
  SGD: {
    code: "SGD",
    numericCode: "702",
    exponent: 2,
    symbol: "S$",
    name: "Singapore Dollar",
    nativeSymbol: "$",
  },
  AUD: {
    code: "AUD",
    numericCode: "036",
    exponent: 2,
    symbol: "A$",
    name: "Australian Dollar",
    nativeSymbol: "$",
  },
  CAD: {
    code: "CAD",
    numericCode: "124",
    exponent: 2,
    symbol: "C$",
    name: "Canadian Dollar",
    nativeSymbol: "$",
  },
  JPY: {
    code: "JPY",
    numericCode: "392",
    exponent: 0,
    symbol: "¥",
    name: "Japanese Yen",
    nativeSymbol: "¥",
  },
  CHF: {
    code: "CHF",
    numericCode: "756",
    exponent: 2,
    symbol: "CHF",
    name: "Swiss Franc",
    nativeSymbol: "CHF",
  },
  SAR: {
    code: "SAR",
    numericCode: "682",
    exponent: 2,
    symbol: "SAR",
    name: "Saudi Riyal",
    nativeSymbol: "﷼",
  },
  ZAR: {
    code: "ZAR",
    numericCode: "710",
    exponent: 2,
    symbol: "R",
    name: "South African Rand",
    nativeSymbol: "R",
  },
  KWD: {
    code: "KWD",
    numericCode: "414",
    exponent: 3,
    symbol: "KD",
    name: "Kuwaiti Dinar",
    nativeSymbol: "د.ك",
  },
  BHD: {
    code: "BHD",
    numericCode: "048",
    exponent: 3,
    symbol: "BD",
    name: "Bahraini Dinar",
    nativeSymbol: "د.ب",
  },
  OMR: {
    code: "OMR",
    numericCode: "512",
    exponent: 3,
    symbol: "OMR",
    name: "Omani Rial",
    nativeSymbol: "ر.ع.",
  },
  QAR: {
    code: "QAR",
    numericCode: "634",
    exponent: 2,
    symbol: "QR",
    name: "Qatari Riyal",
    nativeSymbol: "ر.ق",
  },
  HKD: {
    code: "HKD",
    numericCode: "344",
    exponent: 2,
    symbol: "HK$",
    name: "Hong Kong Dollar",
    nativeSymbol: "$",
  },
  NZD: {
    code: "NZD",
    numericCode: "554",
    exponent: 2,
    symbol: "NZ$",
    name: "New Zealand Dollar",
    nativeSymbol: "$",
  },
  SEK: {
    code: "SEK",
    numericCode: "752",
    exponent: 2,
    symbol: "kr",
    name: "Swedish Krona",
    nativeSymbol: "kr",
  },
  NOK: {
    code: "NOK",
    numericCode: "578",
    exponent: 2,
    symbol: "kr",
    name: "Norwegian Krone",
    nativeSymbol: "kr",
  },
  DKK: {
    code: "DKK",
    numericCode: "208",
    exponent: 2,
    symbol: "kr.",
    name: "Danish Krone",
    nativeSymbol: "kr",
  },
  CNY: {
    code: "CNY",
    numericCode: "156",
    exponent: 2,
    symbol: "¥",
    name: "Chinese Yuan",
    nativeSymbol: "¥",
  },
  BRL: {
    code: "BRL",
    numericCode: "986",
    exponent: 2,
    symbol: "R$",
    name: "Brazilian Real",
    nativeSymbol: "R$",
  },
  MXN: {
    code: "MXN",
    numericCode: "484",
    exponent: 2,
    symbol: "Mex$",
    name: "Mexican Peso",
    nativeSymbol: "$",
  },
};

export const DEFAULT_PINNED_CURRENCIES: string[] = [
  "INR", // Always pinned first
  "USD",
  "EUR",
  "GBP",
  "AED",
  "SGD",
  "AUD",
  "CAD",
  "JPY",
  "CHF",
  "SAR",
  "ZAR",
];

export function getCurrencyMeta(code: string): CurrencyMeta {
  const normalized = code.toUpperCase();
  const meta = ISO_4217_CURRENCIES[normalized];
  if (!meta) {
    // Graceful fallback for unlisted ISO currency
    return {
      code: normalized,
      numericCode: "000",
      exponent: 2,
      symbol: normalized,
      name: normalized,
    };
  }
  return meta;
}
