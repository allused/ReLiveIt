import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import convert from 'heic-convert';
import sharp from 'sharp';
import { isHeicUpload, looksLikeHeic } from '../common/image-upload.util';

export type StoredImage = {
  originalKey: string;
  mediumKey: string;
  thumbnailKey: string;
  mimeType: string;
  fileSize: number;
};

@Injectable()
export class ImageStorageService {
  constructor(private readonly config: ConfigService) {}

  private root(): string {
    return this.config.get('STORAGE_DIR', './uploads');
  }

  async saveImage(params: {
    weddingId: string;
    photoId: string;
    buffer: Buffer;
    originalFilename: string;
    mimeType: string;
  }): Promise<StoredImage> {
    const decoded = await this.decode(params.buffer, params.mimeType, params.originalFilename);
    const ext =
      decoded.mimeType === 'image/png' ? 'png' : decoded.mimeType === 'image/webp' ? 'webp' : 'jpg';
    const originalKey = `${params.weddingId}/${params.photoId}/original.${ext}`;
    const mediumKey = `${params.weddingId}/${params.photoId}/medium.jpg`;
    const thumbnailKey = `${params.weddingId}/${params.photoId}/thumb.jpg`;

    const image = sharp(decoded.buffer).rotate();
    const original = await image.toBuffer();
    const medium = await sharp(decoded.buffer)
      .rotate()
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    const thumbnail = await sharp(decoded.buffer)
      .rotate()
      .resize({ width: 480, withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toBuffer();

    await this.write(originalKey, original);
    await this.write(mediumKey, medium);
    await this.write(thumbnailKey, thumbnail);

    return {
      originalKey,
      mediumKey,
      thumbnailKey,
      mimeType: decoded.mimeType,
      fileSize: original.length,
    };
  }

  async saveCover(params: {
    weddingId: string;
    buffer: Buffer;
    mimeType: string;
    originalFilename?: string;
  }): Promise<StoredImage> {
    return this.saveImage({
      weddingId: params.weddingId,
      photoId: 'cover',
      buffer: params.buffer,
      originalFilename: params.originalFilename ?? 'cover',
      mimeType: params.mimeType,
    });
  }

  async read(key: string): Promise<Buffer> {
    return readFile(join(this.root(), key));
  }

  async remove(keys: string[]): Promise<void> {
    await Promise.all(
      keys.map(async (key) => {
        try {
          await unlink(join(this.root(), key));
        } catch {
          // ignore missing files
        }
      }),
    );
  }

  private async write(key: string, data: Buffer): Promise<void> {
    const path = join(this.root(), key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
  }

  private async decode(
    buffer: Buffer,
    mimeType: string,
    filename: string,
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    if (!isHeicUpload(mimeType, filename) && !looksLikeHeic(buffer)) {
      return { buffer, mimeType: mimeType || 'image/jpeg' };
    }
    try {
      const jpeg = await convert({
        buffer,
        format: 'JPEG',
        quality: 0.92,
      });
      return { buffer: Buffer.from(jpeg), mimeType: 'image/jpeg' };
    } catch {
      throw new BadRequestException(
        'This iPhone photo could not be read. Try exporting it as JPEG, or pick the photo again.',
      );
    }
  }
}
