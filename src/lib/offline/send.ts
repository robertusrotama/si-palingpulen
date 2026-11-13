'use client';

import { enqueue, type QueuedOp } from './queue';
import { sendQueuedOp } from '@/app/(app)/sync/actions';

/** Kirim langsung; jika gagal karena jaringan, simpan di antrean. Hasil 'queued' berarti akan dikirim ulang otomatis. */
export async function sendOrQueue(op: Omit<QueuedOp, 'attempts' | 'createdAt'>): Promise<'sent' | 'queued' | 'invalid'> {
  const full = { ...op, createdAt: new Date().toISOString() };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    await enqueue(full);
    return 'queued';
  }
  try {
    const r = await sendQueuedOp({ ...full, attempts: 0 });
    if (r === 'ok') return 'sent';
    if (r === 'drop') return 'invalid';
    await enqueue(full);
    return 'queued';
  } catch {
    await enqueue(full);
    return 'queued';
  }
}
