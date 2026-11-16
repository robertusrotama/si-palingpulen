'use client';

import { useActionState } from 'react';
import { MIN_PASSWORD_LENGTH } from '@/lib/auth/credentials';
import { setPasswordAction, type PasswordState } from './actions';

/** Mengatur atau mengganti kata sandi. Akun lama dari magic link belum punya kata sandi. */
export function PasswordForm() {
  const [state, action, pending] = useActionState<PasswordState, FormData>(setPasswordAction, { error: null, saved: false });
  return (
    <section className="panel" aria-label="Kata sandi" style={{ padding: 16 }}>
      <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 className="label" style={{ margin: 0 }}>Kata sandi</h2>
        <label htmlFor="new-password" className="label">Kata sandi baru</label>
        <input id="new-password" name="password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required className="field-input" />
        <label htmlFor="confirm-password" className="label">Ulangi kata sandi baru</label>
        <input id="confirm-password" name="confirm" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required className="field-input" />
        <button type="submit" className="btn" disabled={pending}>Simpan kata sandi</button>
        {state.error && <p role="alert" className="muted" style={{ margin: 0, fontSize: 14 }}>{state.error}</p>}
        {state.saved && <p role="status" className="muted" style={{ margin: 0, fontSize: 14 }}>Kata sandi tersimpan.</p>}
      </form>
    </section>
  );
}
