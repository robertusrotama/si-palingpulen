import Link from 'next/link';
import { MIN_PASSWORD_LENGTH } from '@/lib/auth/credentials';
import { SignupForm } from './SignupForm';

export default function SignupPage() {
  return (
    <main style={{ maxWidth: 420, margin: '0 auto', padding: '48px 16px' }}>
      <section className="panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>Daftar</h1>
        <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
          Buat akun dengan email dan kata sandi (minimal {MIN_PASSWORD_LENGTH} karakter).
        </p>
        <SignupForm />
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
          Sudah punya akun? <Link href="/login">Masuk</Link>
        </p>
      </section>
    </main>
  );
}
