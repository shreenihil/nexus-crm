import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { Loader2 } from "lucide-react";
import { cn } from "../lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      asChild = false,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    const variantStyles = {
      primary:
        "bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-hover)] active:bg-[var(--color-accent-active)] text-[var(--color-accent-text)] border border-transparent shadow-sm",
      secondary:
        "bg-[var(--color-bg-subtle)] hover:bg-[var(--color-bg-elevated)] active:bg-[var(--color-bg-canvas)] text-[var(--color-text-primary)] border border-[var(--color-border-default)] shadow-sm",
      outline:
        "bg-transparent hover:bg-[var(--color-bg-subtle)] active:bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] border border-[var(--color-border-strong)]",
      ghost:
        "bg-transparent hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-primary)] border border-transparent",
      danger:
        "bg-[var(--color-status-danger-bg)] hover:opacity-90 text-[var(--color-status-danger-text)] border border-[var(--color-status-danger-border)] shadow-sm",
    };

    const sizeStyles = {
      sm: "h-8 px-2.5 text-xs rounded-[4px] gap-1.5",
      md: "h-[var(--density-btn-height)] px-3.5 text-sm rounded-[6px] gap-2",
      lg: "h-11 px-5 text-base rounded-[8px] gap-2.5",
      icon: "h-9 w-9 p-0 rounded-[6px] justify-center",
    };

    return (
      <Comp
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-canvas)]",
          "disabled:opacity-50 disabled:cursor-not-allowed select-none",
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </Comp>
    );
  },
);

Button.displayName = "Button";
