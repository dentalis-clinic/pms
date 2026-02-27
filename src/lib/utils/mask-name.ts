/**
 * Masks a full name for privacy on the public booking form.
 * Each word: first letter + underscores + last letter.
 * Words ≤2 chars: first letter + underscore.
 *
 * "Shakeb Khan" → "S____b K__n"
 * "Li Wei"      → "L_ W_i"
 */
export function maskName(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .map((part) => {
      if (part.length <= 1) return part;
      if (part.length === 2) return part[0] + "_";
      return part[0] + "_".repeat(part.length - 2) + part[part.length - 1];
    })
    .join(" ");
}
