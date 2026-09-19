import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getAdminSession } from '@/lib/auth';
import { isUploadFolder } from '@/lib/uploads';
import { isCloudinaryConfigured, uploadImageToCloudinary } from '@/lib/cloudinary';

export const runtime = 'nodejs';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

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

    if (!isCloudinaryConfigured()) {
      return apiError(
        'Image upload is not configured on the server. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET, or paste an Image URL instead.',
        500
      );
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

    // Random public_id — the original filename is never trusted or used,
    // which rules out path traversal and any attempt to overwrite an
    // existing image by guessing its name.
    const publicId = crypto.randomBytes(16).toString('hex');

    // Cloudinary itself handles resizing/compression/format selection on
    // delivery (see src/lib/cloudinary.ts) — persistent storage that
    // survives Vercel deployments and cold starts, unlike anything
    // written to the serverless filesystem.
    const url = await uploadImageToCloudinary(inputBytes, folder, publicId);

    return apiSuccess({ url }, 201);
  } catch (error) {
    console.error('POST /api/admin/upload failed:', error);
    return apiError('Could not upload image. Please try again, or paste an Image URL instead.', 500);
  }
}
