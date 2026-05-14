// POST /api/extract-resume
//
// Accepts a single uploaded file (PDF / DOCX / TXT), runs in-memory extraction,
// and returns the cleaned text. The file buffer is discarded as soon as this
// function returns — nothing is persisted.

const express = require('express');
const { upload } = require('../middleware/upload');
const { extractResumeText } = require('../services/resumeExtractionService');

const router = express.Router();

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const result = await extractResumeText(req.file);

    // result: { sourceType, extractedText, warning }
    return res.json(result);
  } catch (err) {
    // We translate internal error codes into clean, user-facing messages.
    // We never include err.stack or err.message verbatim — those can leak file paths.
    if (err && err.message === 'UNSUPPORTED_FILE_TYPE') {
      return res.status(415).json({ error: 'Unsupported file type. Upload a PDF, DOCX, or TXT file.' });
    }
    if (err && err.message === 'PDF_EXTRACTION_FAILED') {
      // eslint-disable-next-line no-console
      console.error('[extract-resume] pdf-parse failed:', err.originalMessage || 'unknown');
      return res.status(422).json({
        error: 'pdf_extraction_failed',
        message:
          "We couldn't read this PDF. Try copying the text and pasting it into the textarea, or upload a DOCX or TXT version of your resume.",
      });
    }
    if (err && err.message === 'EXTRACTION_EMPTY') {
      return res.status(422).json({
        error:
          'We could not read any text from that file. If it is a scanned PDF, please paste the resume text manually.',
      });
    }
    if (err && err.message === 'NO_FILE') {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    // eslint-disable-next-line no-console
    console.error('[extract-resume] error:', err && err.message ? err.message : 'unknown');
    return res.status(500).json({ error: 'Could not extract text from that file.' });
  }
});

module.exports = router;
