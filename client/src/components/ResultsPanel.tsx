import { useEffect, useState } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import type { AnalyzeResult, TailorResult } from '../lib/types';
import CopyButton from './CopyButton';
import DiffViewer from './DiffViewer';
import { MatchedKeywords, MissingKeywords } from './KeywordChips';

interface Props {
  analyzeResult: AnalyzeResult;
  tailorResult: TailorResult | null;
  isTailoring: boolean;
  tailorError: string | null;
  onRetryTailor: () => void;
  // Loading-state node for the tailoring phase. The parent owns the LoadingState
  // component so it can keep its progress-label + history wiring in one place.
  tailorLoadingState: React.ReactNode;
}

function Card({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-ink-200 bg-white shadow-card">
      <header className="flex items-start justify-between gap-3 border-b border-ink-200 px-5 py-3.5">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-[-0.01em] text-ink-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function DownloadButton({ text }: { text: string }) {
  function handleDownload() {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'alignr-tailored-resume.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="inline-flex items-center gap-1.5 rounded-md border border-ink-200 bg-white px-2.5 py-1 text-xs font-medium text-ink-700 transition hover:border-ink-300 hover:text-ink-900"
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      <span>Download .txt</span>
    </button>
  );
}

function MatchScoreRing({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const tone =
    clamped >= 75
      ? { ring: '#059669', text: 'text-emerald-700' }
      : clamped >= 50
        ? { ring: '#18181b', text: 'text-ink-800' }
        : { ring: '#b45309', text: 'text-amber-700' };

  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  // Ring fills from empty to the computed offset over 600ms. Number ticks from
  // 0 to the score over 1200ms — so the ring finishes first and the number
  // briefly keeps counting. Both reset and replay when the score changes.
  const ringOffset = useMotionValue(circumference);
  const numberValue = useMotionValue(0);
  const display = useTransform(numberValue, (v) => Math.round(v));

  useEffect(() => {
    ringOffset.set(circumference);
    numberValue.set(0);
    const c1 = animate(ringOffset, offset, { duration: 0.6, ease: 'easeOut' });
    const c2 = animate(numberValue, clamped, { duration: 1.2, ease: 'easeOut' });
    return () => {
      c1.stop();
      c2.stop();
    };
  }, [clamped, offset, circumference, ringOffset, numberValue]);

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-16 w-16">
        <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden>
          <circle cx="32" cy="32" r={radius} stroke="#e4e4e7" strokeWidth="2" fill="none" />
          <motion.circle
            cx="32"
            cy="32"
            r={radius}
            stroke={tone.ring}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={ringOffset}
            transform="rotate(-90 32 32)"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span className={`text-sm font-semibold tabular-nums ${tone.text}`}>
            {display}
          </motion.span>
        </div>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Match score</p>
        <p className="text-xs text-ink-700">Honest estimate of fit</p>
      </div>
    </div>
  );
}

export default function ResultsPanel({
  analyzeResult,
  tailorResult,
  isTailoring,
  tailorError,
  onRetryTailor,
  tailorLoadingState,
}: Props) {
  const [tab, setTab] = useState<'overview' | 'diff' | 'final'>('overview');

  const matchedCount = analyzeResult.matchedKeywords.length;
  const totalCount = analyzeResult.jdKeywords.length;

  return (
    <div className="flex flex-col gap-4">
      {/* Header strip: score from analyzeResult. Tabs only enabled once tailor completes. */}
      <section className="rounded-xl border border-ink-200 bg-white shadow-card">
        <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-6">
            <MatchScoreRing score={analyzeResult.matchScore} />
            <div className="hidden h-12 w-px bg-ink-200 md:block" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                Keywords matched
              </p>
              <p className="text-sm text-ink-900">
                <span className="text-lg font-semibold tabular-nums">{matchedCount}</span>{' '}
                <span className="text-ink-400">/</span>{' '}
                <span className="tabular-nums">{totalCount}</span>{' '}
                <span className="text-ink-500">Job Description Keywords</span>
              </p>
            </div>
          </div>

          {tailorResult && (
            <div className="inline-flex shrink-0 rounded-md border border-ink-200 bg-ink-50 p-0.5 text-xs">
              {(['overview', 'diff', 'final'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-[5px] px-3 py-1.5 font-medium capitalize transition ${
                    tab === t
                      ? 'bg-white text-ink-900 shadow-sm'
                      : 'text-ink-600 hover:text-ink-900'
                  }`}
                >
                  {t === 'overview' ? 'Overview' : t === 'diff' ? 'Diff' : 'Final resume'}
                </button>
              ))}
            </div>
          )}
        </div>

        {tailorResult && tailorResult.honestyNotice && (
          <div className="flex items-start gap-2.5 border-t border-ink-200 bg-ink-50/50 px-5 py-3 text-xs text-ink-700">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 shrink-0 text-ink-500"
              aria-hidden
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <p className="leading-relaxed">{tailorResult.honestyNotice}</p>
          </div>
        )}
      </section>

      {/* Keyword chip cards — analyze-derived. Render as soon as analyze completes,
          including while the tailor stream is in flight. */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title="Matched keywords" subtitle="Backed by evidence in your resume">
          <MatchedKeywords items={analyzeResult.matchedKeywords} />
        </Card>
        <Card title="Missing skills" subtitle="Listed honestly — not added to your resume">
          <MissingKeywords items={analyzeResult.missingSkills} />
        </Card>
      </div>

      {/* Tailor-dependent body: loading / error / tab content. */}
      {isTailoring && !tailorResult && tailorLoadingState}

      {tailorError && !tailorResult && (
        <div className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-5">
          <div className="flex items-start gap-2.5">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 shrink-0 text-rose-600"
              aria-hidden
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-rose-900">Tailoring failed</p>
              <p className="mt-0.5 text-sm text-rose-900/80">{tailorError}</p>
              <p className="mt-1 text-xs text-rose-900/60">
                Your match score and keyword analysis above are still valid.
              </p>
            </div>
          </div>
          <div>
            <button
              type="button"
              onClick={onRetryTailor}
              className="rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-800 hover:bg-rose-50"
            >
              Retry tailoring
            </button>
          </div>
        </div>
      )}

      {tailorResult && tab === 'overview' && (
        <>
          {tailorResult.recruiterWarnings.length > 0 && (
            <Card title="Recruiter warnings" subtitle="What a real recruiter might flag">
              <ul className="space-y-3">
                {tailorResult.recruiterWarnings.map((w, i) => (
                  <li key={i} className="rounded-md border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm font-medium text-amber-900">{w.issue}</p>
                    <p className="mt-1 text-sm text-amber-900">{w.suggestion}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {tailorResult.professionalSummary && (
            <Card
              title="Tailored summary"
              subtitle="Anchored in your real experience"
              action={<CopyButton text={tailorResult.professionalSummary} />}
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-800">
                {tailorResult.professionalSummary}
              </p>
            </Card>
          )}

          {tailorResult.rewrittenBullets.length > 0 && (
            <Card
              title="Rewritten bullets"
              subtitle={`${tailorResult.rewrittenBullets.length} change${
                tailorResult.rewrittenBullets.length === 1 ? '' : 's'
              } — each with a reason`}
            >
              <ul className="space-y-4">
                {tailorResult.rewrittenBullets.map((b, i) => (
                  <li
                    key={i}
                    className="overflow-hidden rounded-lg border border-ink-200"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2">
                      <div className="border-b border-ink-200 bg-rose-50 p-3 md:border-b-0 md:border-r">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-700">
                          Before
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-ink-800">{b.before}</p>
                      </div>
                      <div className="bg-emerald-50 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                          After
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-ink-800">{b.after}</p>
                      </div>
                    </div>
                    <div className="border-t border-ink-200 bg-white px-3 py-2 text-xs text-ink-600">
                      <span className="font-semibold text-ink-700">Why: </span>
                      {b.reason}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {tailorResult.changesExplained.length > 0 && (
            <Card title="Changes explained" subtitle="Section-level summary of what was edited">
              <ul className="divide-y divide-ink-200">
                {tailorResult.changesExplained.map((c, i) => (
                  <li key={i} className="grid grid-cols-1 gap-2 py-3 md:grid-cols-[160px_1fr]">
                    <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                      {c.section}
                    </span>
                    <div className="text-sm">
                      <p className="text-ink-800">{c.change}</p>
                      <p className="mt-1 text-xs text-ink-500">{c.reason}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      {tailorResult && tab === 'diff' && (
        <Card
          title="Diff view"
          subtitle="Original (left) versus tailored (right). Review every change before you accept it."
        >
          <DiffViewer original={tailorResult.originalResume} tailored={tailorResult.tailoredResume} />
        </Card>
      )}

      {tailorResult && tab === 'final' && (
        <Card
          title="Final tailored resume"
          subtitle="Plain text. Paste into your resume document and adjust formatting."
          action={
            <div className="flex items-center gap-2">
              <CopyButton text={tailorResult.tailoredResume} label="Copy resume" />
              <DownloadButton text={tailorResult.tailoredResume} />
            </div>
          }
        >
          <pre className="thin-scroll max-h-[640px] overflow-auto whitespace-pre-wrap rounded-lg border border-ink-200 bg-ink-50/50 p-4 font-mono text-[12.5px] leading-relaxed text-ink-900">
            {tailorResult.tailoredResume}
          </pre>
        </Card>
      )}
    </div>
  );
}
