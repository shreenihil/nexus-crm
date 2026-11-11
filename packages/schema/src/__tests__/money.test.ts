import { describe, it, expect } from "vitest";
import {
  Money,
  CurrencyMismatchError,
  formatMoney,
  amountInWordsIndian,
  getCurrencyMeta,
  DEFAULT_PINNED_CURRENCIES,
} from "../currency";

describe("Phase 0: Currency-Agnostic & India-First Architecture Tests (§4.7)", () => {
  describe("ISO-4217 Currency Dictionary", () => {
    it("pins INR as the first default currency", () => {
      expect(DEFAULT_PINNED_CURRENCIES[0]).toBe("INR");
      const inrMeta = getCurrencyMeta("INR");
      expect(inrMeta.symbol).toBe("₹");
      expect(inrMeta.exponent).toBe(2);
      expect(inrMeta.numericCode).toBe("356");
    });

    it("handles various minor-unit exponents correctly (JPY 0, KWD 3, USD 2)", () => {
      expect(getCurrencyMeta("JPY").exponent).toBe(0);
      expect(getCurrencyMeta("KWD").exponent).toBe(3);
      expect(getCurrencyMeta("USD").exponent).toBe(2);
    });
  });

  describe("Money Value Object Storage & Arithmetic", () => {
    it("stores money as exact minor units without precision loss", () => {
      // 1234.56 INR -> 123456 paise
      const mInr = Money.fromMajor(1234.56, "INR");
      expect(mInr.amountMinor).toBe(123456n);
      expect(mInr.toMajor()).toBe(1234.56);
      expect(mInr.toMajorString()).toBe("1234.56");

      // 5000 JPY -> 5000 units (0 exponent)
      const mJpy = Money.fromMajor(5000, "JPY");
      expect(mJpy.amountMinor).toBe(5000n);
      expect(mJpy.toMajor()).toBe(5000);

      // 12.345 KWD -> 12345 fils (3 exponent)
      const mKwd = Money.fromMajor(12.345, "KWD");
      expect(mKwd.amountMinor).toBe(12345n);
      expect(mKwd.toMajor()).toBe(12.345);
    });

    it("performs addition and subtraction accurately within the same currency", () => {
      const a = Money.fromMajor(100.5, "INR");
      const b = Money.fromMajor(50.25, "INR");

      const sum = a.add(b);
      expect(sum.toMajor()).toBe(150.75);
      expect(sum.currencyCode).toBe("INR");

      const diff = a.subtract(b);
      expect(diff.toMajor()).toBe(50.25);
    });

    it("throws CurrencyMismatchError when adding or comparing differing currencies without convert()", () => {
      const inr = Money.fromMajor(1000, "INR");
      const usd = Money.fromMajor(1000, "USD");

      expect(() => inr.add(usd)).toThrow(CurrencyMismatchError);
      expect(() => inr.subtract(usd)).toThrow(CurrencyMismatchError);
      expect(() => inr.greaterThan(usd)).toThrow(CurrencyMismatchError);
      expect(() => inr.lessThan(usd)).toThrow(CurrencyMismatchError);
    });

    it("performs remainder-preserving allocation without losing a single paisa/cent", () => {
      // Split 100.00 INR (10000 paise) 3 equal ways
      const total = Money.fromMajor(100.0, "INR");
      const splits = total.allocate([1, 1, 1]);

      expect(splits.length).toBe(3);
      expect(splits[0]!.amountMinor).toBe(3334n); // 33.34
      expect(splits[1]!.amountMinor).toBe(3333n); // 33.33
      expect(splits[2]!.amountMinor).toBe(3333n); // 33.33

      // Total sum must exactly equal 10000n
      const totalReconstituted = splits[0]!.add(splits[1]!).add(splits[2]!);
      expect(totalReconstituted.amountMinor).toBe(10000n);
      expect(totalReconstituted.toMajor()).toBe(100.0);
    });

    it("converts currencies explicitly while locking conversion metadata", () => {
      const inr = Money.fromMajor(83000, "INR");
      // FX rate: 1 INR = 0.012 USD
      const usd = inr.convert("USD", 0.012, "2026-10-16", "RBI Reference");

      expect(usd.currencyCode).toBe("USD");
      expect(usd.toMajor()).toBe(996);
      expect(usd.conversionMeta?.sourceCurrency).toBe("INR");
      expect(usd.conversionMeta?.rate).toBe(0.012);
      expect(usd.conversionMeta?.source).toBe("RBI Reference");
    });
  });

  describe("Indian Number & Currency Formatting (§4.7-D)", () => {
    it("formats ₹ amounts with Indian lakh/crore digit grouping", () => {
      const m = Money.fromMajor(1234567.5, "INR");
      // Standard Indian format
      const formatted = formatMoney(m, { grouping: "indian" });
      expect(formatted).toBe("₹12,34,567.50");

      // International grouping toggle
      const international = formatMoney(m, { grouping: "international" });
      expect(international).toBe("₹1,234,567.50");
    });

    it("formats compact Indian numbers (Lakhs and Crores) for KPI tiles and column headers", () => {
      const lakhDeal = Money.fromMajor(1250000, "INR"); // 12.5 Lakhs
      expect(
        formatMoney(lakhDeal, { notation: "compact", grouping: "indian" }),
      ).toBe("₹12.50 L");

      const croreDeal = Money.fromMajor(32000000, "INR"); // 3.2 Crores
      expect(
        formatMoney(croreDeal, { notation: "compact", grouping: "indian" }),
      ).toBe("₹3.20 Cr");
    });

    it("formats foreign currencies without symbol or decimal ambiguity", () => {
      const usdDeal = Money.fromMajor(10000, "USD");
      expect(formatMoney(usdDeal, { showCode: true })).toBe("USD 10,000.00");

      const jpyDeal = Money.fromMajor(50000, "JPY");
      expect(formatMoney(jpyDeal)).toBe("¥50,000");
    });

    it("generates official Indian amount-in-words representation", () => {
      const m = Money.fromMajor(1234567.5, "INR");
      const inWords = amountInWordsIndian(m);
      expect(inWords).toBe(
        "Rupees Twelve Lakh Thirty-Four Thousand Five Hundred Sixty-Seven and Fifty Paise Only",
      );

      const small = Money.fromMajor(500, "INR");
      expect(amountInWordsIndian(small)).toBe("Rupees Five Hundred Only");
    });
  });
});
