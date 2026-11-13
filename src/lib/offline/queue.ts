import { openDB, type IDBPDatabase } from 'idb';

export type QueuedOp = {
  clientId: string;
  kind: 'food_entries' | 'water_entry' | 'weight_entry';
  payload: unknown;
  createdAt: string;
  attempts: number;
};
export type SendResult = 'ok' | 'retry' | 'drop';

const DB_NAME = 'spp-queue';
const STORE = 'ops';
let dbPromise: Promise<IDBPDatabase> | null = null;
let flushing: Promise<{ sent: number; remaining: number }> | null = null;

function db() {
  dbPromise ??= openDB(DB_NAME, 1, {
    upgrade(d) {
      d.createObjectStore(STORE, { keyPath: 'clientId' });
    },
  });
  return dbPromise;
}

function changed() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('spp-queue-changed'));
}

/** Menyimpan operasi yang gagal terkirim. clientId sama = satu item. */
export async function enqueue(op: Omit<QueuedOp, 'attempts'>): Promise<void> {
  const d = await db();
  const existing = (await d.get(STORE, op.clientId)) as QueuedOp | undefined;
  await d.put(STORE, { ...op, attempts: existing?.attempts ?? 0 });
  changed();
}

export async function pending(): Promise<QueuedOp[]> {
  const all = (await (await db()).getAll(STORE)) as QueuedOp[];
  return all.sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
}

export async function clearQueue(): Promise<void> {
  await (await db()).clear(STORE);
  changed();
}

async function doFlush(send: (op: QueuedOp) => Promise<SendResult>) {
  const d = await db();
  let sent = 0;
  for (const op of await pending()) {
    let result: SendResult;
    try {
      result = await send(op);
    } catch {
      result = 'retry';
    }
    if (result === 'retry') {
      await d.put(STORE, { ...op, attempts: op.attempts + 1 });
      break; // jaga urutan: jangan lompati item yang gagal
    }
    await d.delete(STORE, op.clientId);
    if (result === 'ok') sent++;
  }
  changed();
  return { sent, remaining: (await pending()).length };
}

/** Mengirim antrean berurutan. Panggilan bersamaan menunggu flush yang sedang berjalan. */
export function flush(send: (op: QueuedOp) => Promise<SendResult>): Promise<{ sent: number; remaining: number }> {
  flushing ??= doFlush(send).finally(() => {
    flushing = null;
  });
  return flushing;
}
