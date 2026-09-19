import { v2 as cloudinary } from 'cloudinary';

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

let isConfigured = false;
if (CLOUD_NAME && API_KEY && API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: API_KEY,
    api_secret: API_SECRET,
    secure: true,
  });
  isConfigured = true;
}

export function isCloudinaryConfigured(): boolean {
  return isConfigured;
}

/**
 * Uploads image bytes to Cloudinary under `zaika-e-sindh/<folder>/`, with
 * server-side resizing/compression applied by Cloudinary itself. Returns
 * the permanent HTTPS URL to store on the product/category/deal/settings
 * record — this is what persists across Vercel deployments and cold
 * starts, unlike anything written to the serverless filesystem.
 */
export async function uploadImageToCloudinary(
  buffer: Buffer,
  folder: string,
  publicId: string
): Promise<string> {
  const dataUri = `data:image/octet-stream;base64,${buffer.toString('base64')}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: `zaika-e-sindh/${folder}`,
    public_id: publicId,
    resource_type: 'image',
    overwrite: false,
    // Cap the longest side and let Cloudinary pick the best format/quality
    // for the requesting browser — smaller, faster-loading images without
    // us needing our own image-processing library.
    transformation: [{ width: 1600, height: 1600, crop: 'limit' }, { fetch_format: 'auto', quality: 'auto:good' }],
  });

  return result.secure_url;
}

/**
 * Extracts a Cloudinary public_id from one of our own secure_urls, only
 * when it's actually hosted under our configured cloud name and the
 * `zaika-e-sindh/` folder this app writes to — never touches any other
 * URL (external links, other folders), so this is safe to call on
 * whatever the caller already has stored without further checks.
 */
function extractPublicId(url: string): string | null {
  if (!CLOUD_NAME) return null;
  const marker = `res.cloudinary.com/${CLOUD_NAME}/image/upload/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;

  let rest = url.slice(idx + marker.length);
  // Strip a leading transformation/version segment if present (e.g.
  // "v1234567890/" or "c_limit,w_1600/..."), keeping only the actual
  // folder/public_id path, then drop the file extension.
  const parts = rest.split('/');
  if (parts[0] && /^v\d+$/.test(parts[0])) parts.shift();
  rest = parts.join('/');
  if (!rest.startsWith('zaika-e-sindh/')) return null;
  return rest.replace(/\.[a-zA-Z0-9]+$/, '');
}

/**
 * Deletes an image from Cloudinary given one of our own URLs. No-ops
 * (never throws) for anything that isn't a Cloudinary URL under our
 * folder — external links and any other value are left untouched.
 */
export async function deleteImageFromCloudinary(url: string | null | undefined): Promise<void> {
  if (!isConfigured || !url) return;
  const publicId = extractPublicId(url);
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (error) {
    console.error('Cloudinary delete failed for', publicId, error);
  }
}
