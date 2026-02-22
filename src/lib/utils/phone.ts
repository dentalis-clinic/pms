/**
 * Normalize an Indian phone number to 10 digits.
 * Strips non-digits, removes +91/91 country code prefix.
 * Throws if the result isn't a valid 10-digit Indian mobile number.
 */
export function normalizePhoneNumber(input: string): string {
  const digits = input.replace(/\D/g, "");

  let phone: string;
  if (digits.length === 12 && digits.startsWith("91")) {
    phone = digits.slice(2);
  } else if (digits.length === 10) {
    phone = digits;
  } else {
    throw new Error(
      "Invalid phone number. Please enter a 10-digit Indian mobile number."
    );
  }

  if (!isValidIndianPhone(phone)) {
    throw new Error(
      "Invalid phone number. Must start with 6-9 and not be all the same digit."
    );
  }

  return phone;
}

/**
 * Validate that a 10-digit string is a plausible Indian mobile number.
 * - Must start with 6, 7, 8, or 9
 * - Must not be all the same digit (e.g., 9999999999)
 */
export function isValidIndianPhone(phone: string): boolean {
  if (phone.length !== 10) return false;
  if (!/^[6-9]/.test(phone)) return false;
  if (/^(\d)\1{9}$/.test(phone)) return false;
  return true;
}
