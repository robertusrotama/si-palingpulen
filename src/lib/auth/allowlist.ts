/** True jika email sama dengan satu-satunya email yang diizinkan (tanpa beda huruf besar/kecil). */
export function isAllowedEmail(email: string, allowed: string): boolean {
  const a = allowed.trim().toLowerCase();
  return a !== '' && email.trim().toLowerCase() === a;
}
