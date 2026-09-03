// Resume text extraction from in-memory file buffers.
//
// We deliberately import pdf-parse via its internal entry to avoid a known footgun:
// when required as just `pdf-parse`, the package's index.js runs a debug branch that
// tries to read a sample PDF from the package directory, which crashes the server
// at module-load time in many setups.
//
// All extraction happens on Buffers from multer.memoryStorage(). Nothing is written
// to disk. After this function returns, the only retained data is the extracted text,
// which then flows into /api/tailor in the same request lifecycle and is dropped.

const pdfParse = require('pdf-parse/lib/pdf-parse.js');
const mammoth = require('mammoth');
const Anthropic = require('@anthropic-ai/sdk');

const visionClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ---------------------------------------------------------------------------
// Scramble detection heuristic — item 23.
//
// pdf-parse reads left-to-right, line-by-line. On two-column or sidebar
// resumes, this merges columns into single lines, producing output like:
//   "John Doe Education"
//   "Experience 2018-2022 Skills"
//
// Detection: count lines where two or more resume section headers appear
// on the same line. In a well-parsed resume, each header sits on its own
// line. Multiple headers per line is the signature of column-merge.
// ---------------------------------------------------------------------------

const SECTION_HEADERS = /\b(education|experience|skills|projects|work history|employment|summary|objective|certifications?|awards?|interests|activities|publications?|technical skills|relevant experience|professional experience)\b/gi;

function looksScrambled(text) {
  const lines = text.split('\n');
  let multiHeaderLines = 0;
  let veryShortLines = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Count section headers on this line
    const headers = trimmed.match(SECTION_HEADERS);
    if (headers && headers.length >= 2) {
      multiHeaderLines++;
    }

    // Count lines with 1-2 words (column fragments)
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length <= 2 && words.length > 0) {
      veryShortLines++;
    }
  }

  const nonEmptyLines = lines.filter(l => l.trim()).length;
  const shortRatio = nonEmptyLines > 0 ? veryShortLines / nonEmptyLines : 0;

  // Trigger if 2+ lines have merged headers, or >40% of lines are fragments
  return multiHeaderLines >= 2 || shortRatio > 0.4;
}

// ---------------------------------------------------------------------------
// Vision fallback — send the raw PDF to Claude as a document.
// ---------------------------------------------------------------------------

async function extractWithVision(pdfBuffer) {
  const base64 = pdfBuffer.toString('base64');

  // eslint-disable-next-line no-console
  console.log('[extract] pdf-parse output looks scrambled, falling back to vision extraction');

  const response = await visionClient.messages.create({
    model: 'claude-haiku-3-5-20241022',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64,
          },
        },
        {
          type: 'text',
          text: 'Extract all text from this resume PDF. Preserve the original section structure (Education, Experience, Skills, Projects, etc.), bullet points, dates, and formatting hierarchy. Output plain text only, no markdown. Do not summarize or rephrase — extract verbatim.',
        },
      ],
    }],
  });

  const text = Array.isArray(response.content)
    ? response.content
        .filter(b => b && b.type === 'text' && typeof b.text === 'string')
        .map(b => b.text)
        .join('')
    : '';

  return text;
}

// Eagerly load the pdf.js engine at startup.
//
// `pdf-parse/lib/pdf-parse.js` is only a thin wrapper: it lazily does
// `require('./pdf.js/<version>/build/pdf.js')` *inside* the parse call, so the
// first PDF upload after every boot pays the full ~6 MB module load (~100 ms
// measured) on the user's critical path. Requiring it here puts that cost in
// server startup instead; the lazy require inside pdf-parse then hits the
// module cache. PDF_VERSION mirrors pdf-parse's own default.
//
// Wrapped in try/catch on purpose: this is a pure warm-up with no behavioral
// role, so if the vendored path ever moves we degrade to the old lazy load
// rather than failing to boot.
const PDF_VERSION = 'v1.10.100';
try {
  require(`pdf-parse/lib/pdf.js/${PDF_VERSION}/build/pdf.js`);
} catch (err) {
  // eslint-disable-next-line no-console
  console.warn(
    `[Alignr] pdf.js warm-up skipped (${PDF_VERSION}); first PDF upload will load it lazily.`
  );
}

const MAX_EXTRACTED_CHARS = 20000;

function clean(text) {
  if (typeof text !== 'string') return '';
  // Normalize line endings, collapse runs of 3+ blank lines, trim trailing whitespace per line.
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[\t\f\v]+/g, ' ').replace(/[ ]{2,}/g, ' ').trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function truncateWithNotice(text) {
  if (text.length <= MAX_EXTRACTED_CHARS) {
    return { text, warning: null };
  }
  return {
    text: text.slice(0, MAX_EXTRACTED_CHARS),
    warning: `Resume was very long and was truncated to ${MAX_EXTRACTED_CHARS} characters for analysis.`,
  };
}

async function extractFromPdf(buffer) {
  let result;
  try {
    result = await pdfParse(buffer);
  } catch (err) {
    const wrapped = new Error('PDF_EXTRACTION_FAILED');
    wrapped.cause = err;
    wrapped.originalMessage = err && err.message ? err.message : 'unknown';
    throw wrapped;
  }

  const parsed = clean(result.text || '');

  // If pdf-parse produced text but it looks scrambled (multi-column merge),
  // fall back to Claude vision extraction. If vision also fails, return the
  // scrambled text rather than blocking entirely — something is better than
  // nothing, and the paste-text path remains the safety net.
  if (parsed.length >= 50 && looksScrambled(parsed)) {
    try {
      const visionText = await extractWithVision(buffer);
      const cleaned = clean(visionText);
      if (cleaned.length >= 50) {
        // eslint-disable-next-line no-console
        console.log('[extract] vision fallback succeeded, using vision text');
        return cleaned;
      }
      // eslint-disable-next-line no-console
      console.warn('[extract] vision fallback returned too little text, using pdf-parse output');
    } catch (visionErr) {
      // eslint-disable-next-line no-console
      console.error('[extract] vision fallback failed, using pdf-parse output:', visionErr.message);
    }
  }

  return parsed;
}

async function extractFromDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return clean(result.value || '');
}

function extractFromTxt(buffer) {
  return clean(buffer.toString('utf8'));
}

async function extractResumeText(file) {
  if (!file || !file.buffer || !file.mimetype) {
    throw new Error('NO_FILE');
  }

  let sourceType;
  let text;

  if (file.mimetype === 'application/pdf') {
    sourceType = 'pdf';
    text = await extractFromPdf(file.buffer);
  } else if (
    file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    sourceType = 'docx';
    text = await extractFromDocx(file.buffer);
  } else if (file.mimetype === 'text/plain') {
    sourceType = 'txt';
    text = extractFromTxt(file.buffer);
  } else {
    // Should be unreachable thanks to the multer fileFilter, but defense in depth.
    throw new Error('UNSUPPORTED_FILE_TYPE');
  }

  if (!text || text.length < 50) {
    // PDFs that are scanned images, or empty docx, end up here.
    const err = new Error('EXTRACTION_EMPTY');
    err.sourceType = sourceType;
    throw err;
  }

  const { text: finalText, warning } = truncateWithNotice(text);

  return {
    sourceType,
    extractedText: finalText,
    warning,
  };
}

module.exports = { extractResumeText };
