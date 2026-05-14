// Shared types between client modules. Mirrors the strict JSON contract from the backend.

export type RewriteStyle = 'conservative' | 'balanced' | 'strong';

export type SourceType = 'pdf' | 'docx' | 'txt';

export interface ExtractResumeResponse {
  sourceType: SourceType;
  extractedText: string;
  warning: string | null;
}

export interface KeywordMatched {
  keyword: string;
  evidence: string;
}

export interface KeywordMissing {
  keyword: string;
  whyItMatters: string;
}

export interface RewrittenBullet {
  before: string;
  after: string;
  reason: string;
}

export interface ChangeExplained {
  section: string;
  change: string;
  reason: string;
}

export interface RecruiterWarning {
  issue: string;
  suggestion: string;
}

export interface TailorResult {
  professionalSummary: string;
  tailoredResume: string;
  originalResume: string;
  rewrittenBullets: RewrittenBullet[];
  changesExplained: ChangeExplained[];
  recruiterWarnings: RecruiterWarning[];
  honestyNotice: string;
}

export interface AnalyzeResult {
  matchScore: number;
  jdKeywords: string[];
  matchedKeywords: KeywordMatched[];
  missingSkills: KeywordMissing[];
}

export interface ProgressEvent {
  stage: string;
  label: string;
}
