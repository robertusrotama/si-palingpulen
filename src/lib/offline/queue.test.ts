import 'fake-indexeddb/auto';
import { beforeEach, expect, test } from 'vitest';
import { clearQueue, enqueue, flush, pending, type QueuedOp } from './queue';

const op = (n: number): Omit<QueuedOp, 'attempts'> => ({
  clientId: `00000000-0000-4000-8000-00000000000${n}`, kind: 'water_entry', payload: { ml: n }, createdAt: `2026-11-12T00:00:0${n}Z`,
});

beforeEach(async () => {
  await clearQueue();
});

test("'ok' empties the queue", async () => {
  await enqueue(op(1));
  await enqueue(op(2));
  expect(await flush(async () => 'ok')).toEqual({ sent: 2, remaining: 0 });
  expect(await pending()).toEqual([]);
});

test("'retry' keeps the item and counts the attempt", async () => {
  await enqueue(op(1));
  expect(await flush(async () => 'retry')).toEqual({ sent: 0, remaining: 1 });
  expect((await pending())[0].attempts).toBe(1);
});

test("'drop' removes the item", async () => {
  await enqueue(op(1));
  await flush(async () => 'drop');
  expect(await pending()).toEqual([]);
});

test('sends in createdAt order', async () => {
  await enqueue(op(3));
  await enqueue(op(1));
  await enqueue(op(2));
  const seen: string[] = [];
  await flush(async (o) => { seen.push(o.createdAt); return 'ok'; });
  expect(seen).toEqual(['2026-11-12T00:00:01Z', '2026-11-12T00:00:02Z', '2026-11-12T00:00:03Z']);
});

test('a network error is treated as retry and keeps the rest', async () => {
  await enqueue(op(1));
  await enqueue(op(2));
  const r = await flush(async () => { throw new TypeError('Failed to fetch'); });
  expect(r).toEqual({ sent: 0, remaining: 2 });
});

test('enqueueing the same clientId twice keeps one item', async () => {
  await enqueue(op(1));
  await enqueue(op(1));
  expect(await pending()).toHaveLength(1);
});

test('concurrent flushes send each item once (Review Focus 3)', async () => {
  await enqueue(op(1));
  let sends = 0;
  const send = async () => { sends++; await new Promise((r) => setTimeout(r, 10)); return 'ok' as const; };
  await Promise.all([flush(send), flush(send)]);
  expect(sends).toBe(1);
});
