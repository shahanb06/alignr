interface Props {
  original: string;
  tailored: string;
}

// PDF-extracted resumes often contain pure-divider lines ("_______" / "-------")
// and 3+ space runs from two-column layouts. The tailor model strips or
// reformats these. Normalize both sides identically so the diff stays aligned.
function normalizeForDiff(text: string): string {
  if (typeof text !== 'string') return '';
  return text
    .split('\n')
    .filter((line) => !/^\s*[_\-=*]{5,}\s*$/.test(line))
    .map((line) => line.replace(/ {3,}/g, ' '))
    .join('\n');
}

// ---- Diff core (self-contained, dependency-free, validated against real data) ----

type SeqOp<T> =
  | { t: 'eq'; a: number; b: number; av: T; bv: T }
  | { t: 'del'; a: number; av: T }
  | { t: 'ins'; b: number; bv: T };

function diffSeq<T>(a: T[], b: T[]): SeqOp<T>[] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: SeqOp<T>[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      out.push({ t: 'eq', a: i, b: j, av: a[i], bv: b[j] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ t: 'del', a: i, av: a[i] });
      i++;
    } else {
      out.push({ t: 'ins', b: j, bv: b[j] });
      j++;
    }
  }
  while (i < m) out.push({ t: 'del', a: i, av: a[i++] });
  while (j < n) out.push({ t: 'ins', b: j, bv: b[j++] });
  return out;
}

function splitWords(s: string): string[] {
  return s.split(/(\s+)/).filter((x) => x.length > 0);
}

function normWords(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

// Jaccard word-overlap similarity between two lines.
function similarity(x: string, y: string): number {
  const A = new Set(normWords(x));
  const B = new Set(normWords(y));
  if (A.size === 0 && B.size === 0) return 1;
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter);
}

const SIM_THRESHOLD = 0.34;

// A word span for inline highlighting within a changed line.
interface WordSpan {
  text: string;
  changed: boolean;
}

// A rendered line on one side of the diff.
type LineKind = 'same' | 'removed' | 'added' | 'changed';
interface DiffLine {
  kind: LineKind;
  spans: WordSpan[]; // words with per-word changed flag
}

interface DiffResult {
  left: DiffLine[]; // original side
  right: DiffLine[]; // tailored side
}

function wordSpans(line: string, otherLine: string, side: 'left' | 'right'): WordSpan[] {
  const a = splitWords(line);
  const b = splitWords(otherLine);
  const ops = side === 'left' ? diffSeq(a, b) : diffSeq(b, a);
  // On the left we highlight deletions (words present in `a`/line not matched);
  // on the right we highlight insertions relative to the other line.
  const spans: WordSpan[] = [];
  for (const op of ops) {
    if (op.t === 'eq') {
      spans.push({ text: op.av as string, changed: false });
    } else if (op.t === 'del') {
      // 'del' here is a word of the *first* arg to diffSeq, which is our own line.
      spans.push({ text: op.av as string, changed: true });
    }
    // 'ins' ops belong to the other line; we don't render them on this side.
  }
  return spans;
}

function plainSpans(line: string): WordSpan[] {
  return [{ text: line, changed: false }];
}

