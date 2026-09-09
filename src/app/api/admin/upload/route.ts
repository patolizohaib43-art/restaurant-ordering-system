import { NextRequest } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { apiSuccess, apiError } from '@/lib/api-response';

export const runtime = 'nodejs';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return apiError('No file provided.');
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return apiError('Only JPEG, PNG, WEBP, or GIF images are allowed.');
    }
    if (file.size > MAX_SIZE_BYTES) {
      return apiError('Image must be smaller than 5MB.');
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = file.type.split('/')[1];
    const filename = `${crypto.randomBytes(12).toString('hex')}.${ext}`;

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), bytes);

    return apiSuccess({ url: `/uploads/${filename}` }, 201);
  } catch (error) {
    console.error('POST /api/admin/upload failed:', error);
    return apiError(
      'Could not upload image. On serverless hosts like Vercel, use the Image URL field instead.',
      500
    );
  }
}
