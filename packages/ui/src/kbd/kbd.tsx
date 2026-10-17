import * as React from 'react';
import { cn } from '../lib/utils';

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {}

export function Kbd({ className, children, ...props }: KbdProps) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5',
        'font-mono text-[10px] font-semibold uppercase tracking-wider',
        'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]',
        'border border-[var(--color-border-strong)] rounded shadow-sm select-none',
        className
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}
