/**
 * Canonical KZ phone format: "+7XXXXXXXXXX" (country code + 10-digit national number).
 * Collapses the common input variants — "8xxxxxxxxxx", "7xxxxxxxxxx", bare 10-digit,
 * spaces/dashes/parentheses — into one form so the same person always maps to one Client.
 */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");

  let national: string;
  if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
    national = digits.slice(1);
  } else if (digits.length === 10) {
    national = digits;
  } else {
    return null;
  }

  return `+7${national}`;
}
