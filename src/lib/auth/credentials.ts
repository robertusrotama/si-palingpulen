export const MIN_PASSWORD_LENGTH = 8;

/** Mengembalikan pesan error untuk kata sandi baru, atau null jika valid. */
export function validateNewPassword(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Kata sandi minimal ${MIN_PASSWORD_LENGTH} karakter.`;
  if (password !== confirm) return 'Konfirmasi kata sandi tidak sama.';
  return null;
}

/** Mengembalikan pesan error untuk isian daftar, atau null jika valid. */
export function validateSignup(email: string, password: string, confirm: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Email tidak valid.';
  return validateNewPassword(password, confirm);
}
