import Link from 'next/link';
import { Icon } from './icons';

export function BackLink({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} aria-label="Kembali" className="btn" style={{ width: 44, padding: 0 }}>
      <Icon name="back" size={18} strokeWidth={2} />
    </Link>
  );
}
