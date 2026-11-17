import type { ReactNode, SVGProps } from 'react';

export type ShareIconName =
  | 'spark'
  | 'route'
  | 'info'
  | 'compass'
  | 'copy'
  | 'shield'
  | 'check'
  | 'send'
  | 'left';

/** Shapes mirror the prototype icon set (`docs/prototype/ui.js`), 20×20 viewBox. */
function shape(name: ShareIconName): ReactNode {
  switch (name) {
    case 'spark':
      return (
        <>
          <path d="M10 2.4 11.7 7l4.6 1.7-4.6 1.7L10 15l-1.7-4.6L3.7 8.7 8.3 7z" />
          <path d="M15.6 13.2l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z" />
        </>
      );
    case 'route':
      return (
        <>
          <circle cx="5" cy="5" r="2.4" />
          <circle cx="15" cy="15" r="2.4" />
          <path d="M5 7.4v3.2a3 3 0 0 0 3 3h4.6" />
        </>
      );
    case 'info':
      return (
        <>
          <circle cx="10" cy="10" r="7.4" />
          <path d="M10 9.2v4.4M10 6.6v.1" />
        </>
      );
    case 'compass':
      return (
        <>
          <circle cx="10" cy="10" r="8" />
          <path d="m13.2 6.8-2 4.4-4.4 2 2-4.4z" />
        </>
      );
    case 'copy':
      return (
        <>
          <rect x="6.6" y="6.6" width="10" height="10" rx="2" />
          <path d="M13.4 6.6v-1a2 2 0 0 0-2-2h-6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h1" />
        </>
      );
    case 'shield':
      return (
        <>
          <path d="M10 2.6 3.8 5.2v4.4c0 3.6 2.6 6.6 6.2 7.8 3.6-1.2 6.2-4.2 6.2-7.8V5.2z" />
          <path d="m7.4 9.8 1.9 1.9 3.5-3.6" />
        </>
      );
    case 'check':
      return <path d="m4.4 10.4 3.6 3.6 7.6-8" />;
    case 'send':
      return <path d="M17.2 2.8 8.4 11.6M17.2 2.8l-5.6 14.4-3.2-5.6-5.6-3.2z" />;
    case 'left':
      return <path d="M12.4 4.6 7 10l5.4 5.4" />;
  }
}

const ICON_PROPS: SVGProps<SVGSVGElement> = {
  className: 'share-icon',
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export function ShareIcon({ name }: { name: ShareIconName }) {
  return <svg {...ICON_PROPS}>{shape(name)}</svg>;
}