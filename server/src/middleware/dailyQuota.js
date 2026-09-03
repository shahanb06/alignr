// Daily quota for AI-facing endpoints, backed by Supabase Postgres.
//
// Why a daily quota on top of the hourly rate limiter:
//   - The hourly limiter (rateLimit.js) stops bursts/scraping within a short
//     window. It does not cap total daily spend on the Anthropic API key.
//   - This is a demo project meant for recruiter traffic. A soft daily cap
//     bounds worst-case cost while staying generous enough for normal use.
//
// Why /api/tailor gets 3/day and /api/analyze gets 10/day:
//   - Tailor runs Sonnet and streams a full rewrite — the expensive call.
//   - Analyze runs Haiku and is cache-backed (see analyzeCache) — cheap, and
//     checking fit across several job postings before committing a tailor
//     run is the correct way to use this product. It should be the more
//     generous limit, not an afterthought.
//
// Why Postgres instead of in-memory:
//   - Render's free tier sleeps the instance; in-memory counters would reset
//     on every cold start, making the "daily" limit meaningless.
//   - The increment is done via a Postgres function (increment_quota) that
//     locks the row (`for update`) before checking/incrementing, so
//     concurrent requests from the same client cannot both succeed past the
//     limit. A plain read-then-write from Node would have that race.
//
// Why check-then-consume rather than a single gate:
//   - /api/analyze is cache-backed. A cache hit costs nothing and must not
//     consume quota. So quota is only touched at the point a real Anthropic
//     call is about to happen, inside each route — not as blanket middleware.
//
// Why refunds exist:
//   - A quota slot is consumed optimistically before the Anthropic call.
//     If the call throws, or /api/tailor's own JSON parsing fails after a
//     successful generation, the user got nothing usable — that should not
//     cost them one of their three tailorings. Refund puts the slot back.
//   - A client disconnect AFTER the `done` event already fired is not
//     refunded — they received their result.

const { createClient } = require('@supabase/supabase-js');

const DAILY_TAILOR_LIMIT = Number(process.env.DAILY_TAILOR_LIMIT) || 3;
const DAILY_ANALYZE_LIMIT = Number(process.env.DAILY_ANALYZE_LIMIT) || 10;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Same identity source the hourly limiter relies on via `trust proxy`.
// Express resolves req.ip correctly now that trust proxy is set in index.js.
function clientKeyFrom(req) {
  // Render places more than one proxy hop in front of this process, so req.ip
  // (even with trust proxy set) can resolve to a rotating internal 10.x
  // address. The real client is the left-most entry of X-Forwarded-For.
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    const first = xff.split(',')[0].trim();
    if (first) return first;
  }
  return req.ip || 'unknown';
}

function limitForScope(scope) {
  return scope === 'tailor' ? DAILY_TAILOR_LIMIT : DAILY_ANALYZE_LIMIT;
}

// Attempts to consume one unit of quota for (client, scope).
// Returns { allowed, currentCount, limit, resetsAt }.
// On any Supabase error, fails OPEN (allowed: true) — a quota-layer outage
// should not take down the product; the hourly limiter is still in effect
// as the hard backstop.
async function consumeQuota(req, scope) {
  const clientKey = clientKeyFrom(req);
  const limit = limitForScope(scope);

  const { data, error } = await supabase.rpc('increment_quota', {
    p_client_key: clientKey,
    p_scope: scope,
    p_limit: limit,
  });

  if (error) {
    // eslint-disable-next-line no-console
    console.error(`[quota] Supabase error on consume, failing open: ${error.message}`);
    return { allowed: true, currentCount: 0, limit, resetsAt: null };
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    allowed: row.allowed,
    currentCount: row.current_count,
    limit,
    resetsAt: row.resets_at,
  };
}

// Puts a previously consumed unit back. Used when the Anthropic call failed
// or the model's output could not be used. Best-effort — logs on failure but
// never throws, since a failed refund should not mask the original error.
async function refundQuota(req, scope) {
  const clientKey = clientKeyFrom(req);
  const { error } = await supabase.rpc('decrement_quota', {
    p_client_key: clientKey,
    p_scope: scope,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error(`[quota] Supabase error on refund (non-fatal): ${error.message}`);
  }
}

// Read-only status check, used by GET /api/quota. Does not consume.
async function getQuotaStatus(req) {
  const clientKey = clientKeyFrom(req);
  const { data, error } = await supabase
    .from('quota_counts')
    .select('scope, count, window_start')
    .eq('client_key', clientKey);

  if (error) {
    // eslint-disable-next-line no-console
    console.error(`[quota] Supabase error on status read: ${error.message}`);
    return {
      tailor: { remaining: DAILY_TAILOR_LIMIT, limit: DAILY_TAILOR_LIMIT, resetsAt: null },
      analyze: { remaining: DAILY_ANALYZE_LIMIT, limit: DAILY_ANALYZE_LIMIT, resetsAt: null },
    };
  }

  const now = Date.now();
  const byScope = { tailor: null, analyze: null };
  for (const row of data) {
    byScope[row.scope] = row;
  }

  function statusFor(scope, limit) {
    const row = byScope[scope];
    if (!row) return { remaining: limit, limit, resetsAt: null };
    const windowStart = new Date(row.window_start).getTime();
    const expired = now - windowStart > 24 * 60 * 60 * 1000;
    if (expired) return { remaining: limit, limit, resetsAt: null };
    return {
      remaining: Math.max(limit - row.count, 0),
      limit,
      resetsAt: new Date(windowStart + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  return {
    tailor: statusFor('tailor', DAILY_TAILOR_LIMIT),
    analyze: statusFor('analyze', DAILY_ANALYZE_LIMIT),
  };
}

// Standard 429 body shape, consistent with rateLimit.js's JSON-only errors.
function quotaExceededResponse(res, scope, resetsAt) {
  return res.status(429).json({
    code: 'daily_limit_reached',
    scope,
    resetsAt,
    error:
      scope === 'tailor'
        ? "That's today's three tailorings. Come back tomorrow, or clone the repo to run locally with your own API key."
        : "That's today's ten fit checks. Come back tomorrow, or clone the repo to run locally with your own API key.",
  });
}

module.exports = { consumeQuota, refundQuota, getQuotaStatus, quotaExceededResponse };
