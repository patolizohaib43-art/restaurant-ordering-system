import path from 'path';
import { unlink } from 'fs/promises';

/**
 * Where uploaded images are written on disk.
 *
 * - Default (Vercel demo / local dev): `<project>/public/uploads`, served
 *   automatically by Next.js's static file handling as `/uploads/...`.
 * - VPS production: set `UPLOAD_DIR` to a persistent path OUTSIDE the
 *   deployed source tree, e.g. `/var/www/zaika-e-sindh/uploads`. Files are
 *   then served through the `/api/uploads/[...path]` route instead, since
 *   they're no longer inside `public/`.
 *
 * This indirection is what lets the same code run unmodified on both the
 * Vercel demo and a real VPS — only the environment variable changes.
 */
export function getUploadDir(): string {
  return process.env.UPLOAD_DIR?.trim() || path.join(process.cwd(), 'public', 'uploads');
}

const PUBLIC_DIR = path.join(process.cwd(), 'public');

/** True when the configured upload directory lives inside `public/`. */
function isInsidePublicDir(dir: string): boolean {
  const rel = path.relative(PUBLIC_DIR, dir);
  return !rel.startsWith('..') && !path.isAbsolute(rel);
}

/**
 * URL prefix images are served under. Automatically switches between the
 * static `/uploads` path (when UPLOAD_DIR is inside `public/`) and the
 * dynamic `/api/uploads` route (when it's an external VPS path).
 */
export function getPublicUploadPrefix(): string {
  return isInsidePublicDir(getUploadDir()) ? '/uploads' : '/api/uploads';
}

/** The whitelisted subfolders images may be organized into. */
export const UPLOAD_FOLDERS = ['products', 'categories', 'deals', 'restaurant'] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

export function isUploadFolder(value: unknown): value is UploadFolder {
  return typeof value === 'string' && (UPLOAD_FOLDERS as readonly string[]).includes(value);
}

/**
 * Deletes a previously-uploaded file, given the public URL that was
 * returned when it was uploaded. Silently does nothing for:
 *  - external URLs (http/https) — never something we manage or own
 *  - anything outside our own upload prefix — safety net against
 *    accidentally deleting arbitrary files
 *
 * Best-effort only: a missing file or permission error is swallowed,
 * since a failed cleanup should never block the actual save/delete the
 * caller is performing.
 */
export async function deleteUploadedFileIfManaged(url: string | null | undefined): Promise<void> {
  if (!url) return;
  if (/^https?:\/\//i.test(url)) return; // external link, not ours to delete

  const prefix = getPublicUploadPrefix();
  if (!url.startsWith(`${prefix}/`)) return;

  const relative = url.slice(prefix.length + 1); // strip "/uploads/" or "/api/uploads/"
  // Guard against path traversal in a stored value (defense in depth —
  // filenames we generate never contain "..", but never trust stored data).
  if (relative.includes('..')) return;

  const filePath = path.join(getUploadDir(), relative);
  try {
    await unlink(filePath);
  } catch {
    // File already gone, or filesystem is read-only (serverless) — fine.
  }
}
