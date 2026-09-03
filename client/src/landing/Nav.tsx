import { useState } from 'react';
import CtaButton from './CtaButton';

const LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Why Alignr', href: '#why' },
  { label: 'FAQ', href: '#faq' },
];

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-charcoal/5 bg-paper/80 backdrop-blur">
      <nav className="mx-auto grid max-w-6xl grid-cols-[auto_1fr] items-center gap-4 px-5 py-2 sm:px-8 md:grid-cols-[1fr_auto_1fr] md:gap-6">
        <div className="hidden items-center gap-6 justify-self-start md:flex lg:gap-8">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="whitespace-nowrap text-sm font-medium text-charcoal/70 transition-colors hover:text-charcoal"
            >
              {link.label}
            </a>
          ))}
        </div>

        <a
          href="#top"
          className="flex items-center justify-self-start md:justify-self-center"
          aria-label="Alignr home"
        >
          <img src="/alignr-logo.png" alt="Alignr" className="h-[4.85rem] w-auto" />
        </a>

        <div className="flex items-center gap-2 justify-self-end">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-charcoal/70 transition hover:bg-charcoal/5 hover:text-charcoal md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </svg>
            )}
          </button>
          <CtaButton>Tailor My Resume</CtaButton>
        </div>
      </nav>

      {open && (
        <div className="border-t border-charcoal/5 bg-paper px-5 pb-4 pt-2 md:hidden">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block py-2.5 text-sm font-medium text-charcoal/70 transition-colors hover:text-charcoal"
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}
