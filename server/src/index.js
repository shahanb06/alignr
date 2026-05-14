// Alignr — Express server entry point.
//
// Responsibilities:
//   - Load environment variables.
//   - Wire CORS for the Vite dev frontend.
//   - Mount the two product endpoints: /api/extract-resume and /api/tailor.
//   - Apply rate limiting to both AI-facing endpoints to protect the API key budget.
//   - Provide a tiny /api/health probe.
//
// Security notes:
//   - The Anthropic API key is read here and only used inside services/anthropicService.js.
//     It is never sent to the client and never echoed in error responses.
//   - Errors are normalized to a generic shape — stack traces never leave the server.

require('dotenv').config();

const express = require('express');
const cors = require('cors');

const extractResumeRoute = require('./routes/extractResume');
const tailorResumeRoute = require('./routes/tailorResume');
const analyzeFitRoute = require('./routes/analyzeFit');
const { aiRateLimiter } = require('./middleware/rateLimit');

const app = express();

const PORT = Number(process.env.PORT) || 8787;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

if (!process.env.ANTHROPIC_API_KEY) {
  // Fail loud at boot rather than at first request.
  // The server still starts so /api/health works, but tailoring will return 500.
  // eslint-disable-next-line no-console
  console.warn('[Alignr] ANTHROPIC_API_KEY is not set. /api/tailor will fail until it is configured.');
}

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
  })
);

// JSON parser for /api/tailor. /api/extract-resume uses multer for multipart.
// 1 MB is plenty for pasted resume text + JD; file uploads are handled separately.
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6' });
});

// Rate-limited AI endpoints. /api/analyze is intentionally NOT rate-limited:
// it runs unconditionally before /api/tailor and is cheap; counting it would
// halve the user's effective tailor budget.
app.use('/api/extract-resume', aiRateLimiter, extractResumeRoute);
app.use('/api/tailor', aiRateLimiter, tailorResumeRoute);
app.use('/api/analyze', analyzeFitRoute);

// Centralized error handler. Never leak stack traces.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  // Log internally only. Do not log the request body — it may contain a full resume.
  // eslint-disable-next-line no-console
  console.error('[Alignr] unhandled error:', err && err.message ? err.message : 'unknown');

  if (res.headersSent) {
    return;
  }

  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File is too large. Max 5 MB.' });
  }
  if (err && err.message === 'UNSUPPORTED_FILE_TYPE') {
    return res.status(415).json({ error: 'Unsupported file type. Upload a PDF, DOCX, or TXT file.' });
  }

  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[Alignr] server listening on http://localhost:${PORT}`);
});
