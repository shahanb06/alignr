interface CtaButtonProps {
  children: React.ReactNode;
  href?: string;
  size?: 'md' | 'lg';
  className?: string;
}

/**
 * Solid black button with white text and a trailing right-arrow icon.
 * Used as the primary call to action across the landing page.
 */
export default function CtaButton({
  children,
  href = '#/app',
  size = 'md',
  className = '',
}: CtaButtonProps) {
  const sizing =
    size === 'lg' ? 'px-6 py-3.5 text-base' : 'px-5 py-3 text-sm';

  return (
    <a
      href={href}
      className={`group inline-flex items-center justify-center gap-2 rounded-lg bg-charcoal font-medium text-paper transition-colors hover:bg-black ${sizing} ${className}`}
    >
      {children}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-transform duration-200 group-hover:translate-x-0.5"
        aria-hidden="true"
      >
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </svg>
    </a>
  );
}
