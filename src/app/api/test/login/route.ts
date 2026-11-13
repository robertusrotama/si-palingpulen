import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';

const PASSWORD = 'e2e-only-password-123';

/** Login khusus tes E2E. Hanya aktif saat E2E=1; selain itu 404. */
export async function POST(req: Request) {
  if (process.env.E2E !== '1') return new NextResponse('Not found', { status: 404 });
  const { email } = (await req.json().catch(() => ({}))) as { email?: string };
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });
  const admin = createAdminSupabase();
  const created = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (created.error && !/already/i.test(created.error.message)) {
    return NextResponse.json({ error: created.error.message }, { status: 500 });
  }
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ userId: data.user.id });
}
