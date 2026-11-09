/** Shared contract between the plugin and the server. */
export type Hash = `sha256:${string}`;

export const GENRES = [
  "novel",
  "novella",
  "short-story",
  "flash-fiction",
  "poetry",
  "essay",
  "academic-essay",
  "academic-article",
  "academic-book",
  "memoir",
  "biography",
  "non-fiction",
  "children-ya",
  "play",
  "screenplay",
  "other",
] as const;
export type Genre = (typeof GENRES)[number];

export type ManifestSource = "studio" | "core" | "sandbox" | "none";

export type ManifestUnit = {
  no: number;
  level: string;
  title?: string;
  parent?: number;
  hash?: Hash;
  chars: number;
  words: number;
};

export type Manifest = {
  source: ManifestSource;
  extractor?: string;
  book_hash?: Hash;
  units: ManifestUnit[];
};

export const ERROR_CODES = [
  "LOGIN_REQUIRED",
  "NO_LICENSE",
  "CONSENT_REQUIRED",
  "MODULE_MISSING",
  "SCANNED_PDF",
  "FORMAT_UNSUPPORTED",
  "RETRY_LIMIT",
  "QUOTA_EXCEEDED",
  "CODE_ENV_MISSING",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
