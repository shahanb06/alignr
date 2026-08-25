import { DARK_DOTS } from './darkSection';

const PRODUCT_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Why Alignr', href: '#why' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Tailor my resume', href: '#/app' },
];

export default function Footer() {
  return (
    <footer
      className="relative overflow-hidden border-t border-paper/10 bg-[#1F1D1A]"
      style={DARK_DOTS}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5 py-12 sm:px-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xs">
          {/* The logo art is near-black, so it is flattened and inverted to read
              as cream (~#FAF9F6) against the dark charcoal band. */}
          <img
            src="/alignr-logo.png"
            alt="Alignr"
            className="h-[3.75rem] w-auto brightness-0 invert opacity-[0.98]"
          />
          <p className="mt-4 text-sm leading-relaxed text-paper/60">
            AI Resume Tailoring, Grounded In Your Experience. True to your experience, ready for a
            real recruiter.
          </p>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-paper/50">
            Product
          </h3>
          <ul className="mt-4 flex flex-col gap-3">
            {PRODUCT_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-sm text-paper/70 transition-colors hover:text-paper"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 pb-10 sm:px-8">
        <p className="text-xs text-paper/50">
          &copy; {new Date().getFullYear()} Alignr. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
