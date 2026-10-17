import { getCurrencyMeta } from './iso4217';

export class CurrencyMismatchError extends Error {
  constructor(c1: string, c2: string, operation: string) {
    super(`Cannot ${operation} money values of differing currencies: ${c1} and ${c2}. Explicit conversion is required.`);
    this.name = 'CurrencyMismatchError';
  }
}

export interface FxConversionMeta {
  sourceCurrency: string;
  targetCurrency: string;
  rate: number;
  effectiveDate: string;
  source: string;
}

export class Money {
  public readonly amountMinor: bigint;
  public readonly currencyCode: string;
  public readonly conversionMeta?: FxConversionMeta;

  constructor(
    amountMinor: bigint | number | string,
    currencyCode: string,
    conversionMeta?: FxConversionMeta
  ) {
    this.amountMinor = typeof amountMinor === 'bigint' ? amountMinor : BigInt(Math.round(Number(amountMinor)));
    this.currencyCode = currencyCode.toUpperCase();
    this.conversionMeta = conversionMeta;
  }

  public get exponent(): number {
    return getCurrencyMeta(this.currencyCode).exponent;
  }

  public get symbol(): string {
    return getCurrencyMeta(this.currencyCode).symbol;
  }

  public get currency(): string {
    return this.currencyCode;
  }

  public static fromMinor(amountMinor: bigint | number | string, currencyCode: string): Money {
    return new Money(amountMinor, currencyCode);
  }

  public static fromSubunits(amountMinor: bigint | number | string, currencyCode: string): Money {
    return new Money(amountMinor, currencyCode);
  }

  public static fromMajor(amountMajor: number, currencyCode: string): Money {
    const meta = getCurrencyMeta(currencyCode);
    const factor = Math.pow(10, meta.exponent);
    const amountMinor = BigInt(Math.round(amountMajor * factor));
    return new Money(amountMinor, currencyCode);
  }

  public toMajor(): number {
    const factor = Math.pow(10, this.exponent);
    return Number(this.amountMinor) / factor;
  }

  public toMajorString(): string {
    const factor = Math.pow(10, this.exponent);
    const val = Number(this.amountMinor) / factor;
    return val.toFixed(this.exponent);
  }

  public add(other: Money): Money {
    if (this.currencyCode !== other.currencyCode) {
      throw new CurrencyMismatchError(this.currencyCode, other.currencyCode, 'add');
    }
    return new Money(this.amountMinor + other.amountMinor, this.currencyCode);
  }

  public subtract(other: Money): Money {
    if (this.currencyCode !== other.currencyCode) {
      throw new CurrencyMismatchError(this.currencyCode, other.currencyCode, 'subtract');
    }
    return new Money(this.amountMinor - other.amountMinor, this.currencyCode);
  }

  public multiply(factor: number): Money {
    const major = this.toMajor() * factor;
    return Money.fromMajor(major, this.currencyCode);
  }

  /**
   * Remainder-preserving allocation split across proportional ratios.
   * Ensures that sum(splits) === original amount with zero lost paise/cents.
   */
  public allocate(ratios: number[]): Money[] {
    if (ratios.length === 0) return [];
    const totalRatio = ratios.reduce((sum, r) => sum + r, 0);
    if (totalRatio <= 0) {
      throw new Error('Total ratio for allocation must be greater than zero.');
    }

    let remainder = this.amountMinor;
    const results: bigint[] = [];

    for (let i = 0; i < ratios.length; i++) {
      const share = (this.amountMinor * BigInt(ratios[i]!)) / BigInt(totalRatio);
      results.push(share);
      remainder -= share;
    }

    // Distribute remaining minor units one by one to ensure exact conservation
    for (let i = 0; remainder > 0n && i < results.length; i++) {
      results[i] = results[i]! + 1n;
      remainder -= 1n;
    }

    return results.map((val) => new Money(val, this.currencyCode));
  }

  public equals(other: Money): boolean {
    return this.currencyCode === other.currencyCode && this.amountMinor === other.amountMinor;
  }

  public greaterThan(other: Money): boolean {
    if (this.currencyCode !== other.currencyCode) {
      throw new CurrencyMismatchError(this.currencyCode, other.currencyCode, 'compare');
    }
    return this.amountMinor > other.amountMinor;
  }

  public lessThan(other: Money): boolean {
    if (this.currencyCode !== other.currencyCode) {
      throw new CurrencyMismatchError(this.currencyCode, other.currencyCode, 'compare');
    }
    return this.amountMinor < other.amountMinor;
  }

  /**
   * Explicit FX conversion.
   */
  public convert(
    targetCurrency: string,
    rate: number,
    effectiveDate = new Date().toISOString(),
    source = 'RBI Reference / Manual'
  ): Money {
    const targetMeta = getCurrencyMeta(targetCurrency);
    const sourceMajor = this.toMajor();
    const convertedMajor = sourceMajor * rate;
    const factor = Math.pow(10, targetMeta.exponent);
    const convertedMinor = BigInt(Math.round(convertedMajor * factor));

    return new Money(convertedMinor, targetCurrency, {
      sourceCurrency: this.currencyCode,
      targetCurrency,
      rate,
      effectiveDate,
      source,
    });
  }
}
