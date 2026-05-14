// Multer configuration for resume file uploads.
//
// Security choices, called out so reviewers can verify:
//   - memoryStorage(): the uploaded file never touches disk, so there are no leftover
//     temp files to clean up and no path-traversal surface.
//   - 5 MB limit: real resumes are well under this. Anything larger is almost certainly
//     not a resume and we should reject it before doing any parsing work.
//   - File-type allowlist by both MIME type AND extension: MIME alone is spoofable,
//     extension alone is spoofable, but together they raise the bar without breaking UX.
//   - We do NOT trust the original filename. We never write it to disk and never
//     reflect it back to the user in error messages.

const multer = require('multer');
const path = require('path');

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.txt']);
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mimeOk = ALLOWED_MIME_TYPES.has(file.mimetype);
  const extOk = ALLOWED_EXTENSIONS.has(ext);

  if (!mimeOk || !extOk) {
    // The error message we attach is matched in the central error handler in index.js
    // and translated into a clean 415 for the client. We never expose this raw.
    return cb(new Error('UNSUPPORTED_FILE_TYPE'));
  }
  cb(null, true);
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1 },
  fileFilter,
});

module.exports = { upload, MAX_FILE_BYTES };
