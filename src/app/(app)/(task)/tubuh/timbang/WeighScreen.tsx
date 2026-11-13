'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WeightRuler } from '@/components/body/WeightRuler';
import { Switch } from '@/components/profile/Switch';
import { fmt } from '@/lib/format';
import { sendOrQueue } from '@/lib/offline/send';
import { useHaptics } from '@/lib/useHaptics';
import { validateWeight } from '@/lib/validation/body';

export function WeighScreen({ initialKg, trendKg, today, hapticsEnabled }: { initialKg: number; trendKg: number | null; today: string; hapticsEnabled: boolean | null }) {
  const router = useRouter();
  const [kg, setKg] = useState(initialKg);
  const [fasted, setFasted] = useState(true);
  const [busy, setBusy] = useState(false);
  const [queued, setQueued] = useState(false);
  const haptic = useHaptics(hapticsEnabled);
  const v = validateWeight(kg, trendKg);
  const diff = trendKg == null ? null : Math.round((kg - trendKg) * 10) / 10;
  const kgText = fmt(kg, 1).includes(',') ? fmt(kg, 1) : `${fmt(kg, 1)},0`;

  function change(next: number) {
    haptic(kg, next);
    setKg(next);
  }

  async function save() {
    setBusy(true);
    const clientId = crypto.randomUUID();
    const r = await sendOrQueue({ clientId, kind: 'weight_entry', payload: { clientId, date: today, measuredAt: new Date().toISOString(), weightKg: kg, condition: fasted ? 'fasted' : 'fed' } });
    if (r === 'sent') router.push('/');
    else { setQueued(r === 'queued'); setBusy(false); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <section className="panel" aria-label="Berat badan" style={{ padding: '22px 16px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <span className="label">Berat pagi ini</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span data-testid="weight-value" style={{ fontSize: 56, fontWeight: 700, lineHeight: 1 }}>{kgText}</span>
          <span className="muted" style={{ fontSize: 20, fontWeight: 600 }}>kg</span>
        </div>
        {diff != null && (
          <span className="inset" style={{ padding: '5px 12px', fontSize: 13, fontWeight: 600 }}>
            {diff === 0 ? 'Sama dengan tren' : `${diff > 0 ? '+' : '−'}${fmt(Math.abs(diff), 1)} kg dari tren ${fmt(trendKg!, 1)}`}
          </span>
        )}
        <WeightRuler valueKg={kg} onChange={change} />
        {v.warnings.length > 0 && (
          <div className="raised hatch" role="alert" style={{ width: '100%', padding: '10px 12px', fontSize: 14, fontWeight: 600 }}>
            Beda lebih dari 3% dari tren. Yakin angkanya benar?
          </div>
        )}
      </section>
      <section className="panel" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontWeight: 600 }}>Puasa, belum makan</span>
        <Switch label="Puasa, belum makan" checked={fasted} onChange={setFasted} />
      </section>
      {queued && <p role="status" style={{ margin: 0, fontWeight: 600 }}>Disimpan di HP, dikirim otomatis saat online.</p>}
      <button type="button" className="btn navy" style={{ minHeight: 52, fontSize: 16 }} disabled={busy || v.errors.length > 0} onClick={save}>Simpan {kgText} kg</button>
    </div>
  );
}
