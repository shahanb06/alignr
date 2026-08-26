function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

interface MarkListProps {
  items: string[];
  variant: 'check' | 'cross';
  className?: string;
}

/**
 * A vertical list where each item is prefixed with either a positive green
 * check badge or a negative rose cross badge.
 */
export default function MarkList({ items, variant, className = '' }: MarkListProps) {
  const isCheck = variant === 'check';
  return (
    <ul className={`flex flex-col gap-4 ${className}`}>
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
              isCheck
                ? 'bg-positive-soft text-positive-ink'
                : 'bg-negative-soft text-negative-ink'
            }`}
          >
            {isCheck ? <CheckIcon /> : <CrossIcon />}
          </span>
          <span className="text-[15px] leading-relaxed text-charcoal/80">{item}</span>
        </li>
      ))}
    </ul>
  );
}
