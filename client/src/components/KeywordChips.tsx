import type { KeywordMatched, KeywordMissing } from '../lib/types';

interface MatchedProps {
  items: KeywordMatched[];
}

export function MatchedKeywords({ items }: MatchedProps) {
  if (!items.length) {
    return <p className="text-sm text-ink-500">No direct matches detected.</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((k, i) => (
        <span
          key={`${k.keyword}-${i}`}
          title={k.evidence}
          className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
        >
          <span
            aria-hidden
            className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
          />
          {k.keyword}
        </span>
      ))}
    </div>
  );
}

interface MissingProps {
  items: KeywordMissing[];
}

export function MissingKeywords({ items }: MissingProps) {
  if (!items.length) {
    return <p className="text-sm text-ink-500">No notable gaps detected.</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((k, i) => (
        <span
          key={`${k.keyword}-${i}`}
          title={k.whyItMatters}
          className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700"
        >
          <span
            aria-hidden
            className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500"
          />
          {k.keyword}
        </span>
      ))}
    </div>
  );
}
