'use client';

import { useEffect, useState } from 'react';
import { NumberField } from '@/components/form/NumberField';
import { Switch } from '@/components/profile/Switch';
import { fmt } from '@/lib/format';
import { validateScan, type ScanError, type ScanInput, type ScanWarning } from '@/lib/validation/body';
import { saveScanAction } from './actions';

type K = keyof ScanInput;
const SEGMENTS: [string, K, K][] = [
  ['lengan kanan', 'armRMuscleKg', 'armRFatKg'], ['lengan kiri', 'armLMuscleKg', 'armLFatKg'], ['torso', 'torsoMuscleKg', 'torsoFatKg'],
  ['kaki kanan', 'legRMuscleKg', 'legRFatKg'], ['kaki kiri', 'legLMuscleKg', 'legLFatKg'],
];
const METRICS: [string, K][] = [
  ['Berat (kg)', 'weightKg'], ['BMI', 'bmi'], ['Fat mass (kg)', 'fatMassKg'], ['% lemak', 'bfPct'], ['% otot', 'musclePct'],
  ['% lainnya', 'otherPct'], ['Visceral', 'visceralFat'], ['WHR', 'whr'], ['BMR (kkal)', 'bmrKcal'], ['Body age', 'bodyAge'], ['Skor BCM', 'bcmScore'],
];
const ERROR_TEXT: Record<ScanError, string> = {
  bf_out_of_range: '% lemak harus 3 sampai 60.',
  composition_sum: 'Komposisi otot + lemak + lainnya harus sekitar 100%.',
  fat_mass_mismatch: 'Fat mass tidak cocok dengan berat × % lemak.',
  weight_out_of_range: 'Berat harus 30 sampai 200 kg.',
};
const WARNING_TEXT: Record<ScanWarning, string> = {
  bf_jump: '% lemak berubah lebih dari 3 poin dari scan sebelumnya.',
  weight_jump: 'Berat berubah lebih dari 3 kg dari scan sebelumnya.',
};

export function ScanForm({ today, prev }: { today: string; prev: ScanInput | null }) {
  const [vals, setVals] = useState<Partial<Record<K, number | null>>>({});
  const [date, setDate] = useState(today);
  const [time, setTime] = useState('');
  const [fasted, setFasted] = useState(true);
  const [post, setPost] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo); }, [photo]);

  const set = (k: K) => (v: number | null) => setVals((s) => ({ ...s, [k]: v }));
  const complete = vals.weightKg != null && vals.fatMassKg != null && vals.bfPct != null;
  const scan = Object.fromEntries([...METRICS.map(([, k]) => k), ...SEGMENTS.flatMap(([, a, b]) => [a, b])].map((k) => [k, vals[k] ?? null])) as unknown as ScanInput;
  const check = complete ? validateScan(scan, prev) : { errors: [], warnings: [] };
  const sum = vals.musclePct != null && vals.bfPct != null && vals.otherPct != null ? vals.musclePct + vals.bfPct + vals.otherPct : null;

  return (
    <form onSubmit={(e) => { e.preventDefault(); setBusy(true); void saveScanAction({ scan, date, time, fasted, postWorkout: post }); }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <section className="panel" aria-label="Kondisi saat scan" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}><span className="label">Tanggal</span><input type="date" className="field-input" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}><span className="label">Jam</span><input type="time" className="field-input" value={time} onChange={(e) => setTime(e.target.value)} /></label>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontWeight: 600 }}>Puasa, belum makan</span><Switch label="Puasa" checked={fasted} onChange={setFasted} /></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontWeight: 600 }}>Habis latihan</span><Switch label="Habis latihan" checked={post} onChange={setPost} /></div>
      </section>

      <section className="panel" aria-label="Foto laporan" style={{ padding: 14, display: 'flex', gap: 14, alignItems: 'center' }}>
        <div className="inset" style={{ width: 92, height: 124, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '2px dashed #B9C3CF' }}>
          {photo
            // eslint-disable-next-line @next/next/no-img-element -- object URL lokal, tidak lewat optimasi gambar
            ? <img src={photo} alt="Foto laporan scan" width={92} height={124} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
            : <span className="muted" style={{ fontSize: 12, fontWeight: 600, textAlign: 'center' }}>Pratinjau foto</span>}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontWeight: 700 }}>Foto laporan gym</span>
          <span className="muted" style={{ fontSize: 13, lineHeight: 1.4 }}>Hanya tampil di sini sebagai pembanding. Tidak di-upload, hilang saat layar ditutup.</span>
          <label className="btn" style={{ alignSelf: 'flex-start' }}>
            Pilih foto
            <input type="file" accept="image/*" aria-label="Pilih foto" style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setPhoto(URL.createObjectURL(f)); }} />
          </label>
        </div>
      </section>

      <section className="panel" aria-label="Per segmen tubuh" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 className="label" style={{ margin: 0 }}>Per segmen (kg)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          {SEGMENTS.flatMap(([name, m, f]) => [
            <NumberField key={m} label={`Otot ${name}`} value={vals[m] ?? null} onChange={set(m)} />,
            <NumberField key={f} label={`Lemak ${name}`} value={vals[f] ?? null} onChange={set(f)} />,
          ])}
        </div>
      </section>

      <section className="panel" aria-label="Metrik utama" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 className="label" style={{ margin: 0 }}>Metrik</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
          {METRICS.map(([l, k]) => <NumberField key={k} label={l} value={vals[k] ?? null} onChange={set(k)} required={['weightKg', 'fatMassKg', 'bfPct'].includes(k)} />)}
        </div>
      </section>

      <div className="raised hatch" role="status" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 600 }}>
        {!complete && <span>Isi berat, fat mass, dan % lemak untuk menyimpan.</span>}
        {check.errors.map((e) => <span key={e} style={{ color: '#a33a10' }}>{ERROR_TEXT[e]}</span>)}
        {check.warnings.map((w) => <span key={w}>{WARNING_TEXT[w]}</span>)}
        {complete && sum != null && !check.errors.includes('composition_sum') && <span>Komposisi total {fmt(sum, 1).includes(',') ? fmt(sum, 1) : `${fmt(sum, 1)},0`}%</span>}
        {complete && !check.errors.includes('fat_mass_mismatch') && <span>Fat mass cocok dengan % lemak</span>}
      </div>

      <button type="submit" className="btn navy" style={{ minHeight: 52, fontSize: 16 }} disabled={!complete || check.errors.length > 0 || busy}>
        {check.warnings.length ? 'Simpan tetap' : 'Simpan scan'}
      </button>
    </form>
  );
}
