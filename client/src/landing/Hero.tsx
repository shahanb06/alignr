import { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import HeroPaper3D from './HeroPaper3D';
import { entranceProps } from './motion';
import { setPendingResumeFile } from '../lib/fileHandoff';

/**
 * Mirrors the limits enforced by the app's uploader (ResumeInputPanel) and the
 * server's extraction route, so a file accepted here is always parseable on
 * arrival rather than failing after navigation.
 */
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_EXT = /\.(pdf|docx|txt)$/i;
const FILE_ACCEPT =
  '.pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain';

export default function Hero() {
  const reduced = useReducedMotion();
  const [resume, setResume] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasContent = resume.trim().length > 0 || file !== null;

  function acceptFile(candidate: File) {
    if (candidate.size > MAX_FILE_BYTES) {
      setFile(null);
      setFileError('File is too large. Max 5 MB.');
      return;
    }
    if (!ACCEPTED_EXT.test(candidate.name)) {
      setFile(null);
      setFileError('Upload a PDF, DOCX, or TXT file.');
      return;
    }
    setFileError(null);
    setFile(candidate);
  }

  function clearFile() {
    setFile(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleContinue() {
    if (!hasContent) {
      textareaRef.current?.focus();
      return;
    }
    if (resume.trim().length > 0) {
      try {
        sessionStorage.setItem('alignr:pastedResume', resume);
      } catch {
        // sessionStorage may be unavailable; navigation still proceeds
      }
    }
    // The file is parked in memory rather than sessionStorage: the hash router
    // keeps the SPA mounted, and the app's existing uploader claims it on
    // arrival and runs its own extraction.
    setPendingResumeFile(file);
    window.location.hash = '#/app';
  }

  return (
    <section id="top" className="relative mx-auto max-w-6xl px-5 pt-16 pb-10 sm:px-8 sm:pt-24">
      <HeroPaper3D />
      <div className="relative z-10 grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Left: pill + giant floating wordmark */}
        <div>
          <motion.span
            {...entranceProps(0, reduced)}
            className="inline-flex items-center gap-2 rounded-full bg-positive-soft px-3.5 py-1.5 text-sm font-medium text-positive-ink"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-positive" aria-hidden="true" />
            AI Resume Tailoring, Grounded In Your Experience
          </motion.span>
          <motion.h1
            {...entranceProps(1, reduced)}
            className="mt-6 font-semibold leading-[0.9] tracking-[-0.04em] text-charcoal"
            style={{
              fontSize: 'clamp(4.5rem, 18vw, 12rem)',
              // Thin warm-grey outline so the letterforms keep a crisp edge
              // against both the cream page and the 3D cards behind them.
              // `paint-order: stroke` draws the stroke beneath the fill so the
              // glyph weight is preserved instead of being eaten into from the
              // inside.
              paintOrder: 'stroke fill',
              WebkitTextStrokeWidth: '1px',
              WebkitTextStrokeColor: '#C9C4B8',
            }}
          >
            Alignr
          </motion.h1>
        </div>

        {/* Right: headline paragraph + supporting copy */}
        <div className="lg:pt-6">
          <motion.p
            {...entranceProps(2, reduced)}
            className="text-balance text-2xl font-medium leading-snug tracking-[-0.01em] text-charcoal sm:text-3xl"
          >
            Most AI tools invent experience to win keywords. Alignr rewrites only what your resume
            supports. It explains every change.
          </motion.p>
          <motion.p
            {...entranceProps(3, reduced)}
            className="mt-5 text-base leading-relaxed text-charcoal/60"
          >
            No account needed. Just paste your resume and a job description.
          </motion.p>

          {/* Paste-teaser card */}
          <motion.div
            {...entranceProps(4, reduced)}
            onDragOver={(e) => {
              e.preventDefault();
              if (!isDragging) setIsDragging(true);
            }}
            onDragLeave={(e) => {
              // dragleave also fires when crossing into a child element, so
              // only clear the state when the pointer truly leaves the card.
              if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
              setIsDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const dropped = e.dataTransfer.files?.[0];
              if (dropped) acceptFile(dropped);
            }}
            className={`mt-8 rounded-xl border bg-white transition-colors ${
              isDragging
                ? 'border-dashed border-charcoal bg-[#F4F2EC]'
                : hasContent
                  ? 'border-positive'
                  : 'border-[#E7E4DC]'
            }`}
          >
            <textarea
              ref={textareaRef}
              rows={4}
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              placeholder="Paste your resume here to begin..."
              className="block w-full resize-none rounded-t-xl border-0 bg-transparent px-4 pt-4 text-sm leading-relaxed text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-0"
            />
            <div className="border-t border-[#E7E4DC]" />
            <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach your resume"
                  aria-label="Attach your resume"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-charcoal opacity-70 transition hover:bg-[#F1EFE9] hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-charcoal/30"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={FILE_ACCEPT}
                  className="hidden"
                  onChange={(e) => {
                    const picked = e.target.files?.[0];
                    if (picked) acceptFile(picked);
                  }}
                />

                {isDragging ? (
                  <span className="text-xs font-medium text-charcoal">Drop to attach</span>
                ) : fileError ? (
                  <span className="text-xs leading-relaxed text-[#B4322B]">{fileError}</span>
                ) : file ? (
                  <span className="inline-flex min-w-0 items-center gap-1.5 rounded-md border border-[#E7E4DC] bg-[#FAF9F6] py-1 pl-2 pr-1 text-xs text-charcoal">
                    <span className="max-w-[11rem] truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={clearFile}
                      title="Remove attachment"
                      aria-label={`Remove ${file.name}`}
                      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-charcoal/50 transition hover:bg-[#EDEAE2] hover:text-charcoal"
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        aria-hidden="true"
                      >
                        <line x1="5" y1="5" x2="19" y2="19" />
                        <line x1="19" y1="5" x2="5" y2="19" />
                      </svg>
                    </button>
                  </span>
                ) : (
                  <p className="text-xs leading-relaxed text-charcoal/50">
                    {hasContent ? 'Next step: add the job description in the app.' : ''}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleContinue}
                className={`group inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-medium transition-colors ${
                  hasContent
                    ? 'bg-charcoal text-paper hover:bg-black'
                    : 'bg-[#D6D3CB] text-charcoal/70'
                }`}
              >
                {hasContent ? 'Continue with this resume' : 'Tailor My Resume'}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden="true"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
