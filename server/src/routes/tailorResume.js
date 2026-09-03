// POST /api/tailor
//
// Streams the tailoring response as Server-Sent Events.
//
// SSE event types emitted:
//   event: progress  data: { stage: string, label: string }
//   event: chunk     data: { text: string }            // raw model text deltas
//   event: done      data: { result: <parsed JSON> }
//   event: error     data: { message: string }
//
// The frontend uses `progress` to drive the status pill ("Analyzing job
// requirements…", "Rewriting supported resume content…", etc.) and `done` to
// render the final structured output. `chunk` is forwarded for future use
// (e.g., a streaming raw-output debug view) but the UI does not depend on it.
//
// Daily quota (middleware/dailyQuota.js) is checked and consumed HERE, after
// validation but BEFORE any SSE header is set. This is deliberate: once
// Content-Type is set to text/event-stream, a 429 can no longer be a plain
// JSON response — it would have to be an SSE `error` event instead, which
// the client handles on a different code path than a real HTTP 429. Placing
// the check in this exact gap keeps quota-exhausted responses as ordinary
// JSON 429s, indistinguishable in shape from /api/analyze's.
//
// If the quota slot is consumed but the model call then fails (thrown error,
// or a JSON parse failure after generation completes), the slot is refunded
// — the user got nothing usable and it should not cost them one of their
// three tailorings. A successful `done` event is not refunded.

const express = require('express');
const { validateTailorRequest } = require('../utils/validateInput');
const { safeJsonParse } = require('../utils/safeJsonParse');
const { streamTailoredResume } = require('../services/anthropicService');
const { analyzeJobFit } = require('../services/analyzeService');
const analyzeCache = require('../utils/analyzeCache');
const { consumeQuota, refundQuota, quotaExceededResponse } = require('../middleware/dailyQuota');

const router = express.Router();

function writeSseEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

