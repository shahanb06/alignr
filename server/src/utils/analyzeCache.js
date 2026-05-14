// In-memory cache for analyze-fit results.
//
// Keyed by sha256(resumeText + jobDescription) of the raw, un-normalized inputs.
// Both /api/analyze and /api/tailor consult this cache so the matchScore, JD
// keyword list, matched-keyword list, and missing-skills list stay bit-for-bit
// identical across tailoring styles for the same (resume, JD) pair.
//
// Lifetime: process lifetime. No TTL, no eviction. A server restart wipes the
// cache, which is fine — the next request just recomputes.

const crypto = require('crypto');

const store = new Map();

function hashKey(resumeText, jobDescription) {
  return crypto
    .createHash('sha256')
    .update(String(resumeText) + String(jobDescription))
    .digest('hex');
}

function get(key) {
  return store.has(key) ? store.get(key) : null;
}

function set(key, value) {
  store.set(key, value);
}

function has(key) {
  return store.has(key);
}

module.exports = { hashKey, get, set, has };
