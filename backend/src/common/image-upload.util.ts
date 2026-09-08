import { BadRequestException } from '@nestjs/common';
import { ALLOWED_MIME_TYPES } from './constants';

const HEIC_MIME_TYPES = new Set([
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
]);

export function isHeicUpload(mimeType: string | undefined, filename: string | undefined): boolean {
  const mime = (mimeType ?? '').toLowerCase();
  if (HEIC_MIME_TYPES.has(mime)) return true;
  return /\.hei[cf]$/i.test(filename ?? '');
}

export function looksLikeHeic(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  const brand = buffer.subarray(4, 12).toString('ascii');
  return brand.startsWith('ftyp') && /heic|heif|mif1|msf1/i.test(brand);
}

export function isAllowedImageUpload(mimeType: string | undefined, filename: string | undefined): boolean {
  const mime = (mimeType ?? '').toLowerCase();
  if ((ALLOWED_MIME_TYPES as readonly string[]).includes(mime)) return true;
  if (isHeicUpload(mime, filename)) return true;
  if ((!mime || mime === 'application/octet-stream') && /\.(jpe?g|png|webp)$/i.test(filename ?? '')) {
    return true;
  }
  return false;
}

export function imageFileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) {
  if (!isAllowedImageUpload(file.mimetype, file.originalname)) {
    cb(new BadRequestException('JPEG, PNG, WebP, and iPhone HEIC photos are supported.'), false);
    return;
  }
  cb(null, true);
}
