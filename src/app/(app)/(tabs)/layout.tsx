import { BottomNav } from '@/components/shell/BottomNav';
import { SideRail } from '@/components/shell/SideRail';

/** Layar utama: navbar bawah di HP, rel kiri di desktop (spec F11). */
export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', padding: '0 0 0 0', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ paddingLeft: 24, paddingTop: 24 }} className="only-desktop"><SideRail /></div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
        <main style={{ flex: 1, padding: '20px 16px 16px', maxWidth: 1240, width: '100%' }}>{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
