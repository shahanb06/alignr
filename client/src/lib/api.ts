// Thin client for the backend.
//
// The /api/tailor call uses fetch with a manual SSE reader rather than the
// EventSource API. EventSource doesn't support POST, and we need to send the
// resume + JD in the body.

import type {
  AnalyzeResult,
  ExtractResumeResponse,
  ProgressEvent as TailorProgressEvent,
  RewriteStyle,
  TailorResult,
} from './types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
if (!API_BASE && import.meta.env.PROD) {
  throw new Error('VITE_API_BASE_URL is not set. The frontend cannot reach the backend.');
}
// Fire-and-forget backend warm-up.
//
// The backend deploys separately and can be cold when the first upload lands,
// which is the dominant source of the "Extracting…" wait — local parsing itself
// is only milliseconds. Pinging /api/health while the user is still choosing or
// dragging a file lets the server wake in parallel.
//
// Deliberately silent: no return value, no thrown errors, no UI. The module-level
// flag means at most one ping per page load, so repeated drag events cannot spam it.
let warmedUp = false;

export function warmUpBackend(): void {
  if (warmedUp) return;
  warmedUp = true;
  void fetch(`${API_BASE}/api/health`, { method: 'GET' }).catch(() => {
    // Ignored on purpose: this is an optimization, not a dependency. If it fails
    // the upload still works and surfaces its own error.
  });
}

export async function extractResume(file: File): Promise<ExtractResumeResponse> {
  const fd = new FormData();
  fd.append('file', file);

  const res = await fetch(`${API_BASE}/api/extract-resume`, {
    method: 'POST',
    body: fd,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    if (res.status === 422 && data?.error === 'pdf_extraction_failed' && data?.message) {
      throw new Error(data.message);
    }
    throw new Error(data?.error || 'Could not extract text from that file.');
  }
  return res.json();
}

export interface TailorStreamCallbacks {
  onProgress?: (ev: TailorProgressEvent) => void;
  onChunk?: (text: string) => void;
  onDone: (result: TailorResult) => void;
  onError: (message: string) => void;
  onQuotaExceeded?: (info: { scope: string; resetsAt: string | null }) => void;
}

export interface TailorRequest {
  resumeText: string;
  jobDescription: string;
  targetRole: string;
  rewriteStyle: RewriteStyle;
}

export interface AnalyzeRequest {
  resumeText: string;
  jobDescription: string;
}

export async function analyzeFit(
  body: AnalyzeRequest,
  signal?: AbortSignal
): Promise<AnalyzeResult> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new Error('Network error. Please check your connection and try again.');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (data && (data.message || data.error)) || 'Analysis failed. Please try again.';
    throw new Error(message);
  }
  return data as AnalyzeResult;
}

// Minimal SSE parser. We accumulate chars into a buffer and split on the
// SSE message terminator (a blank line). Each message has `event:` and `data:` lines.
function parseSseBuffer(buffer: string): { messages: Array<{ event: string; data: string }>; rest: string } {
  const messages: Array<{ event: string; data: string }> = [];
  const parts = buffer.split('\n\n');
  const rest = parts.pop() ?? '';
  for (const part of parts) {
    if (!part.trim()) continue;
    let event = 'message';
    const dataLines: string[] = [];
    for (const line of part.split('\n')) {
      if (line.startsWith(':')) continue; // SSE comment / heartbeat
      if (line.startsWith('event:')) {
        event = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim());
      }
    }
    messages.push({ event, data: dataLines.join('\n') });
  }
  return { messages, rest };
}

export async function tailorResume(
  body: TailorRequest,
  cb: TailorStreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/tailor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') return;
    cb.onError('Network error. Please check your connection and try again.');
    return;
  }

  if (!res.ok) {
    // For 4xx errors the server replies with JSON, not SSE.
    const data = await res.json().catch(() => null);
    if (data?.code === 'daily_limit_reached' && cb.onQuotaExceeded) {
      cb.onQuotaExceeded({ scope: data.scope, resetsAt: data.resetsAt });
      return;
    }
    cb.onError(data?.error || 'Request failed.');
    return;
  }

  if (!res.body) {
    cb.onError('Empty response from server.');
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let receivedTerminal = false;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const { messages, rest } = parseSseBuffer(buffer);
      buffer = rest;

      for (const msg of messages) {
        if (!msg.data) continue;
        let payload: any = null;
        try {
          payload = JSON.parse(msg.data);
        } catch {
          continue;
        }
        if (msg.event === 'progress' && cb.onProgress) {
          cb.onProgress(payload as TailorProgressEvent);
        } else if (msg.event === 'chunk' && cb.onChunk) {
          cb.onChunk(payload.text || '');
        } else if (msg.event === 'done') {
          receivedTerminal = true;
          cb.onDone(payload.result as TailorResult);
        } else if (msg.event === 'error') {
          receivedTerminal = true;
          cb.onError(payload.message || 'Tailoring failed.');
        }
      }
    }
    if (!receivedTerminal) {
      cb.onError('Stream ended before a result was received. Please try again.');
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') return;
    if (!receivedTerminal) {
      cb.onError('Stream interrupted. Please try again.');
    }
  }
}

export interface QuotaStatus {
  tailor: { remaining: number; limit: number; resetsAt: string | null };
  analyze: { remaining: number; limit: number; resetsAt: string | null };
}

export async function getQuota(): Promise<QuotaStatus | null> {
  try {
    const res = await fetch(API_BASE + '/api/quota');
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
