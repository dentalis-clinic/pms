import { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = "", ...props }: InputProps) {
  return (
    <input
      className={`block w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-placeholder focus:border-border-focus focus:ring-1 focus:ring-focus-ring focus:outline-none ${className}`}
      {...props}
    />
  );
}
