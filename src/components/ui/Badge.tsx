import { ReactNode, MouseEventHandler } from "react";

const variantStyles = {
  success: "bg-success-100 text-success-700",
  warning: "bg-warning-100 text-warning-700",
  info: "bg-info-100 text-info-700",
  brand: "bg-brand-100 text-brand-700",
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
