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


// ---------------------------------------------------------------------------
// Content-quality heuristics — item 20, garbage-input pre-filter.
//
// These run AFTER the length checks pass. They catch inputs that are long
// enough to clear the character floor but are clearly not a resume or a JD
// (random characters, lorem ipsum, repeated lines, binary paste, etc.).
//
// Design rule: a false block is much worse than a weak result. A sparse but
// genuine first-year student resume MUST pass. Only reject the unmistakable
// cases; let everything else through.
// ---------------------------------------------------------------------------

// Common resume section headers (case-insensitive). A real resume almost always
// contains at least one of these.
const RESUME_HEADERS = /\b(education|experience|skills|projects|work|employment|summary|objective|certifications?|awards?|interests|activities|volunteer|publications?)\b/i;

// Date-like patterns: 4-digit years, month abbreviations, "present"/"current".
const DATE_PATTERN = /\b(19|20)\d{2}\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\b|\bpresent\b|\bcurrent\b/i;

// Common JD signal words.
const JD_SIGNALS = /\b(responsibilit|requirement|qualifi|experience|position|role|team|apply|candidate|salary|benefits|stack|technologies|collaborate|engineer|develop|design|manage|intern|full.time|part.time)\b/i;

function alphaRatio(text) {
  if (!text.length) return 0;
  const alpha = text.replace(/[^a-zA-Z]/g, '').length;
  return alpha / text.length;
}

function uniqueLineRatio(text) {
  const lines = text.split(/\n/).map(l => l.trim().toLowerCase()).filter(Boolean);
  if (lines.length === 0) return 1;
  const unique = new Set(lines);
  return unique.size / lines.length;
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function validateResumeContent(text) {
  // Alpha ratio below 0.4 means mostly numbers, symbols, or binary garbage.
  if (alphaRatio(text) < 0.4) {
    return 'This does not look like a resume. Please paste your actual resume text.';
  }

  // Fewer than 15 words even at 200+ chars means repeated characters or padding.
  if (wordCount(text) < 15) {
    return 'Resume content looks too sparse. Please paste your full resume.';
  }

  // More than 70% duplicate lines suggests copy-paste spam.
  if (uniqueLineRatio(text) < 0.3) {
    return 'Resume appears to contain mostly repeated content.';
  }

  // No resume headers AND no date patterns is a strong signal of non-resume text.
  // Either one alone is enough to pass — a minimal resume might have dates but
  // no headers, or headers but no dates.
  const hasHeaders = RESUME_HEADERS.test(text);
  const hasDates = DATE_PATTERN.test(text);
  if (!hasHeaders && !hasDates) {
    return 'This does not look like a resume. We expect sections like Education, Experience, or Skills, and at least some dates.';
  }

  return null; // passes
}

function validateJdContent(text) {
  if (alphaRatio(text) < 0.4) {
    return 'This does not look like a job description.';
  }

  if (wordCount(text) < 10) {
    return 'Job description looks too sparse. Please paste the full posting.';
  }

  if (!JD_SIGNALS.test(text)) {
    return 'This does not look like a job description. Please paste a real job posting.';
  }

  return null; // passes
}

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

  // Content-quality checks (item 20). Run after length is confirmed valid.
  const resumeQuality = validateResumeContent(resumeText);
  if (resumeQuality) {
    return { ok: false, error: resumeQuality };
  }

  const jdQuality = validateJdContent(jobDescription);
  if (jdQuality) {
    return { ok: false, error: jdQuality };
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
