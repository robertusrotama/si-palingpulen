'use client';

import { useActionState } from 'react';
import { requestMagicLink, type LoginState } from './actions';

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(requestMagicLink, { sent: false });
  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <label htmlFor="email" className="label">Email</label>
      <input id="email" name="email" type="email" autoComplete="email" required className="field-input" />
      <button type="submit" className="btn navy" disabled={pending}>Kirim link masuk</button>
      {state.sent && (
        <p role="status" className="muted" style={{ margin: 0, fontSize: 14 }}>
          Kalau email terdaftar, link masuk sudah dikirim.
        </p>
      )}
    </form>
  );
}
