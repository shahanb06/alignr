// Per-IP rate limiter for AI-facing endpoints.
//
// Why a rate limit at all:
//   - The Anthropic API key is a real budget. A scraper or accidental loop could burn it.
//   - This is a demo project meant for recruiter traffic, not an open public API.
//
// Why 25/hour by default:
//   - Loose enough for a recruiter to try the tool a few times in a sitting,
//     including a couple of failed attempts.
//   - Tight enough to bound damage from a single abusive IP.
//
// Why we return a friendly message:
//   - The intended user is a human, not a script. A clear next step ("clone and run locally")
//     respects the user's time and steers them to a self-hosted alternative.

const rateLimit = require('express-rate-limit');

const RATE_LIMIT_PER_HOUR = Number(process.env.RATE_LIMIT_PER_HOUR) || 25;

const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: RATE_LIMIT_PER_HOUR,
  standardHeaders: true,
  legacyHeaders: false,
  // The default 429 response is JSON-only. Frontend reads the `error` field.
  handler: (_req, res) => {
    res.status(429).json({
      error:
        'Demo rate limit reached. Try again in an hour, or clone the repo to run locally with your own API key.',
    });
  },
});

// Separate limiter for /api/extract-resume.
//
// Extraction makes no Anthropic call — it is purely local PDF/DOCX text parsing —
// so it must not draw down the AI budget the way it did when it shared
// aiRateLimiter. Uploading a resume, removing it, and uploading a corrected one
// is normal behavior and previously burned three tailor requests.
//
// It still deserves *a* limit (each request parses an untrusted file), so this
// gets its own independent counter with a more generous ceiling.
const UPLOAD_RATE_LIMIT_PER_HOUR = Number(process.env.UPLOAD_RATE_LIMIT_PER_HOUR) || 60;

const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: UPLOAD_RATE_LIMIT_PER_HOUR,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Too many file uploads. Wait a few minutes and try again.',
    });
  },
});

module.exports = { aiRateLimiter, uploadRateLimiter };
