'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './icons';
import { TABS, isActive } from './tabs';

export function SideRail() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigasi utama" data-testid="side-rail" className="panel only-desktop"
      style={{ position: 'sticky', top: 24, flexDirection: 'column', alignItems: 'center', gap: 8, padding: '14px 10px', borderRadius: 26, width: 96, flex: 'none' }}>
      <Link href="/catat" aria-label="Catat makanan" className="btn navy" style={{ width: 72, height: 64, padding: 0, borderRadius: 18 }}>
        <Icon name="plus" size={24} strokeWidth={2.4} />
      </Link>
      {TABS.filter((t) => t.href !== '/catat').map((t) => {
        const active = isActive(t.href, pathname);
        return (
          <Link key={t.href} href={t.href} aria-current={active ? 'page' : undefined} className={active ? 'inset' : undefined}
            style={{ width: 72, minHeight: 64, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 16, textDecoration: 'none', fontSize: 12, fontWeight: active ? 700 : 600, color: active ? 'var(--ink)' : 'var(--nav-muted)' }}>
            <Icon name={t.icon} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
