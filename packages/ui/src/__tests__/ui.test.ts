import { describe, it, expect } from 'vitest';
import { cn } from '../lib/utils';
import { Money, formatMoney, formatCompactMoney } from '@nexus/schema';

describe('UI Utilities and Primitives', () => {
  it('cn merges Tailwind and conditional classes correctly', () => {
    const result = cn('px-4 py-2', false && 'hidden', true && 'text-sm', 'bg-red-500');
    expect(result).toContain('px-4');
    expect(result).toContain('py-2');
    expect(result).toContain('text-sm');
    expect(result).not.toContain('hidden');
  });

  it('MoneyDisplay component renders Indian Lakh/Crore and compact notation correctly', () => {
    const m = Money.fromSubunits(123456750, 'INR');
    expect(formatMoney(m)).toBe('₹12,34,567.50');
    expect(formatCompactMoney(m)).toBe('₹12.35 L');
  });
});
