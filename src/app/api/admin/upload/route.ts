import { NextRequest } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getAdminSession } from '@/lib/auth';
import { getUploadDir, getPublicUploadPrefix, isUploadFolder, UPLOAD_FOLDERS } from '@/lib/uploads';

export const runtime = 'nodejs';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_DIMENSION = 1600; // px, longest side — plenty for menu/product cards
const WEBP_QUALITY = 82;

type DetectedType = 'jpeg' | 'png' | 'gif' | 'webp';

/**
 * Sniffs the actual file bytes rather than trusting the browser-reported
 * MIME type or filename extension, both of which are fully attacker
 * controlled. This is what stands between "upload an image" and "upload
 * anything with a .jpg name" (e.g. an HTML or script payload).
 */
function detectImageType(buf: Buffer): DetectedType | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  )
    return 'png';
  if (
    buf.length >= 6 &&
    buf[0] === 0x47 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x38 &&
    (buf[4] === 0x37 || buf[4] === 0x39) &&
    buf[5] === 0x61
  )
    return 'gif';
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  )
    return 'webp';
  return null;
}

export async function POST(request: NextRequest) {
  try {
    // Only authenticated admins may upload restaurant/product images.
    const session = await getAdminSession();
    if (!session) {
      return apiError('Unauthorized.', 401);
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const folderInput = formData.get('folder');
    const folder = isUploadFolder(folderInput) ? folderInput : 'products';

    if (!file || !(file instanceof File)) {
      return apiError('No file provided.');
    }
    if (file.size > MAX_SIZE_BYTES) {
      return apiError('Image must be smaller than 5MB.');
    }

    const inputBytes = Buffer.from(await file.arrayBuffer());
    const detectedType = detectImageType(inputBytes);
    if (!detectedType) {
      return apiError('Only JPEG, PNG, WEBP, or GIF images are allowed.');
    }

    const uploadDir = path.join(getUploadDir(), folder);
    await mkdir(uploadDir, { recursive: true });

    // Random filename — the original filename is never trusted or used,
    // which rules out path traversal ("../../") and any attempt to
    // overwrite an existing file by guessing its name.
    const uniqueId = crypto.randomBytes(16).toString('hex');

    let outputBytes: Buffer;
    let outputExt: string;

    if (detectedType === 'gif') {
      // Resizing/re-encoding an animated GIF risks flattening it to a
      // single frame, so animated GIFs are stored as-is. Still bounded
      // by the 5MB size cap above.
      outputBytes = inputBytes;
      outputExt = 'gif';
    } else {
      // Resize (never upscale) and re-encode to WebP for everything else
      // — smaller files, consistent format, faster menu/product loads.
      outputBytes = await sharp(inputBytes)
        .rotate() // respect EXIF orientation from phone cameras
        .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
      outputExt = 'webp';
    }

    const filename = `${uniqueId}.${outputExt}`;
    await writeFile(path.join(uploadDir, filename), outputBytes);

    const url = `${getPublicUploadPrefix()}/${folder}/${filename}`;
    return apiSuccess({ url }, 201);
  } catch (error) {
    console.error('POST /api/admin/upload failed:', error);
    return apiError(
      'Could not upload image. On serverless hosts like Vercel, use the Image URL field instead.',
      500
    );
  }
}

// Exposed for reference/tests; keeps the whitelist visible alongside the
// route that enforces it.
export { UPLOAD_FOLDERS };
