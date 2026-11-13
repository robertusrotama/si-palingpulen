'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './icons';
import { TABS, isActive } from './tabs';

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigasi utama" data-testid="bottom-nav" className="panel only-phone"
      style={{ position: 'sticky', bottom: 12, margin: '0 12px 12px', padding: 8, borderRadius: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', alignItems: 'center', gap: 2 }}>
        {TABS.map((t) => {
          const active = isActive(t.href, pathname);
          if (t.href === '/catat') {
            return (
              <Link key={t.href} href={t.href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minHeight: 56, justifyContent: 'center', textDecoration: 'none', color: 'var(--ink)' }}>
                <span className="btn navy" style={{ width: 52, height: 52, padding: 0, borderRadius: '50%' }}>
                  <Icon name="plus" strokeWidth={2.4} />
                </span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{t.label}</span>
              </Link>
            );
          }
          return (
            <Link key={t.href} href={t.href} aria-current={active ? 'page' : undefined} className={active ? 'inset' : undefined}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 56, textDecoration: 'none', borderRadius: 16, color: active ? 'var(--ink)' : 'var(--nav-muted)' }}>
              <Icon name={t.icon} />
              <span style={{ fontSize: 12, fontWeight: active ? 700 : 600 }}>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
