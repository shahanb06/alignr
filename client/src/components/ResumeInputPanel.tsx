import { useRef, useState } from 'react';
import { extractResume } from '../lib/api';
import type { SourceType } from '../lib/types';

interface Props {
  pastedText: string;
  onChangePastedText: (text: string) => void;
  extractedText: string;
  onChangeExtractedText: (text: string) => void;
  sourceType: SourceType | null;
  onSourceTypeChange: (s: SourceType | null) => void;
  fileName: string | null;
  onFileNameChange: (n: string | null) => void;
  disabled: boolean;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_RESUME_CHARS = 20000;

export default function ResumeInputPanel({
  pastedText,
  onChangePastedText,
  extractedText,
  onChangeExtractedText,
  sourceType,
  onSourceTypeChange,
  fileName,
  onFileNameChange,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractWarning, setExtractWarning] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const usingFile = !!extractedText && !!sourceType;
  const effectiveText = usingFile ? extractedText : pastedText;
  const charCount = effectiveText.length;

  async function handleFile(file: File) {
    setUploadError(null);
    setExtractWarning(null);

    if (file.size > MAX_FILE_BYTES) {
      setUploadError('File is too large. Max 5 MB.');
      return;
    }
    const okExt = /\.(pdf|docx|txt)$/i.test(file.name);
    if (!okExt) {
      setUploadError('Unsupported file type. Upload a PDF, DOCX, or TXT file.');
      return;
    }

    setIsExtracting(true);
    try {
      const res = await extractResume(file);
      onChangeExtractedText(res.extractedText);
      onSourceTypeChange(res.sourceType);
      onFileNameChange(file.name);
      setExtractWarning(res.warning);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Could not read that file.');
      onChangeExtractedText('');
      onSourceTypeChange(null);
      onFileNameChange(null);
    } finally {
      setIsExtracting(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function clearFile() {
    onChangeExtractedText('');
    onSourceTypeChange(null);
    onFileNameChange(null);
    setExtractWarning(null);
    setUploadError(null);
  }

  return (
    <section className="flex h-full flex-col rounded-xl border border-ink-200 bg-white shadow-card">
      <header className="flex items-center justify-between border-b border-ink-200 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-ink-900 text-[10px] font-bold text-white transition-transform duration-150 ease-out hover:scale-[1.02]">
            1
          </span>
          <h2 className="text-sm font-semibold tracking-[-0.01em] text-ink-900">Your Resume</h2>
        </div>
        <span className="text-xs tabular-nums text-ink-500">
          {charCount.toLocaleString()} / {MAX_RESUME_CHARS.toLocaleString()}
        </span>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-5">
        {/* Upload zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file && !disabled) handleFile(file);
          }}
          className={`flex items-center justify-between gap-3 rounded-lg border border-dashed px-4 py-3 text-sm transition ${
            isDragging
              ? 'border-ink-900 bg-ink-50'
              : 'border-ink-300 bg-ink-50/40'
          }`}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-ink-200 bg-white text-ink-600">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="truncate text-ink-900">
                {fileName ? fileName : 'Drop a PDF, DOCX, or TXT (max 5 MB)'}
              </p>
              <p className="text-xs text-ink-500">
                {fileName
                  ? `Source: ${sourceType?.toUpperCase()} · extracted in your browser session`
                  : 'Or paste your resume below'}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {fileName ? (
              <button
                type="button"
                onClick={clearFile}
                disabled={disabled || isExtracting}
                className="rounded-md border border-ink-200 bg-white px-2.5 py-1 text-xs font-medium text-ink-700 hover:border-ink-300 hover:text-ink-900 disabled:opacity-50"
              >
                Remove
              </button>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={disabled || isExtracting}
                className="rounded-md border border-ink-900 bg-ink-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-ink-800 disabled:opacity-50"
              >
                {isExtracting ? 'Extracting…' : 'Choose file'}
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>
        </div>

        {uploadError && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            {uploadError}
          </div>
        )}
        {extractWarning && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {extractWarning}
          </div>
        )}
        {usingFile && pastedText.trim().length > 0 && (
          <div className="rounded-md border border-ink-200 bg-ink-50 px-3 py-2 text-xs text-ink-700">
            Using the uploaded file ({fileName}). Your pasted text below is ignored unless you remove
            the file.
          </div>
        )}

        {/* Text preview / paste */}
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="resume-text"
              className="text-xs font-medium uppercase tracking-wide text-ink-500"
            >
              {usingFile ? 'Extracted text (editable)' : 'Paste resume text'}
            </label>
            {usingFile && (
              <span className="text-xs text-ink-500">Edit anything before tailoring</span>
            )}
          </div>
          <textarea
            id="resume-text"
            value={usingFile ? extractedText : pastedText}
            onChange={(e) => {
              if (usingFile) {
                onChangeExtractedText(e.target.value.slice(0, MAX_RESUME_CHARS));
              } else {
                onChangePastedText(e.target.value.slice(0, MAX_RESUME_CHARS));
              }
            }}
            disabled={disabled}
            spellCheck={false}
            placeholder={
              usingFile
                ? ''
                : 'Paste your resume text here. Plain text is fine — section headers, bullets, and skills lines all work.'
            }
            className="thin-scroll flex-1 min-h-[260px] resize-none rounded-lg border border-ink-200 bg-white p-3 font-mono text-[12.5px] leading-relaxed text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-ink-400 disabled:opacity-60"
          />
        </div>
      </div>
    </section>
  );
}