router.post('/', async (req, res) => {
  let heartbeat = null;
  const progressTimers = [];
  let clientDisconnected = false;
  let headersSent = false;
  let quotaConsumed = false;

  try {
    const validation = validateTailorRequest(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error });
    }

    // Quota check — must happen here, before any SSE header is set (see
    // file header comment for why). A 429 at this point is a normal JSON
    // response, same shape as /api/analyze's.
    const quota = await consumeQuota(req, 'tailor');
    if (!quota.allowed) {
      // eslint-disable-next-line no-console
      console.log(`[tailor] quota exceeded, resetsAt=${quota.resetsAt}`);
      return quotaExceededResponse(res, 'tailor', quota.resetsAt);
    }
    quotaConsumed = true;

    // SSE headers. Disable proxy buffering hints so streaming works behind common reverse proxies.
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders && res.flushHeaders();
    headersSent = true;

    // Heartbeat to keep proxies from closing the connection on long generations.
    heartbeat = setInterval(() => {
      res.write(`:ping\n\n`);
    }, 15000);

    // Predetermined progress milestones. We fire these on a light schedule so the UI
    // shows meaningful status without us having to parse partial JSON to detect stages.
    function scheduleProgress(ms, stage, label) {
      progressTimers.push(
        setTimeout(() => {
          writeSseEvent(res, 'progress', { stage, label });
        }, ms)
      );
    }
    // Note: the "Analyzing job requirements…" stage is intentionally not scheduled
    // here — analysis runs in /api/analyze before this route is even called.
    scheduleProgress(0, 'matching', 'Matching resume evidence against requirements…');
    scheduleProgress(4000, 'rewriting', 'Rewriting supported resume content…');
    scheduleProgress(10000, 'humanizing', 'Removing robotic phrasing and finalizing…');

    req.on('close', () => {
      clientDisconnected = true;
      if (heartbeat) clearInterval(heartbeat);
      progressTimers.forEach(clearTimeout);
    });

    // Pre-tailor analyze step. The frontend calls /api/analyze first and the result
    // is already cached; we only fall back to computing it if the cache is empty
    // (e.g., the frontend skipped /api/analyze, or the server restarted between
    // the two calls). Either way, the tailor model receives a style-blind result.
    const cacheKey = analyzeCache.hashKey(
      validation.value.resumeText,
      validation.value.jobDescription
    );
    let analyzeResult = analyzeCache.get(cacheKey);
    if (!analyzeResult) {
      // eslint-disable-next-line no-console
      console.log(`[tailor] analyze cache MISS key=${cacheKey.slice(0, 12)}…, computing inline`);
      analyzeResult = await analyzeJobFit(
        validation.value.resumeText,
        validation.value.jobDescription
      );
      analyzeCache.set(cacheKey, analyzeResult);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[tailor] analyze cache HIT key=${cacheKey.slice(0, 12)}…`);
    }

    if (clientDisconnected) return;

    const fullText = await streamTailoredResume({
      input: validation.value,
      analyzeResult,
      onChunk: (delta) => {
        if (clientDisconnected) return;
        writeSseEvent(res, 'chunk', { text: delta });
      },
    });

    if (clientDisconnected) return;

    // eslint-disable-next-line no-console
    console.log(
      `[tailor] stream complete, total output chars: ${fullText ? fullText.length : 0}, attempting JSON parse...`
    );

    {
      const rawForLog = typeof fullText === 'string' ? fullText : '';
      const trimmedForLog = rawForLog.trim();
      const firstChar = trimmedForLog.length > 0 ? trimmedForLog[0] : '';
      const lastChar =
        trimmedForLog.length > 0 ? trimmedForLog[trimmedForLog.length - 1] : '';
      // eslint-disable-next-line no-console
      console.log(
        `[tailor] full raw output length: ${rawForLog.length}, first char: '${firstChar}', last char: '${lastChar}'`
      );
    }

    const parsed = safeJsonParse(fullText);
    if (!parsed || !parsed.ok) {
      const raw = typeof fullText === 'string' ? fullText : '';
      // eslint-disable-next-line no-console
      console.error(`[tailor] JSON parse FAILED, raw output first 500 chars: ${raw.slice(0, 500)}`);
      // eslint-disable-next-line no-console
      console.error(`[tailor] JSON parse FAILED, raw output last 500 chars: ${raw.slice(-500)}`);
      // Model ran, tokens were spent, output was unusable — refund.
      if (quotaConsumed) {
        await refundQuota(req, 'tailor');
        quotaConsumed = false;
      }
      writeSseEvent(res, 'error', {
        error: 'parse_failed',
        message:
          'The AI returned a response we could not structure. This sometimes happens with unusual resume/JD combinations. Please try again, or paste a different JD.',
      });
      return;
    }

    // eslint-disable-next-line no-console
    console.log('[tailor] JSON parse OK, checking summary quality...');

    // Post-generation quality gate: catch generic professional summaries.
    // These phrases are never anchored in real experience and signal the
    // model ignored the prompt's negative examples.
    if (parsed.value.professionalSummary) {
      const summary = parsed.value.professionalSummary.toLowerCase();
      const GENERIC_PHRASES = [
        'results-driven', 'self-starter', 'passionate about', 'highly motivated',
        'detail-oriented professional', 'track record of excellence', 'leverag',
        'committed to delivering', 'seeking to', 'eager to', 'proven ability',
        'dynamic individual', 'go-getter', 'team player with',
      ];
      const isGeneric = GENERIC_PHRASES.some(p => summary.includes(p));
      if (isGeneric) {
        // eslint-disable-next-line no-console
        console.warn('[tailor] WARN: generic summary detected, clearing it');
        parsed.value.professionalSummary = '';
        if (!parsed.value.recruiterWarnings) parsed.value.recruiterWarnings = [];
        parsed.value.recruiterWarnings.push({
          issue: 'The generated professional summary was too generic and was removed.',
          suggestion: 'Consider writing a summary yourself that names your specific technologies, projects, and the role you held.',
        });
      }
    }

    // eslint-disable-next-line no-console
    console.log('[tailor] sending result event');

    // Defense-in-depth: the prompt forbids score/keyword fields in tailor output,
    // but the model has been known to override MUST NOT directives. Strip silently
    // and warn so leakage is visible in logs without breaking the response.
    {
      const leaked = [];
      if (parsed.value.matchScore !== undefined) {
        delete parsed.value.matchScore;
        leaked.push('matchScore');
      }
      if (parsed.value.matchedKeywords !== undefined) {
        delete parsed.value.matchedKeywords;
        leaked.push('matchedKeywords');
      }
      if (parsed.value.missingSkills !== undefined) {
        delete parsed.value.missingSkills;
        leaked.push('missingSkills');
      }
      if (parsed.value.matchedKeywordCount !== undefined) {
        delete parsed.value.matchedKeywordCount;
        leaked.push('matchedKeywordCount');
      }
      if (parsed.value.totalKeywordCount !== undefined) {
        delete parsed.value.totalKeywordCount;
        leaked.push('totalKeywordCount');
      }
      if (parsed.value.keywordsMatched !== undefined) {
        delete parsed.value.keywordsMatched;
        leaked.push('keywordsMatched');
      }
      if (parsed.value.missingKeywords !== undefined) {
        delete parsed.value.missingKeywords;
        leaked.push('missingKeywords');
      }
      if (leaked.length > 0) {
        // eslint-disable-next-line no-console
        console.warn(
          `[tailor] WARN: model leaked forbidden analyze fields, stripped: ${leaked.join(', ')}`
        );
      }
    }

    // Ensure originalResume is set, even if the model omitted it.
    if (typeof parsed.value.originalResume !== 'string' || !parsed.value.originalResume.trim()) {
      parsed.value.originalResume = validation.value.resumeText;
    }

    writeSseEvent(res, 'done', { result: parsed.value });
  } catch (err) {
    const name = err && err.name ? err.name : 'Error';
    const message = err && err.message ? err.message : 'unknown';
    const stack = err && err.stack ? err.stack : '(no stack)';
    // eslint-disable-next-line no-console
    console.error(`[tailor] ROUTE ERROR: name=${name} message=${message}\n${stack}`);

    // The call threw before producing a usable result — refund if a slot
    // was consumed and not already refunded on the parse-failure path above.
    if (quotaConsumed) {
      await refundQuota(req, 'tailor');
      quotaConsumed = false;
    }

    if (!clientDisconnected) {
      if (headersSent) {
        try {
          writeSseEvent(res, 'error', { error: 'server_error', message });
        } catch (_writeErr) {
          // ignore — we'll just close
        }
      } else if (!res.headersSent) {
        try {
          res.status(500).json({ error: 'server_error', message });
        } catch (_writeErr) {
          // ignore
        }
      }
    }
  } finally {
    if (heartbeat) clearInterval(heartbeat);
    progressTimers.forEach(clearTimeout);
    if (!clientDisconnected && headersSent && !res.writableEnded) {
      res.end();
    }
  }
});

module.exports = router;
