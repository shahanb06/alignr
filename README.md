# Alignr

An honest AI resume-tailoring tool. Paste a resume and a job description, and Alignr rewrites only what's already supported by the source resume — **without fabricating experience, employers, degrees, metrics, or skills.**

**Live:** [alignrai.net](https://alignrai.net)

> **Live demo — rate-limited, please be patient.** The hosted version runs on a single shared API key. If you hit the limit, clone the repo and run locally with your own Anthropic API key.

<!--
Add a screenshot to make this README land harder. Drop an image at docs/screenshot.png
(a capture of the results view — match score, diff, recruiter warnings — works best),
then uncomment the line below:

![Alignr](docs/screenshot.png)
-->

---

## The problem

Tailoring a resume to a specific job is tedious, and the usual shortcuts are worse than doing it by hand:

1. **Manual tailoring.** Slow, repetitive, and easy to miss keywords a recruiter or ATS will screen for.
2. **AI "resume optimizers."** Most of them silently invent technologies, inflate scope, and produce paragraphs of buzzword soup. The output might clear a keyword filter, then falls apart the moment someone asks about it in an interview.

Alignr takes a third path: **edit only what's already supported by the source resume, and be honest about everything else.**

## Who it's for

- Job seekers tailoring a resume to a specific posting — especially early-career applicants and people changing fields, where every honest keyword match counts.
- Anyone who wants AI help with a resume but doesn't want it inventing things they'll have to defend later.
- Career-services teams that need a tool they can actually trust to put in front of students.

## Features

- **Two resume input methods** — paste plain text, or upload a **PDF / DOCX / TXT** file (max 5 MB). When both are provided, the uploaded file wins and the UI tells you so.
- **Editable extracted-text preview** — review what the parser actually read before you click tailor.
- **Job description input** with an optional target role title and a tailoring-style selector (Light / Balanced / Aggressive).
- **Honest, structured output:**
  - Match score (0–100)
  - Matched keywords with the evidence that backs each one
  - Missing keywords with a one-line explanation of why they matter
  - Tailored professional summary
  - Side-by-side **rewritten bullets** with `before`, `after`, and `reason` for every change
  - Section-level "Changes Explained"
  - Recruiter warnings (gaps, vague bullets, weak metrics)
  - **Diff view** of the entire resume — original vs. tailored
  - Final tailored resume as plain text, with one-click copy
- **SSE streaming** with staged progress labels — *Analyzing job requirements… Matching evidence… Rewriting supported content… Removing robotic phrasing…*
- **No accounts, no database, no persistence.** Single session.

## Architecture

```
resume-fit-ai/
  client/          React 18 + Vite 5 + TypeScript + Tailwind 3
    src/
      components/  ResumeInputPanel, JobDescriptionPanel, ResultsPanel,
                   DiffViewer, KeywordChips, CopyButton, LoadingState, EmptyState
      lib/         api.ts (SSE reader), types.ts
      App.tsx      single-page three-zone layout
  server/          Express 4 + Anthropic SDK + multer + pdf-parse + mammoth
    src/
      routes/      /api/extract-resume, /api/tailor
      services/    anthropicService (system prompt lives here), resumeExtractionService
      middleware/  rateLimit, upload
      utils/       validateInput, safeJsonParse
```

### Request flow

1. **Resume upload (optional):** `POST /api/extract-resume` → multer in-memory → `pdf-parse` or `mammoth` or plain UTF-8 → cleaned text → returned to client. The buffer never touches disk.
2. **Tailor:** `POST /api/tailor` with `{ resumeText, jobDescription, targetRole, rewriteStyle }`. The server validates inputs, calls Claude with a long anti-fabrication system prompt, and streams the response back as Server-Sent Events.
3. **Streaming:** the server emits `progress` events for the UI's status pill, forwards `chunk` text deltas, and finishes with a `done` event containing the parsed structured JSON.

## AI safety constraints

The system prompt is the most important file in this repo. It lives in `server/src/services/anthropicService.js` and the model is **instructed**, in plain language repeated multiple times, that it must:

- Never invent work experience, employers, degrees, projects, or metrics.
- Never add skills, languages, frameworks, libraries, or tools that aren't already in the source.
- Never claim seniority or scope (e.g. "led a team") the candidate didn't have.
- Never keyword-stuff or reorder roles to hide gaps.
- Never produce marketing phrases like "100% ATS optimized."
- **List missing skills under `missingKeywords` rather than smuggling them into the resume.**
- Explain every meaningful change with a `reason`, so the user can trust or reject it.

The prompt includes a worked **good rewrite** example and a worked **bad rewrite** example with the reason it would be rejected, plus an explicit seven-stage internal pipeline (Extract → Parse → Match → Rewrite safely → Humanize → Recruiter insights → Emit JSON).

The model returns **strict JSON only** — no markdown, no preamble, no chain-of-thought. The server tolerates light wrapping (code fences, leading sentences) via `safeJsonParse.js`, but the contract on Claude's side is "object only."

## File upload support

| Format | Library | Notes |
|--------|---------|-------|
| `.pdf` | `pdf-parse` | Imported via its internal entry to avoid the package's debug-mode footgun |
| `.docx` | `mammoth` | Raw text extraction; styling is dropped |
| `.txt` | built-in | UTF-8, normalized line endings |

- Max 5 MB per file (rejected before parsing).
- MIME type **and** file extension are both checked.
- `multer.memoryStorage()` — files never touch disk; nothing to clean up.
- Scanned/image PDFs are rejected with a friendly message telling the user to paste manually.
- Resumes longer than 20,000 characters are truncated with a warning surfaced to the user.

## Streaming explanation

`POST /api/tailor` returns `text/event-stream`. The frontend uses `fetch` with a manual SSE parser (rather than `EventSource`, which doesn't support POST bodies). Events:

| Event | Payload | UI behavior |
|-------|---------|-------------|
| `progress` | `{ stage, label }` | Updates the status pill and appends to the timeline |
| `chunk` | `{ text }` | Reserved for a future raw-stream debug view; UI does not depend on it |
| `done` | `{ result }` | Renders the full structured output |
| `error` | `{ message }` | Shows the error card with a Retry button |

A `:ping` comment heartbeat is emitted every 15 s to keep long generations alive behind proxies.

## Security decisions

- **API key stays on the server.** Read once from `process.env.ANTHROPIC_API_KEY`, used only inside `anthropicService.js`. Never returned in any response, never logged.
- **No request-body logging.** Resumes and JDs are private — we log only error categories, never user content.
- **No stack traces leave the server.** A central error handler in `index.js` normalizes everything to a clean message.
- **Per-IP rate limit** on both AI endpoints (`express-rate-limit`). When exceeded, the user sees:
  > "Demo rate limit reached. Try again in an hour, or clone the repo to run locally with your own API key."
- **Input validation** before any model call: minimum/maximum lengths on resume and JD, allowlist on `rewriteStyle`.
- **File upload allowlist** on both MIME type and extension.
- **In-memory file handling only** — no temp files, no path-traversal surface.
- **CORS** locked to the configured `CLIENT_ORIGIN`.
- **Dependencies** are mainstream, widely-used npm packages with active maintenance.

## Setup

### Prerequisites

- Node.js 20+ (Node 18 also works)
- An Anthropic API key

### 1. Clone and install

```bash
git clone <this-repo>
cd resume-fit-ai

# Backend
cd server
cp .env.example .env
# Open .env and paste your ANTHROPIC_API_KEY
npm install

# Frontend (new terminal)
cd ../client
npm install
```

### 2. Run

```bash
# Terminal 1 — backend
cd server
npm run dev
# → listens on http://localhost:8787

# Terminal 2 — frontend
cd client
npm run dev
# → opens http://localhost:5173
```

The Vite dev server proxies `/api/*` to `http://localhost:8787`, so the frontend Just Works in development.

### 3. Production build (frontend only)

```bash
cd client
npm run build
npm run preview
```

For a real deployment, deploy the Express server separately and set `VITE_API_BASE_URL` to your backend's public URL. Note that Vite inlines `VITE_`-prefixed variables at **build time**, so this must be set on the host *before* the frontend build runs — not just at runtime.

## Why this is not just an AI wrapper

A generic "GPT for resumes" tool does three things badly:

1. **It invents.** Pastes the job description's tech stack into the resume whether the candidate has used it or not.
2. **It hides its reasoning.** You get a wall of new text with no way to tell what changed or why.
3. **It speaks like a startup pitch.** "Synergistic, results-driven, passionate self-starter…"

Alignr is opinionated against all three:

1. **The system prompt is the product.** It is long, specific, repeats the anti-fabrication rules in different framings, and includes a worked good/bad example. The model is told — explicitly — that missing skills go in `missingKeywords`, not in the resume.
2. **Every change is auditable.** `rewrittenBullets` shows `before` / `after` / `reason` for each bullet that was touched. `changesExplained` summarizes at the section level. A full diff view shows the rest. You can reject anything.
3. **The output JSON is strict.** No markdown, no chain-of-thought, no preamble. A `safeJsonParse` helper handles edge cases but rejects responses that don't match the schema.
4. **The UI is a productivity dashboard, not a chat.** No bubbles, no avatar, no typing dots, no glowing buttons. Three input zones, one output zone, clean cards.

The "AI" is a careful editor, not a generator. The rest of the system is engineered around keeping it that way.

## Future improvements

- **Image / scanned-resume upload** via Claude's vision capabilities, so a photo or image-only PDF can be parsed.
- **Export to PDF** with a clean default template (currently the tailored resume is plain text by design).
- **LinkedIn job URL parsing** — paste a job link, fetch the description server-side.
- **Saved tailoring history** behind optional auth, so a user can revisit and compare runs.
- **User accounts** with per-user rate limits and saved resumes.

## License

MIT
