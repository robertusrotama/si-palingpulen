import type { SVGProps } from 'react';

type IconName = 'today' | 'progress' | 'plus' | 'target' | 'profile' | 'back';

const PATHS: Record<IconName, React.ReactNode> = {
  today: (<><circle cx="12" cy="12" r="8.5" /><path d="M12 12l3.5-3.5" /></>),
  progress: (<><path d="M4 19h16" /><path d="M6 15l4-5 3 3 5-7" /></>),
  plus: <path d="M12 5v14M5 12h14" />,
  target: (<><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" /></>),
  profile: (<><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>),
  back: <path d="M15 6l-6 6 6 6" />,
};

export function Icon({ name, size = 22, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {PATHS[name]}
    </svg>
  );
}
