// POST /api/analyze
//
// Style-blind keyword extraction + match-score computation for a (resume, JD)
// pair. Returns plain JSON (no SSE). Not rate-limited — analysis is cheap and
// pre-empting the tailor call should not eat a user's hourly quota.

const express = require('express');
const { validateTailorRequest } = require('../utils/validateInput');
const { analyzeJobFit } = require('../services/analyzeService');
const analyzeCache = require('../utils/analyzeCache');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    // Reuse the tailor validator. It accepts {resumeText, jobDescription} and
    // defaults the optional style/targetRole — both ignored here.
    const validation = validateTailorRequest(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error });
    }

    const { resumeText, jobDescription } = validation.value;
    const key = analyzeCache.hashKey(resumeText, jobDescription);

    if (analyzeCache.has(key)) {
      // eslint-disable-next-line no-console
      console.log(`[analyze] cache HIT key=${key.slice(0, 12)}…`);
      return res.json(analyzeCache.get(key));
    }

    // eslint-disable-next-line no-console
    console.log(`[analyze] cache MISS key=${key.slice(0, 12)}…, calling model`);

    const result = await analyzeJobFit(resumeText, jobDescription);
    analyzeCache.set(key, result);
    return res.json(result);
  } catch (err) {
    const name = err && err.name ? err.name : 'Error';
    const message = err && err.message ? err.message : 'unknown';
    const stack = err && err.stack ? err.stack : '(no stack)';
    // eslint-disable-next-line no-console
    console.error(`[analyze] ROUTE ERROR: name=${name} message=${message}\n${stack}`);

    if (!res.headersSent) {
      if (message === 'analyze_parse_failed') {
        return res.status(502).json({
          error: 'parse_failed',
          message:
            'The AI returned an analysis we could not structure. Please try again, or paste a different JD.',
        });
      }
      return res.status(500).json({ error: 'server_error', message: 'Analysis failed. Please try again.' });
    }
  }
});

module.exports = router;
