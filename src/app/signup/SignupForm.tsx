'use client';

import { startTransition, useActionState, type FormEvent } from 'react';
import { MIN_PASSWORD_LENGTH } from '@/lib/auth/credentials';
import type { AuthState } from '../login/actions';
import { signUpAction } from './actions';

export function SignupForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUpAction, { error: null });
  // Kirim lewat onSubmit, bukan prop `action`: prop `action` membuat React mengosongkan form setelah submit,
  // jadi email ikut hilang setiap kali muncul error.
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => action(data));
  }
  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <label htmlFor="email" className="label">Email</label>
      <input id="email" name="email" type="email" autoComplete="email" required className="field-input" />
      <label htmlFor="password" className="label">Kata sandi</label>
      <input id="password" name="password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required className="field-input" />
      <label htmlFor="confirm" className="label">Ulangi kata sandi</label>
      <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required className="field-input" />
      <button type="submit" className="btn navy" disabled={pending}>Daftar</button>
      {state.error && (
        <p role="alert" className="muted" style={{ margin: 0, fontSize: 14 }}>{state.error}</p>
      )}
    </form>
  );
}
