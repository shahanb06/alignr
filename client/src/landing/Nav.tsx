import CtaButton from './CtaButton';

const LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Why Alignr', href: '#why' },
  { label: 'FAQ', href: '#faq' },
];

export default function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-charcoal/5 bg-paper/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <a href="#top" className="flex items-center" aria-label="Alignr home">
          <img src="/alignr-logo.png" alt="Alignr" className="h-12 w-auto" />
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-charcoal/70 transition-colors hover:text-charcoal"
            >
              {link.label}
            </a>
          ))}
        </div>

        <CtaButton>Tailor my resume</CtaButton>
      </nav>
    </header>
  );
}
