import { useEffect, useMemo, useRef, useState } from 'react';
import { analyzeFit, tailorResume } from './lib/api';
import type { AnalyzeResult, RewriteStyle, SourceType, TailorResult } from './lib/types';
import EmptyState from './components/EmptyState';
import JobDescriptionPanel from './components/JobDescriptionPanel';
import LoadingState from './components/LoadingState';
import ResultsPanel from './components/ResultsPanel';
import ResumeInputPanel from './components/ResumeInputPanel';

const MIN_RESUME_CHARS = 200;
const MIN_JD_CHARS = 50;
const LAST_RUN_KEY = 'alignr:lastRun';

// A saved run is a flat merge of the analyze + tailor results plus the inputs
// used to produce them. Keys don't overlap across the two result types so a
// shallow spread is unambiguous.
interface SavedRun {
  analyze: AnalyzeResult;
  tailor: TailorResult;
  resumeText: string;
  jobDescription: string;
  targetRole: string;
  rewriteStyle: RewriteStyle;
}

export default function App() {
  const [pastedResume, setPastedResume] = useState('');
  const [extractedResume, setExtractedResume] = useState('');
  const [sourceType, setSourceType] = useState<SourceType | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const [jobDescription, setJobDescription] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [rewriteStyle, setRewriteStyle] = useState<RewriteStyle>('balanced');

  // Output state — split: analyze runs first, tailor second. If tailor fails,
  // analyzeResult must stay rendered.
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTailoring, setIsTailoring] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [tailorResult, setTailorResult] = useState<TailorResult | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [tailorError, setTailorError] = useState<string | null>(null);
  const [progressLabel, setProgressLabel] = useState('Starting…');
  const [progressHistory, setProgressHistory] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const [hasSavedRun, setHasSavedRun] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAST_RUN_KEY);
      if (!raw) return;
      JSON.parse(raw) as SavedRun;
      setHasSavedRun(true);
    } catch {
      try {
        localStorage.removeItem(LAST_RUN_KEY);
      } catch {
        // ignore
      }
    }
  }, []);

  const usingFile = !!extractedResume && !!sourceType;
  const effectiveResume = usingFile ? extractedResume : pastedResume;

  const isBusy = isAnalyzing || isTailoring;

  const canSubmit = useMemo(() => {
    if (isBusy) return false;
    if (effectiveResume.trim().length < MIN_RESUME_CHARS) return false;
    if (jobDescription.trim().length < MIN_JD_CHARS) return false;
    return true;
  }, [isBusy, effectiveResume, jobDescription]);

  function handleClear() {
    abortRef.current?.abort();
    setPastedResume('');
    setExtractedResume('');
    setSourceType(null);
    setFileName(null);
    setJobDescription('');
    setTargetRole('');
    setRewriteStyle('balanced');
    setAnalyzeResult(null);
    setTailorResult(null);
    setAnalyzeError(null);
    setTailorError(null);
    setIsAnalyzing(false);
    setIsTailoring(false);
    setProgressLabel('Starting…');
    setProgressHistory([]);
    try {
      localStorage.removeItem(LAST_RUN_KEY);
    } catch {
      // ignore
    }
    setHasSavedRun(false);
  }

  function handleRestoreLastRun() {
    try {
      const raw = localStorage.getItem(LAST_RUN_KEY);
      if (!raw) {
        setHasSavedRun(false);
        return;
      }
      const saved = JSON.parse(raw) as SavedRun;
      setPastedResume(saved.resumeText);
      setExtractedResume('');
      setSourceType(null);
      setFileName(null);
      setJobDescription(saved.jobDescription);
      setTargetRole(saved.targetRole);
      setRewriteStyle(saved.rewriteStyle);
      setAnalyzeResult(saved.analyze);
      setTailorResult(saved.tailor);
      setAnalyzeError(null);
      setTailorError(null);
      setHasSavedRun(false);
    } catch {
      try {
        localStorage.removeItem(LAST_RUN_KEY);
      } catch {
        // ignore
      }
      setHasSavedRun(false);
    }
  }

  function handleDismissLastRun() {
    try {
      localStorage.removeItem(LAST_RUN_KEY);
    } catch {
      // ignore
    }
    setHasSavedRun(false);
  }

  // Step 1 — analyze. Sets analyzeResult on success, returns the value so the
  // caller can chain into tailor. Returns null on failure (error already set).
  async function runAnalyze(
    resumeText: string,
    jdText: string,
    signal: AbortSignal
  ): Promise<AnalyzeResult | null> {
    setIsAnalyzing(true);
    setAnalyzeError(null);
    try {
      const res = await analyzeFit({ resumeText, jobDescription: jdText }, signal);
      setAnalyzeResult(res);
      return res;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return null;
      setAnalyzeError((err as Error).message || 'Analysis failed. Please try again.');
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }

  // Step 2 — tailor. Streams via SSE. On success, merges with the analyze result
  // and writes the merged blob to localStorage. On failure, sets tailorError and
  // leaves analyzeResult untouched so the score/chips stay rendered.
  async function runTailor(
    analyze: AnalyzeResult,
    resumeText: string,
    jdText: string,
    role: string,
    style: RewriteStyle,
    signal: AbortSignal
  ): Promise<void> {
    setIsTailoring(true);
    setTailorError(null);
    setProgressLabel('Starting…');
    setProgressHistory(['Starting…']);

    await tailorResume(
      {
        resumeText,
        jobDescription: jdText,
        targetRole: role,
        rewriteStyle: style,
      },
      {
        onProgress: (ev) => {
          setProgressLabel(ev.label);
          setProgressHistory((h) => (h[h.length - 1] === ev.label ? h : [...h, ev.label]));
        },
        onDone: (r) => {
          setTailorResult(r);
          setIsTailoring(false);
          try {
            const saved: SavedRun = {
              analyze,
              tailor: r,
              resumeText,
              jobDescription: jdText,
              targetRole: role,
              rewriteStyle: style,
            };
            localStorage.setItem(LAST_RUN_KEY, JSON.stringify(saved));
          } catch {
            // ignore
          }
          setHasSavedRun(false);
        },
        onError: (msg) => {
          setTailorError(msg);
          setIsTailoring(false);
        },
      },
      signal
    );
  }

  async function handleSubmit() {
    if (!canSubmit) return;

    const resumeText = effectiveResume.trim();
    const jdText = jobDescription.trim();
    const role = targetRole.trim();
    const style = rewriteStyle;

    // Reset only outputs, not inputs.
    setAnalyzeResult(null);
    setTailorResult(null);
    setAnalyzeError(null);
    setTailorError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    const analyze = await runAnalyze(resumeText, jdText, controller.signal);
    if (!analyze) return; // analyze failed or aborted
    await runTailor(analyze, resumeText, jdText, role, style, controller.signal);
  }

  // Retry handler used by the localized error in the tailored-output zone.
  // Re-runs only the tailor step, reusing the existing analyzeResult. The
  // backend cache will hit so no extra analyze API call happens.
  async function handleRetryTailor() {
    if (!analyzeResult) {
      // No analyze in state — fall back to full re-run.
      handleSubmit();
      return;
    }
    const resumeText = effectiveResume.trim();
    const jdText = jobDescription.trim();
    const role = targetRole.trim();
    const style = rewriteStyle;
    const controller = new AbortController();
    abortRef.current = controller;
    setTailorError(null);
    await runTailor(analyzeResult, resumeText, jdText, role, style, controller.signal);
  }

  // Retry handler for the analyze-failed case (top-level error block).
  function handleRetryFull() {
    setAnalyzeError(null);
    handleSubmit();
  }

  const hasAnyResult = !!analyzeResult || !!tailorResult;

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-ink-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-2">
          <div className="flex items-center gap-3">
            <img src="/alignr-logo.png" alt="Alignr logo" className="h-7 md:h-8 w-auto" />
            <div className="leading-tight">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-[-0.01em] leading-none text-ink-900">
                Alignr
              </h1>
              <p className="mt-0.5 text-[11px] md:text-[12px] leading-tight text-ink-500">
                Honest AI Resume Tailoring
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClear}
              disabled={isBusy}
              className="rounded-md border border-ink-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-700 transition hover:border-ink-300 hover:text-ink-900 disabled:opacity-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="inline-flex items-center gap-1.5 rounded-md border border-ink-900 bg-ink-900 px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isAnalyzing ? (
                <>
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Analyzing…
                </>
              ) : isTailoring ? (
                <>
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Tailoring…
                </>
              ) : (
                <>
                  Tailor My Resume
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-6">
        {hasSavedRun && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm">
            <span className="text-ink-700">Restore your last tailored run?</span>
            <span className="flex items-center gap-2 text-ink-500">
              <button
                type="button"
                onClick={handleRestoreLastRun}
                className="font-medium text-ink-900 hover:underline"
              >
                Restore
              </button>
              <span aria-hidden>·</span>
              <button
                type="button"
                onClick={handleDismissLastRun}
                className="font-medium text-ink-900 hover:underline"
              >
                Dismiss
              </button>
            </span>
          </div>
        )}

        <div className="mb-5 max-w-3xl">
          <p className="text-sm leading-relaxed text-ink-600">
            Paste your resume and a job description. Alignr rewrites only what's already
            supported by your resume, lists missing skills honestly, and shows a diff of every
            change. It does not invent experience, employers, or metrics.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ResumeInputPanel
            pastedText={pastedResume}
            onChangePastedText={setPastedResume}
            extractedText={extractedResume}
            onChangeExtractedText={setExtractedResume}
            sourceType={sourceType}
            onSourceTypeChange={setSourceType}
            fileName={fileName}
            onFileNameChange={setFileName}
            disabled={isBusy}
          />
          <JobDescriptionPanel
            jobDescription={jobDescription}
            onChangeJobDescription={setJobDescription}
            targetRole={targetRole}
            onChangeTargetRole={setTargetRole}
            rewriteStyle={rewriteStyle}
            onChangeRewriteStyle={setRewriteStyle}
            disabled={isBusy}
          />
        </div>

        {!isBusy && !hasAnyResult && !analyzeError && !tailorError && (
          <div className="mt-3 text-xs text-ink-500">
            {effectiveResume.trim().length < MIN_RESUME_CHARS && (
              <span className="mr-3">
                · Resume needs at least {MIN_RESUME_CHARS} characters
              </span>
            )}
            {jobDescription.trim().length < MIN_JD_CHARS && (
              <span>· Job description needs at least {MIN_JD_CHARS} characters</span>
            )}
          </div>
        )}

        {/* Output zone */}
        <section className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-ink-900 text-[10px] font-bold text-white transition-transform duration-150 ease-out hover:scale-[1.02]">
              3
            </span>
            <h2 className="text-sm font-semibold tracking-[-0.01em] text-ink-900">Tailored Output</h2>
          </div>

          {/* Full-zone error: analyze failed before any result existed. */}
          {analyzeError && !analyzeResult && (
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
                  <p className="text-sm font-semibold text-rose-900">Analysis failed</p>
                  <p className="mt-0.5 text-sm text-rose-900/80">{analyzeError}</p>
                </div>
              </div>
              <div>
                <button
                  type="button"
                  onClick={handleRetryFull}
                  className="rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-800 hover:bg-rose-50"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Analyze-phase loading: no result yet. Compact spinner above the empty body. */}
          {isAnalyzing && !analyzeResult && (
            <div className="flex items-center gap-2.5 rounded-xl border border-ink-200 bg-white p-5 shadow-card">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-ink-300 border-t-ink-900" />
              <span className="text-sm text-ink-700">Analyzing fit…</span>
            </div>
          )}

          {/* Results panel: render whenever we have an analyzeResult (even mid-tailor or post-tailor-error). */}
          {analyzeResult && (
            <ResultsPanel
              analyzeResult={analyzeResult}
              tailorResult={tailorResult}
              isTailoring={isTailoring}
              tailorError={tailorError}
              onRetryTailor={handleRetryTailor}
              tailorLoadingState={
                <LoadingState label={progressLabel} history={progressHistory} />
              }
            />
          )}

          {!isBusy && !analyzeError && !analyzeResult && <EmptyState />}
        </section>

        <div className="mt-12 border-t border-ink-200 pt-6">
          <details>
            <summary className="cursor-pointer py-3 text-sm font-medium text-ink-900">
              How it works
            </summary>
            <ol className="mt-2 max-w-3xl list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-500">
              <li>
                Paste your resume on the left. You can drop a PDF, DOCX, or TXT, or paste the text
                directly.
              </li>
              <li>
                Paste the job description on the right. Add a target role if you want, and pick how
                aggressively you'd like Alignr to rewrite.
              </li>
              <li>
                Click "Tailor My Resume." Alignr first analyzes how well your resume matches the
                job description — you'll see a match score and which keywords are present or
                missing. Then it streams a tailored version of your resume, with a side-by-side
                diff and reasons for every change.
              </li>
              <li>
                Alignr is powered by AI, guided by a system prompt designed to prevent fabrication.
                The model only rewrites what's already supported by your resume — it surfaces
                missing skills rather than inventing them, and every change comes with a reason you
                can review.
              </li>
            </ol>
          </details>
        </div>
      </main>
    </div>
  );
}
