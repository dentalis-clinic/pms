import { ReactNode } from "react";

interface FormFieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  missing?: boolean;
  children: ReactNode;
}

export function FormField({ label, htmlFor, hint, missing, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-text-label">
        {label}
        {missing && <span className="text-text-warning"> (missing)</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-text-hint">{hint}</p>}
    </div>
  );
}
