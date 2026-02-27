"use client";

import { FormField, Input } from "@/components/ui";

interface PhoneStepProps {
  phone: string;
  onPhoneChange: (value: string) => void;
  checking: boolean;
  disabled: boolean;
  locked: boolean;
  onUnlock: () => void;
}

export function PhoneStep({
  phone,
  onPhoneChange,
  checking,
  disabled,
  locked,
  onUnlock,
}: PhoneStepProps) {
  return (
    <FormField label="Phone Number" htmlFor="phone">
      <div className="relative">
        <Input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          required
          autoComplete="tel"
          placeholder="Enter your 10-digit mobile number"
          disabled={disabled || locked}
          className={locked ? "pr-20" : ""}
        />
        {checking && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          </div>
        )}
        {locked && !checking && (
          <button
            type="button"
            onClick={onUnlock}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-text-brand hover:underline"
          >
            Change
          </button>
        )}
      </div>
    </FormField>
  );
}
