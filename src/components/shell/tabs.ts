export const TABS = [
  { href: '/', label: 'Hari Ini', icon: 'today' },
  { href: '/progres', label: 'Progres', icon: 'progress' },
  { href: '/catat', label: 'Catat', icon: 'plus' },
  { href: '/target', label: 'Target', icon: 'target' },
  { href: '/profil', label: 'Profil', icon: 'profile' },
] as const;

export function isActive(href: string, pathname: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}
