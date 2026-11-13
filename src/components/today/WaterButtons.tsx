'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NumberField } from '../form/NumberField';
import { fmt } from '@/lib/format';
import { addWaterAction } from '@/app/(app)/(tabs)/actions';

export function WaterButtons({ date, waterMl, targetMl }: { date: string; waterMl: number; targetMl: number | null }) {
  const router = useRouter();
  const [custom, setCustom] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const pct = targetMl ? Math.min(1, waterMl / targetMl) : 0;
  async function add(ml: number) {
    await addWaterAction({ clientId: crypto.randomUUID(), date, loggedAt: new Date().toISOString(), ml });
    router.refresh();
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span className="label">Air minum</span>
        <span data-testid="water-total" style={{ fontSize: 14, fontWeight: 600 }}>{fmt(waterMl)}{targetMl ? ` / ${fmt(targetMl)}` : ''} ml</span>
      </div>
      <div className="inset" style={{ height: 22, padding: 4, borderRadius: 11 }}>
        <div style={{ width: `${pct * 100}%`, height: 14, borderRadius: 7, background: 'linear-gradient(180deg, #A9CDEB 0%, #5E95C6 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.6)' }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn" style={{ flex: 1, padding: '0 8px' }} onClick={() => add(250)}>+250 ml</button>
        <button type="button" className="btn" style={{ flex: 1, padding: '0 8px' }} onClick={() => add(500)}>+500 ml</button>
        <button type="button" className="btn" style={{ flex: 1, padding: '0 8px' }} aria-expanded={open} onClick={() => setOpen((o) => !o)}>Lainnya</button>
      </div>
      {open && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <NumberField label="Jumlah air (ml)" value={custom} onChange={setCustom} style={{ flex: 1 }} />
          <button type="button" className="btn navy" disabled={!custom || custom <= 0} onClick={() => custom && add(custom).then(() => setOpen(false))}>Tambah</button>
        </div>
      )}
    </div>
  );
}
