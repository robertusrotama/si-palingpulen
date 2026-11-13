import { BackLink } from '@/components/shell/BackLink';
import { NewFoodForm } from './NewFoodForm';

export default function NewFoodPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackLink href="/makanan" />
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Makanan baru</h1>
      </header>
      <NewFoodForm />
    </div>
  );
}
