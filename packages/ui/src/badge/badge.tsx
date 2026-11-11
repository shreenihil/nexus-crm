import * as React from "react";
import { cn } from "../lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "neutral" | "success" | "warning" | "danger" | "info" | "accent";
  icon?: React.ReactNode;
}

export function Badge({
  className,
  variant = "neutral",
  icon,
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    neutral:
      "bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border-[var(--color-border-default)]",
    success:
      "bg-[var(--color-status-success-bg)] text-[var(--color-status-success-text)] border-[var(--color-status-success-border)]",
    warning:
      "bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-text)] border-[var(--color-status-warning-border)]",
    danger:
      "bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger-text)] border-[var(--color-status-danger-border)]",
    info: "bg-[var(--color-status-info-bg)] text-[var(--color-status-info-text)] border-[var(--color-status-info-border)]",
    accent:
      "bg-[var(--color-accent-muted)] text-[var(--color-accent-primary)] border-[var(--color-accent-primary)]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border select-none",
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {icon && (
        <span className="h-3 w-3 shrink-0 flex items-center">{icon}</span>
      )}
      {children}
    </span>
  );
}
