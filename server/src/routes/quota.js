// GET /api/quota
//
// Read-only status check. Used by the client to render remaining-count UI
// and to pre-check before calling /api/tailor, so the common case never
// hits the streaming route's own quota guard. Does not consume quota.

const express = require('express');
const { getQuotaStatus } = require('../middleware/dailyQuota');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const status = await getQuotaStatus(req);
    return res.json(status);
  } catch (err) {
    const message = err && err.message ? err.message : 'unknown';
    // eslint-disable-next-line no-console
    console.error(`[quota] ROUTE ERROR: ${message}`);
    return res.status(500).json({ error: 'server_error', message: 'Could not read quota status.' });
  }
});

module.exports = router;
