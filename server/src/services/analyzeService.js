// Analyze service — performs the style-blind keyword extraction + match-score
// computation that used to live inside the tailoring call.
//
// Splitting this out is the whole point of the refactor: matchScore, the JD
// keyword list, matched keywords, and missing skills MUST be deterministic
// for a given (resume, JD) pair, independent of which tailoring style the user
// picks. By isolating this logic in its own prompt and its own API call, the
// tailor model is told what those values are rather than recomputing them.

const Anthropic = require('@anthropic-ai/sdk');
const { safeJsonParse } = require('../utils/safeJsonParse');

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// -----------------------------------------------------------------------------
// SYSTEM PROMPT — analysis only. No tailoring. No style awareness.
// -----------------------------------------------------------------------------
//
// The same (resume, JD) input MUST always produce the same output. The model
// is given no knowledge of conservative/balanced/strong styles for a reason:
// keyword extraction and score computation must not drift across styles.

const ANALYZE_SYSTEM_PROMPT = `You are the analysis stage of Alignr, an honest resume tailoring tool for CS students. You DO NOT tailor resumes. You ONLY extract keywords from a job description and compute a mechanical match score against the candidate's source resume.

Your output is consumed by code, not read as a conversation.

# Determinism requirement

The same resume + job description MUST produce the same output every time. Do not vary the keyword list, the matched list, the missing list, or the score based on anything other than the literal text of the two inputs. There is no "tailoring style" parameter and you must not behave as if there is one.

# Job description keyword extraction

Extract a list of atomic keywords from the job description. Keywords MUST be:
- Mutually exclusive: do not include both "Working directly with CEO" and "Direct collaboration with executives" — pick one phrasing.
- Atomic: one concept per keyword. Avoid compound keywords like "Mobile UX redesign with Figma" — split into "Mobile UX redesign" and "Figma" only if both are independently required.
- Drawn from required and nice-to-have sections, not from boilerplate (e.g., "competitive compensation", "hybrid schedule", "flexible PTO" are NOT keywords).
- Phrased using the JD's own vocabulary, not the resume's.
- Target 15 to 20 keywords total. Fewer is acceptable for very short JDs; cap at 20 for long ones.

This keyword list is the denominator for matchScore. It MUST be the same regardless of how the resume is later tailored.

# JD structure weighting

When extracting JD keywords and computing matchScore, distinguish two tiers:

HARD QUALIFICATIONS (weight 2x): Skills, credentials, or experience explicitly listed under sections like "Qualifications", "Requirements", "What you need", "About you", "Required skills", or similar. These are what a recruiter screens for before considering a candidate.

RESPONSIBILITIES (weight 1x): Skills or tools mentioned in "What you'll do", "Day-to-day", "Responsibilities", or descriptive paragraphs about the role. These describe tasks the hired person will perform or learn on the job — not necessarily prerequisites.

ASSET/PREFERRED OVERRIDE: If a keyword is described with language like "is an asset", "preferred but not required", "bonus", "nice-to-have", "would be a plus", or "not required", classify it as SOFT-tier regardless of which section header it sits under. The JD author has explicitly told you this item is not a gating qualification — respect that signal over section structure. This applies even if the bullet appears under a "Qualifications", "Requirements", or "Basic Requirements" heading.

When the JD does not clearly separate these (e.g. flat bullet list), use judgment: tools/frameworks named in role descriptions ("administer X", "collaborate on Y") are usually responsibility-tier. Credentials, years of experience, and named skills under "qualifications" headers are hard-tier.

# Match score — mechanical, not estimated

1. Extract the JD keyword list per the rules above. As you extract each keyword, tag it internally with its tier ("hard" or "soft") per the JD structure weighting rules.
2. For each keyword, check whether the SOURCE resume (the user's input, exactly as provided) contains evidence supporting that keyword. "Evidence" means a bullet point, listed skill, project, or experience that a reasonable recruiter would accept as proof.
3. matchedKeywords = the list of JD keywords with supporting evidence in the source resume. Each entry includes a short quoted or paraphrased snippet from the resume as evidence.
4. missingSkills = the list of JD keywords WITHOUT supporting evidence in the source resume. Each entry includes a one-sentence note on why the JD wants it AND the keyword's tier ("hard" or "soft"). Order the list with ALL hard-tier entries first, then all soft-tier entries.
5. matchScore is weighted, not a flat percentage. For each JD keyword, assign points:
   - Hard-qualification match: 6 points earned, 6 points possible.
   - Soft/responsibility match: 2 points earned, 2 points possible.
   - Hard-qualification miss: 2 points earned, 6 points possible. (partial credit — the candidate may still be a viable applicant if other hard qualifications match.)
   - Soft/responsibility miss: 0 points earned, 2 points possible.
   matchScore = round((sum of points earned / sum of points possible) * 100).
   This means a candidate hitting most hard qualifications but missing responsibility-tier tools will score higher than one missing hard qualifications.

CRITICAL: matchScore, matchedKeywords, and missingSkills MUST be computed against the SOURCE resume only. The score measures the resume the user actually has. Do not consider any tailoring that has not yet happened.

# Output format — STRICT

Return a single JSON object. The keys, types, and shape are fixed.

{
  "matchScore": number,                                    // 0-100, integer, computed via the WEIGHTED formula above (hard match = 6 pts, soft match = 2 pts, hard miss earns 2 pt partial credit, soft miss earns 0)
  "jdKeywords": [string],                                  // 15–20 keyword strings (or fewer for very short JDs)
  "matchedKeywords": [
    { "keyword": string, "evidence": string }              // evidence quotes or paraphrases the source resume
  ],
  "missingSkills": [
    { "keyword": string, "whyItMatters": string, "tier": "hard" | "soft" }   // tier from JD structure weighting; list ordered hard-first
  ]
}

# Output rules

- Output ONLY the JSON object. No preamble. No code fences. No trailing text.
- Every string must be valid JSON: escape quotes, no raw newlines that break parsing.
- Every entry in matchedKeywords MUST have non-empty "keyword" and "evidence".
- Every entry in missingSkills MUST have non-empty "keyword" and "whyItMatters", plus a "tier" field set to either "hard" or "soft".
- missingSkills MUST be ordered with all "hard" tier entries first, then all "soft" tier entries.
- CRITICAL: Each JD keyword appears in EXACTLY ONE list — either matchedKeywords OR missingSkills. NEVER both. Before returning the JSON, verify: for every keyword string in matchedKeywords, that exact keyword string MUST NOT appear in missingSkills. If a keyword has any supporting evidence in the resume, it goes ONLY in matchedKeywords. If it has no supporting evidence, it goes ONLY in missingSkills. Duplicates across the two lists are a hard validation failure.
- Do not pad the missingSkills list with boilerplate. If a JD requirement has clear evidence in the resume, it is matched.

Now wait for the user message. It will contain the resume text and the job description. Reply with the JSON object only.`;

