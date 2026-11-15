import type { ReactNode } from 'react';

type Props = {
  title: string;
  text: string;
  children?: ReactNode;
};

export function EmptyState({ title, text, children }: Props) {
  return (
    <div className="empty">
      <span className="empty-icon" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </svg>
      </span>
      <p className="empty-title">{title}</p>
      <p className="empty-text">{text}</p>
      {children}
    </div>
  );
}