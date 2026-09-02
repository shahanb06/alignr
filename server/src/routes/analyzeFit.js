// POST /api/analyze
//
// Style-blind keyword extraction + match-score computation for a (resume, JD)
// pair. Returns plain JSON (no SSE). Not rate-limited by the hourly limiter —
// analysis is cheap and pre-empting the tailor call should not eat a user's
// hourly tailor budget (see rateLimit.js).
//
// It IS covered by a daily quota (see middleware/dailyQuota.js), checked only
// on a cache MISS. A cache HIT costs nothing and must never consume quota —
// re-checking the same (resume, JD) pair is normal, expected usage.

const express = require('express');
const { validateTailorRequest } = require('../utils/validateInput');
const { analyzeJobFit } = require('../services/analyzeService');
const analyzeCache = require('../utils/analyzeCache');
const { consumeQuota, refundQuota, quotaExceededResponse } = require('../middleware/dailyQuota');

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

    // Cache miss means a real Anthropic call is about to happen — this is the
    // point quota gets checked, not before.
    const quota = await consumeQuota(req, 'analyze');
    if (!quota.allowed) {
      // eslint-disable-next-line no-console
      console.log(`[analyze] quota exceeded, resetsAt=${quota.resetsAt}`);
      return quotaExceededResponse(res, 'analyze', quota.resetsAt);
    }

    // eslint-disable-next-line no-console
    console.log(`[analyze] cache MISS key=${key.slice(0, 12)}…, calling model`);

    let result;
    try {
      result = await analyzeJobFit(resumeText, jobDescription);
    } catch (modelErr) {
      // The call failed before producing anything usable — refund the slot.
      await refundQuota(req, 'analyze');
      throw modelErr;
    }

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