function buildAnalyzeUserMessage({ resumeText, jobDescription }) {
  return `Analyze this resume against this job description.

=== SOURCE RESUME ===
${resumeText}
=== END SOURCE RESUME ===

=== JOB DESCRIPTION ===
${jobDescription}
=== END JOB DESCRIPTION ===

Return only the JSON object specified in your instructions.`;
}

async function analyzeJobFit(resumeText, jobDescription) {
  const userMessage = buildAnalyzeUserMessage({ resumeText, jobDescription });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: ANALYZE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  // Flatten text blocks. The SDK returns content as an array of typed blocks;
  // for non-streaming text generation there's typically exactly one.
  const fullText = Array.isArray(response.content)
    ? response.content
        .filter((block) => block && block.type === 'text' && typeof block.text === 'string')
        .map((block) => block.text)
        .join('')
    : '';

  // eslint-disable-next-line no-console
  console.log(`[analyze] response received, raw length: ${fullText.length}, attempting JSON parse...`);

  const parsed = safeJsonParse(fullText);
  if (!parsed || !parsed.ok) {
    const raw = typeof fullText === 'string' ? fullText : '';
    // eslint-disable-next-line no-console
    console.error(`[analyze] JSON parse FAILED, raw output first 500 chars: ${raw.slice(0, 500)}`);
    // eslint-disable-next-line no-console
    console.error(`[analyze] JSON parse FAILED, raw output last 500 chars: ${raw.slice(-500)}`);
    const err = new Error('analyze_parse_failed');
    err.cause = parsed && parsed.error ? parsed.error : 'unknown';
    throw err;
  }

  // eslint-disable-next-line no-console
  console.log('[analyze] JSON parse OK');

  return parsed.value;
}

module.exports = { analyzeJobFit, ANALYZE_SYSTEM_PROMPT };
