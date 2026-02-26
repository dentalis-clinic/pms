import { ReactNode } from "react";

const variantStyles = {
  error: "bg-surface-error text-text-error",
  success: "bg-surface-success text-text-success",
  warning: "bg-surface-warning text-text-warning",
  info: "bg-surface-info text-text-info",
} as const;

interface AlertProps {
  variant: keyof typeof variantStyles;
  children: ReactNode;
  className?: string;
}

export function Alert({ variant, children, className = "" }: AlertProps) {
  return (
    <div className={`rounded-md px-3 py-2 text-sm ${variantStyles[variant]} ${className}`}>
      {children}
    </div>
  );
}