function computeDiff(original: string, tailored: string): DiffResult {
  const oLines = normalizeForDiff(original).split('\n');
  const tLines = normalizeForDiff(tailored).split('\n');
  const seq = diffSeq(oLines, tLines);

  const left: DiffLine[] = [];
  const right: DiffLine[] = [];

  let k = 0;
  while (k < seq.length) {
    const op = seq[k];
    if (op.t === 'eq') {
      left.push({ kind: 'same', spans: plainSpans(oLines[op.a]) });
      right.push({ kind: 'same', spans: plainSpans(tLines[op.b]) });
      k++;
      continue;
    }
    // Collect a contiguous block of non-eq ops.
    const dels: number[] = [];
    const inss: number[] = [];
    while (k < seq.length && seq[k].t !== 'eq') {
      const o = seq[k];
      if (o.t === 'del') dels.push(o.a);
      else if (o.t === 'ins') inss.push(o.b);
      k++;
    }
    // Similarity-pair each deleted line to its most-similar unused inserted line.
    const usedIns = new Set<number>();
    const pairForDel: Record<number, number> = {};
    for (const d of dels) {
      let best = -1;
      let bestS = SIM_THRESHOLD;
      for (const ins of inss) {
        if (usedIns.has(ins)) continue;
        const s = similarity(oLines[d], tLines[ins]);
        if (s > bestS) {
          bestS = s;
          best = ins;
        }
      }
      if (best >= 0) {
        pairForDel[d] = best;
        usedIns.add(best);
      }
    }
    // Emit changed/removed on the left in original order.
    for (const d of dels) {
      if (pairForDel[d] !== undefined) {
        const t = pairForDel[d];
        left.push({ kind: 'changed', spans: wordSpans(oLines[d], tLines[t], 'left') });
        right.push({ kind: 'changed', spans: wordSpans(tLines[t], oLines[d], 'right') });
      } else {
        left.push({ kind: 'removed', spans: plainSpans(oLines[d]) });
      }
    }
    // Emit purely-added lines on the right.
    for (const ins of inss) {
      if (!usedIns.has(ins)) {
        right.push({ kind: 'added', spans: plainSpans(tLines[ins]) });
      }
    }
  }

  return { left, right };
}

// ---- Rendering ----

function lineClasses(kind: LineKind, side: 'left' | 'right'): string {
  if (kind === 'same') return 'text-ink-800';
  if (side === 'left') {
    // removed or changed on the original side -> rose
    return 'bg-rose-50 text-rose-900 border-l-2 border-rose-300 pl-2 -ml-2 rounded-sm';
  }
  // added or changed on the tailored side -> emerald
  return 'bg-emerald-50 text-emerald-900 border-l-2 border-emerald-300 pl-2 -ml-2 rounded-sm';
}

function wordHighlight(changed: boolean, side: 'left' | 'right'): string {
  if (!changed) return '';
  return side === 'left' ? 'bg-rose-200/70 rounded-sm' : 'bg-emerald-200/70 rounded-sm';
}

function Paper({
  title,
  accent,
  lines,
  side,
}: {
  title: string;
  accent: string;
  lines: DiffLine[];
  side: 'left' | 'right';
}) {
  return (
    <div className="flex min-w-0 flex-col">
      <div className={`mb-2 ml-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] ${accent}`}>
        {title}
      </div>
      <div className="thin-scroll h-[520px] overflow-auto rounded-xl border border-[#e7e5e0] bg-white p-5 font-mono text-[11.5px] leading-[1.85] text-ink-900 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_28px_rgba(60,50,35,0.10)]">
        {lines.map((ln, i) => (
          <div key={i} className={`whitespace-pre-wrap ${lineClasses(ln.kind, side)}`}>
            {ln.spans.length === 0 || (ln.spans.length === 1 && ln.spans[0].text === '') ? (
              <span>&nbsp;</span>
            ) : (
              ln.spans.map((sp, j) => (
                <span key={j} className={wordHighlight(sp.changed, side)}>
                  {sp.text}
                </span>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DiffViewer({ original, tailored }: Props) {
  const { left, right } = computeDiff(original, tailored);
  return (
    // Calm taupe dot canvas — the two resume documents sit on it as sheets.
    <div
      className="relative overflow-hidden rounded-xl border border-ink-200 p-4 sm:p-6"
      style={{
        backgroundColor: '#faf9f6',
        backgroundImage: 'radial-gradient(circle, rgb(168 157 138 / 0.38) 1px, transparent 1px)',
        backgroundSize: '15px 15px',
      }}
    >
      <div className="relative z-10 grid grid-cols-1 gap-5 md:grid-cols-2">
        <Paper title="Original resume" accent="text-[#9a8f7d]" lines={left} side="left" />
        <Paper title="Tailored resume" accent="text-[#5b9e7a]" lines={right} side="right" />
      </div>
    </div>
  );
}
