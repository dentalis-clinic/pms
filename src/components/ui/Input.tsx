import { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = "", ...props }: InputProps) {
  return (
    <input
      className={`block w-full rounded-md border border-neutral-300 bg-neutral-0 px-3 py-2 text-sm text-neutral-950 placeholder:text-neutral-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none ${className}`}
      {...props}
    />
  );
}
