// Best-effort JSON extraction from a model response.
//
// Claude is instructed to return strict JSON. In practice, real outputs sometimes
// include code fences, preamble ("Here's the tailored output: { ... }"), trailing
// commentary, or trailing commas. This helper recovers gracefully without ever
// trusting the wrapper text.
//
// Strategy:
//   1. Try JSON.parse on the trimmed string directly. Fast path for well-behaved output.
//   2. Strip ```json ... ``` (or unlabeled ``` ... ```) fences if present.
//   3. Find the first '{' and walk forward counting braces — while respecting string
//      literals so that '{' / '}' inside JSON strings don't throw the counter off.
//      This handles preamble before '{' and trailing text after the matching '}'.
//   4. For each candidate substring, try a clean parse first, then a second pass
//      that strips trailing commas before `}` / `]`.
//   5. Validate that the result is an object containing at least one expected key.

const REQUIRED_TOP_LEVEL_KEYS = [
  'matchScore',
  'tailoredResume',
  'rewrittenBullets',
  'changesExplained',
];

function attempt(parse) {
  try {
    const value = parse();
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value;
    }
  } catch (_err) {
    // fall through to next attempt
  }
  return null;
}

// Find the first balanced { ... } substring in `text`. The scanner respects JSON
// string literals (including \" escapes), so braces inside string values do not
// affect the depth counter. Returns the matched substring, or null if none.
function findBalancedObject(text) {
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

// Remove commas that appear immediately before `}` or `]` (with only whitespace
// between). Respects string literals so commas inside strings are preserved.
function stripTrailingCommas(jsonText) {
  let out = '';
  let inString = false;
  let escape = false;

  for (let i = 0; i < jsonText.length; i++) {
    const ch = jsonText[i];
    if (escape) {
      out += ch;
      escape = false;
      continue;
    }
    if (inString) {
      out += ch;
      if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    if (ch === ',') {
      let j = i + 1;
      while (
        j < jsonText.length &&
        (jsonText[j] === ' ' ||
          jsonText[j] === '\n' ||
          jsonText[j] === '\r' ||
          jsonText[j] === '\t')
      ) {
        j += 1;
      }
      if (j < jsonText.length && (jsonText[j] === '}' || jsonText[j] === ']')) {
        // skip this trailing comma
        continue;
      }
    }
    out += ch;
  }
  return out;
}

function parseDirectThenStripped(text) {
  let value = attempt(() => JSON.parse(text));
  if (value) return value;
  const cleaned = stripTrailingCommas(text);
  if (cleaned !== text) {
    value = attempt(() => JSON.parse(cleaned));
    if (value) return value;
  }
  return null;
}

function safeJsonParse(raw) {
  if (typeof raw !== 'string') {
    return { ok: false, error: 'Model did not return text.' };
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: 'Model returned an empty response.' };
  }

  // Attempt 1: direct parse (and trailing-comma-tolerant retry).
  let value = parseDirectThenStripped(trimmed);

  // Attempt 2: strip fenced code blocks. Matches ```json...``` and plain ```...```.
  if (!value) {
    const fenced = trimmed.match(/```(?:[a-zA-Z0-9_-]+)?\s*([\s\S]*?)```/);
    if (fenced && fenced[1]) {
      value = parseDirectThenStripped(fenced[1].trim());
    }
  }

  // Attempt 3: find the first balanced { ... } substring. Handles both preamble
  // before '{' and trailing text after the matching '}'.
  if (!value) {
    const balanced = findBalancedObject(trimmed);
    if (balanced) {
      value = parseDirectThenStripped(balanced);
    }
  }

  if (!value) {
    return { ok: false, error: 'Model response was not valid JSON.' };
  }

  const hasAnyRequired = REQUIRED_TOP_LEVEL_KEYS.some((k) =>
    Object.prototype.hasOwnProperty.call(value, k)
  );
  if (!hasAnyRequired) {
    return { ok: false, error: 'Model response did not match the expected structure.' };
  }

  return { ok: true, value };
}

module.exports = { safeJsonParse };
