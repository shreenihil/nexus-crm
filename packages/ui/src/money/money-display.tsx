import * as React from 'react';
import { Money, formatMoney, formatCompactMoney, amountInWordsIndian } from '@nexus/schema';
import { cn } from '../lib/utils';

export interface MoneyDisplayProps extends React.HTMLAttributes<HTMLSpanElement> {
  money?: Money;
  amount?: number; // In subunits if isSubunits is true, or major units if false
  currency?: string;
  isSubunits?: boolean;
  compact?: boolean;
  showWords?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const MoneyDisplay = React.forwardRef<HTMLSpanElement, MoneyDisplayProps>(
  (
    {
      money,
      amount = 0,
      currency = 'INR',
      isSubunits = true,
      compact = false,
      showWords = false,
      size = 'md',
      className,
      ...props
    },
    ref
  ) => {
    const moneyObj = React.useMemo(() => {
      if (money) return money;
      const cleanCurrency = currency.toUpperCase();
      if (isSubunits) {
        return Money.fromSubunits(Math.round(amount), cleanCurrency);
      } else {
        return Money.fromMajor(amount, cleanCurrency);
      }
    }, [money, amount, currency, isSubunits]);

    const formattedText = React.useMemo(() => {
      if (compact) {
        return formatCompactMoney(moneyObj);
      }
      return formatMoney(moneyObj);
    }, [moneyObj, compact]);

    const wordsText = React.useMemo(() => {
      if (!showWords) return null;
      return amountInWordsIndian(moneyObj);
    }, [moneyObj, showWords]);

    const sizeClasses = {
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg font-semibold',
      xl: 'text-xl font-bold tracking-tight',
      '2xl': 'text-2xl font-extrabold tracking-tight',
    };

    return (
      <span
        ref={ref}
        className={cn('inline-flex flex-col', className)}
        title={wordsText || formatMoney(moneyObj)}
        {...props}
      >
        <span
          className={cn(
            'font-mono tabular-nums tracking-tight text-[var(--color-text-primary)]',
            sizeClasses[size]
          )}
          aria-label={`${moneyObj.currency} ${moneyObj.toMajor()}`}
        >
          {formattedText}
        </span>
        {wordsText && (
          <span className="text-[11px] font-sans font-medium text-[var(--color-text-muted)] italic">
            {wordsText}
          </span>
        )}
      </span>
    );
  }
);

MoneyDisplay.displayName = 'MoneyDisplay';
