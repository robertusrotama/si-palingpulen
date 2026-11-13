'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { flush, pending } from '@/lib/offline/queue';
import { sendQueuedOp } from '@/app/(app)/sync/actions';

/** Menampilkan jumlah entri yang belum terkirim dan mengirim ulang saat online / saat dibuka. */
export function PendingBadge() {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const refresh = useCallback(() => { pending().then((p) => setCount(p.length)).catch(() => setCount(0)); }, []);
  const sync = useCallback(async () => {
    if (navigator.onLine === false) return;
    const r = await flush(sendQueuedOp).catch(() => null);
    if (r && r.sent > 0) router.refresh();
  }, [router]);

  useEffect(() => {
    const onChange = () => refresh();
    const onOnline = () => { void sync(); };
    window.addEventListener('spp-queue-changed', onChange);
    window.addEventListener('online', onOnline);
    void Promise.resolve().then(() => { refresh(); return sync(); });
    return () => {
      window.removeEventListener('spp-queue-changed', onChange);
      window.removeEventListener('online', onOnline);
    };
  }, [refresh, sync]);

  if (count === 0) return null;
  return (
    <div role="status" className="raised hatch" style={{ margin: '0 0 12px', padding: '8px 8px 8px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 18h10a4 4 0 0 0 .6-8A6 6 0 0 0 6.2 9 4.5 4.5 0 0 0 7 18z" /><path d="M3 3l18 18" /></svg>
      <span style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>{count} entri menunggu terkirim</span>
      <button type="button" className="btn" onClick={() => void sync()}>Kirim sekarang</button>
    </div>
  );
}
