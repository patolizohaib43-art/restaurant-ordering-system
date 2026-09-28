/**
 * Canonical digits-only form of a Pakistani mobile number so that
 * "0300-1234567", "+92 300 1234567" and "03001234567" all match.
 * Non-Pakistani/odd inputs fall back to plain digits.
 */
export function normalizePhone(phone: string): string {
  let d = phone.replace(/\D/g, '');
  if (d.startsWith('0092')) d = d.slice(4);
  else if (d.startsWith('92') && d.length >= 12) d = d.slice(2);
  if (d.length === 10 && d.startsWith('3')) d = '0' + d;
  return d;
}
