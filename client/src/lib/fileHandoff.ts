/**
 * In-memory handoff for a resume file attached on the landing page.
 *
 * The landing page and the app are the same SPA behind a hash router
 * (see main.tsx), so navigating to #/app does not reload the document and a
 * module-level reference survives the transition. A `File` cannot be
 * meaningfully serialised into sessionStorage — the existing
 * `alignr:pastedResume` string handoff is used for pasted text — so the file
 * itself is parked here and claimed once by the app's uploader, which then runs
 * its own existing validation and extraction.
 */

let pendingResumeFile: File | null = null;

/** Park a file for the app to claim on arrival. */
export function setPendingResumeFile(file: File | null): void {
  pendingResumeFile = file;
}

/** True when a file is waiting, without consuming it. */
export function hasPendingResumeFile(): boolean {
  return pendingResumeFile !== null;
}

/**
 * Claim the pending file. Returns null when nothing is waiting. The reference
 * is cleared so a remount cannot re-trigger the same upload.
 */
export function takePendingResumeFile(): File | null {
  const file = pendingResumeFile;
  pendingResumeFile = null;
  return file;
}
