import { ButtonHTMLAttributes } from "react";

const variantStyles = {
  primary:
    "bg-brand-600 text-neutral-0 hover:bg-brand-700 focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:outline-none",
  secondary:
    "border border-neutral-300 bg-neutral-0 text-neutral-700 hover:bg-neutral-50",
  ghost:
    "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100",
  success:
    "border border-success-500/30 bg-neutral-0 text-success-700 hover:bg-success-50",
} as const;

const sizeStyles = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-3 py-2 text-sm",
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
  fullWidth?: boolean;
  loading?: boolean;
  loadingText?: string;
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  loadingText,
  className = "",
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`rounded-md font-medium disabled:cursor-not-allowed disabled:opacity-50 ${variantStyles[variant]} ${sizeStyles[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {loading ? (loadingText ?? children) : children}
    </button>
  );
}
