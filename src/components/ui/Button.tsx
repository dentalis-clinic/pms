import { ButtonHTMLAttributes } from "react";

const variantStyles = {
  primary:
    "bg-interactive-primary text-text-inverse hover:bg-interactive-primary-hover focus:ring-2 focus:ring-focus-ring focus:ring-offset-2 focus:outline-none",
  secondary:
    "border border-border-secondary bg-surface-primary text-text-secondary hover:bg-surface-secondary hover:text-text-primary focus:ring-2 focus:ring-focus-ring focus:ring-offset-2 focus:outline-none",
  ghost:
    "text-text-hint hover:text-text-brand hover:bg-surface-tertiary focus:ring-2 focus:ring-focus-ring focus:ring-offset-2 focus:outline-none",
  success:
    "border border-border-success/30 bg-surface-primary text-text-success hover:bg-surface-success focus:ring-2 focus:ring-focus-ring focus:ring-offset-2 focus:outline-none",
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
