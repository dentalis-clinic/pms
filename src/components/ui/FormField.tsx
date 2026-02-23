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
      <label htmlFor={htmlFor} className="block text-sm font-medium text-neutral-700">
        {label}
        {missing && <span className="text-warning-500"> (missing)</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}
