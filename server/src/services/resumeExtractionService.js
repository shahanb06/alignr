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
  return clean(result.text || '');
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
