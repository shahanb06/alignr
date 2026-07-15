const PRODUCT_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Why Alignr', href: '#why' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Tailor my resume', href: '#/app' },
];

export default function Footer() {
  return (
    <footer className="border-t border-charcoal/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5 py-12 sm:px-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xs">
          <img src="/alignr-logo.png" alt="Alignr" className="h-[3.75rem] w-auto" />
          <p className="mt-4 text-sm leading-relaxed text-charcoal/55">
            AI Resume Tailoring, Grounded in Your Experience. True to your experience, ready for a
            real recruiter.
          </p>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-charcoal/40">
            Product
          </h3>
          <ul className="mt-4 flex flex-col gap-3">
            {PRODUCT_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-sm text-charcoal/70 transition-colors hover:text-charcoal"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 pb-10 sm:px-8">
        <p className="text-xs text-charcoal/40">
          &copy; {new Date().getFullYear()} Alignr. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
