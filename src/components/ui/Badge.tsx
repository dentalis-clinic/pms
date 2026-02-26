import { ReactNode, MouseEventHandler } from "react";

const variantStyles = {
  success: "bg-surface-success-subtle text-text-success",
  warning: "bg-surface-warning-subtle text-text-warning",
  info: "bg-surface-info-subtle text-text-info",
  brand: "bg-surface-brand-subtle text-text-brand",
  error: "bg-surface-error-subtle text-text-error",
  neutral: "bg-surface-tertiary text-text-secondary",
} as const;

interface BadgeProps {
  variant: keyof typeof variantStyles;
  children: ReactNode;
  interactive?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  className?: string;
}

export function Badge({ variant, children, interactive, onClick, className = "" }: BadgeProps) {
  const base = `inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${variantStyles[variant]} ${className}`;

  if (interactive || onClick) {
    return (
      <button type="button" onClick={onClick} className={`${base} hover:opacity-80`}>
        {children}
      </button>
    );
  }

  return <span className={base}>{children}</span>;
}
