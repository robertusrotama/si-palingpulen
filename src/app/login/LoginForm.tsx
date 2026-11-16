'use client';

import { startTransition, useActionState, type FormEvent } from 'react';
import { signInAction, type AuthState } from './actions';

export function LoginForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signInAction, { error: null });
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
      <input id="password" name="password" type="password" autoComplete="current-password" required className="field-input" />
      <button type="submit" className="btn navy" disabled={pending}>Masuk</button>
      {state.error && (
        <p role="alert" className="muted" style={{ margin: 0, fontSize: 14 }}>{state.error}</p>
      )}
    </form>
  );
}
