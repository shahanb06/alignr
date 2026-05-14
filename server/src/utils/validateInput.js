// Input validation for the /api/tailor request body.
//
// We intentionally validate in one place so the route handler stays focused on
// orchestration. Anything that comes back from this module is safe to feed to the model.

const MIN_RESUME_CHARS = 200;
const MAX_RESUME_CHARS = 20000;
const MIN_JD_CHARS = 50;
const MAX_JD_CHARS = 10000;
const MAX_TARGET_ROLE_CHARS = 120;

const ALLOWED_STYLES = new Set(['conservative', 'balanced', 'strong']);

function validateTailorRequest(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body is missing or malformed.' };
  }

  const resumeText = typeof body.resumeText === 'string' ? body.resumeText.trim() : '';
  const jobDescription = typeof body.jobDescription === 'string' ? body.jobDescription.trim() : '';
  const targetRole = typeof body.targetRole === 'string' ? body.targetRole.trim() : '';
  const rewriteStyle =
    typeof body.rewriteStyle === 'string' && ALLOWED_STYLES.has(body.rewriteStyle)
      ? body.rewriteStyle
      : 'balanced';

  if (resumeText.length < MIN_RESUME_CHARS) {
    return { ok: false, error: `Resume looks too short. Please paste at least ${MIN_RESUME_CHARS} characters.` };
  }
  if (resumeText.length > MAX_RESUME_CHARS) {
    return { ok: false, error: `Resume is too long. Please trim to under ${MAX_RESUME_CHARS} characters.` };
  }
  if (jobDescription.length < MIN_JD_CHARS) {
    return { ok: false, error: `Job description looks too short. Please paste at least ${MIN_JD_CHARS} characters.` };
  }
  if (jobDescription.length > MAX_JD_CHARS) {
    return { ok: false, error: `Job description is too long. Please trim to under ${MAX_JD_CHARS} characters.` };
  }
  if (targetRole.length > MAX_TARGET_ROLE_CHARS) {
    return { ok: false, error: 'Target role title is too long.' };
  }

  return {
    ok: true,
    value: {
      resumeText,
      jobDescription,
      targetRole,
      rewriteStyle,
    },
  };
}

module.exports = {
  validateTailorRequest,
  MIN_RESUME_CHARS,
  MAX_RESUME_CHARS,
  MIN_JD_CHARS,
  MAX_JD_CHARS,
};
