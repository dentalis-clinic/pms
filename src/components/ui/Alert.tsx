import { ReactNode } from "react";

const variantStyles = {
  error: "bg-error-50 text-error-600",
  success: "bg-success-50 text-success-700",
  warning: "bg-warning-50 text-warning-700",
  info: "bg-info-50 text-info-700",
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
