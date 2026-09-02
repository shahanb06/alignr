// Quota-exceeded state for the Tailored Output zone.
//
// Rendered in place of the generic error card when the server returns
// { code: 'daily_limit_reached' }. Same visual family as EmptyState (dashed
// border, centered content, dot pattern) so it reads as a sibling state rather
// than a system error.

interface Props {
  scope: 'tailor' | 'analyze';
  resetsAt: string | null;
}

function formatResetTime(resetsAt: string | null): string {
  if (!resetsAt) return 'tomorrow';
  const diff = new Date(resetsAt).getTime() - Date.now();
  if (diff <= 0) return 'shortly';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return 'in about ' + hours + (hours === 1 ? ' hour' : ' hours');
  if (minutes > 5) return 'in about ' + minutes + ' minutes';
  return 'shortly';
}

export default function QuotaExceededState({ scope, resetsAt }: Props) {
  const headline =
    scope === 'tailor'
      ? "That\u2019s today\u2019s three tailorings."
      : "That\u2019s today\u2019s ten fit checks.";

  return (
    <div
      className="relative flex h-full flex-col items-center justify-center gap-5 overflow-hidden rounded-xl border border-dashed border-ink-200 bg-white/50 p-8 text-center"
      style={{
        backgroundImage: 'radial-gradient(circle, rgb(228 228 231 / 0.6) 1px, transparent 1px)',
        backgroundSize: '14px 14px',
      }}
    >
      <div className="relative z-10 max-w-sm">
        <h3 className="text-sm font-semibold tracking-[-0.01em] text-ink-900">
          {headline}
        </h3>
        <p className="mt-1.5 text-sm leading-snug text-ink-500">
          Resets {formatResetTime(resetsAt)}. Nothing is stored, so your inputs are safe on this device.
        </p>
      </div>

      {/* Paper mock with inert ghost ring, same as EmptyState but dimmed. */}
      <div
        className="relative z-10 w-[74%] max-w-md rounded-md border border-ink-200 bg-white p-5 shadow-card opacity-60"
        aria-hidden
      >
        <div className="absolute right-3 top-3 h-9 w-9 rounded-full border-[2.5px] border-ink-200" />
        <div className="mb-4 space-y-1.5">
          <div className="h-2 w-2/5 rounded-sm bg-ink-900/10" />
          <div className="h-1.5 w-3/5 rounded-sm bg-ink-900/[0.06]" />
        </div>
        <div className="mb-3 space-y-1">
          <div className="h-1.5 w-1/4 rounded-sm bg-ink-900/10" />
          <div className="h-1 w-11/12 rounded-sm bg-ink-900/[0.06]" />
          <div className="h-1 w-9/12 rounded-sm bg-ink-900/[0.06]" />
        </div>
        <div className="space-y-1">
          <div className="h-1.5 w-1/5 rounded-sm bg-ink-900/10" />
          <div className="h-1 w-11/12 rounded-sm bg-ink-900/[0.06]" />
          <div className="h-1 w-7/12 rounded-sm bg-ink-900/[0.06]" />
        </div>
      </div>
    </div>
  );
}
