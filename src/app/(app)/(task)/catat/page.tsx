import { BackLink } from '@/components/shell/BackLink';

export default function CatatPage() {
  return (
    <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <BackLink />
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Catat makanan</h1>
    </header>
  );
}
