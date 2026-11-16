import Link from 'next/link';
import { LoginForm } from './LoginForm';

export default function LoginPage() {
  return (
    <main style={{ maxWidth: 420, margin: '0 auto', padding: '48px 16px' }}>
      <section className="panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>Masuk</h1>
        <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
          Masuk dengan email dan kata sandi kamu.
        </p>
        <LoginForm />
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
          Belum punya akun? <Link href="/signup">Daftar</Link>
        </p>
      </section>
    </main>
  );
}
