import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import { getUploadDir } from '@/lib/uploads';

export const runtime = 'nodejs';

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

/**
 * Serves files from UPLOAD_DIR when it lives outside `public/` (the VPS
 * case — see src/lib/uploads.ts). On the Vercel demo, UPLOAD_DIR defaults
 * to `public/uploads` and Next.js serves those statically, so this route
 * is only ever hit in the VPS configuration.
 */
export async function GET(_request: NextRequest, { params }: { params: { path: string[] } }) {
  const segments = params.path ?? [];

  // Reject any segment that could escape the upload directory. Generated
  // filenames never contain these, but a request is untrusted input
  // regardless of what we expect to have generated ourselves.
  if (segments.some((s) => s.includes('..') || s.includes('/') || s.includes('\\'))) {
    return new NextResponse('Not found', { status: 404 });
  }

  const ext = path.extname(segments[segments.length - 1] ?? '').toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    return new NextResponse('Not found', { status: 404 });
  }

  const filePath = path.join(getUploadDir(), ...segments);

  try {
    const stats = await stat(filePath);
    if (!stats.isFile()) return new NextResponse('Not found', { status: 404 });

    const data = await readFile(filePath);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': contentType,
        // Filenames are content-addressed random IDs and never reused,
        // so it's always safe to cache them aggressively.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
