interface CtaButtonProps {
  children: React.ReactNode;
  href?: string;
  size?: 'md' | 'lg';
  /**
   * `dark` (default) is the charcoal button used on the cream page background.
   * `light` inverts it to a cream button for use on dark backgrounds.
   */
  tone?: 'dark' | 'light';
  className?: string;
}

/**
 * Primary call to action with a trailing right-arrow icon. Defaults to a solid
 * charcoal button with cream text; the `light` tone flips it for dark sections.
 */
export default function CtaButton({
  children,
  href = '#/app',
  size = 'md',
  tone = 'dark',
  className = '',
}: CtaButtonProps) {
  const sizing =
    size === 'lg' ? 'px-6 py-3.5 text-base' : 'px-5 py-3 text-sm';

  const toning =
    tone === 'light'
      ? 'bg-paper text-charcoal hover:bg-white'
      : 'bg-charcoal text-paper hover:bg-black';

  return (
    <a
      href={href}
      className={`group inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors ${toning} ${sizing} ${className}`}
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
