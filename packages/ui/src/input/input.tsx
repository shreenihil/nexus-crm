import * as React from "react";
import { cn } from "../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = "text",
      label,
      error,
      helperText,
      prefixIcon,
      suffixIcon,
      id,
      ...props
    },
    ref,
  ) => {
    const inputId = id || React.useId();
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[var(--color-text-secondary)]"
          >
            {label}
            {props.required && (
              <span className="text-[var(--color-status-danger-text)] ml-1">
                *
              </span>
            )}
          </label>
        )}
        <div className="relative flex items-center">
          {prefixIcon && (
            <div className="absolute left-3 text-[var(--color-text-muted)] pointer-events-none flex items-center">
              {prefixIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            type={type}
            aria-invalid={!!error}
            aria-describedby={
              error ? errorId : helperText ? helperId : undefined
            }
            className={cn(
              "w-full h-[var(--density-input-height)] rounded-[6px] px-3 text-sm transition-colors duration-150",
              "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)]",
              "border border-[var(--color-border-default)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] focus:border-transparent",
              "disabled:opacity-50 disabled:bg-[var(--color-bg-subtle)] disabled:cursor-not-allowed",
              error &&
                "border-[var(--color-status-danger-border)] focus:ring-[var(--color-status-danger-border)]",
              prefixIcon && "pl-9",
              suffixIcon && "pr-9",
              className,
            )}
            {...props}
          />
          {suffixIcon && (
            <div className="absolute right-3 text-[var(--color-text-muted)] flex items-center">
              {suffixIcon}
            </div>
          )}
        </div>
        {error && (
          <p
            id={errorId}
            className="text-xs font-medium text-[var(--color-status-danger-text)]"
          >
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={helperId} className="text-xs text-[var(--color-text-muted)]">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
