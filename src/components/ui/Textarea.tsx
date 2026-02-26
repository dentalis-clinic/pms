import { TextareaHTMLAttributes } from "react";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className = "", ...props }: TextareaProps) {
  return (
    <textarea
      className={`block w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-placeholder focus:border-border-focus focus:ring-1 focus:ring-focus-ring focus:outline-none ${className}`}
      {...props}
    />
  );
}
