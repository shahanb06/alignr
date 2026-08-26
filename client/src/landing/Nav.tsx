import CtaButton from './CtaButton';

const LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Why Alignr', href: '#why' },
  { label: 'FAQ', href: '#faq' },
];

export default function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-charcoal/5 bg-paper/80 backdrop-blur">
      {/*
        Three grid regions at `1fr auto 1fr`: the outer cells are always equal
        width, so the centre cell holds the logo at the true horizontal centre
        regardless of how much wider the CTA is than the nav links. The centre
        column is `auto` so the logo keeps its intrinsic proportions.
      */}
      <nav className="mx-auto grid max-w-6xl grid-cols-[auto_1fr] items-center gap-4 px-5 py-3 sm:px-8 md:grid-cols-[1fr_auto_1fr] md:gap-6">
        {/*
          Below `md` the links are hidden, so this cell is removed from the grid
          entirely rather than left as an empty `1fr` track — otherwise the
          collapsed track would drag the logo off centre on mobile.
        */}
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
          <img src="/alignr-logo.png" alt="Alignr" className="h-[4.3rem] w-auto" />
        </a>

        <div className="flex items-center justify-self-end">
          <CtaButton>Tailor My Resume</CtaButton>
        </div>
      </nav>
    </header>
  );
}
