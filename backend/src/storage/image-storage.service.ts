import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import sharp from 'sharp';

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
    const ext =
      params.mimeType === 'image/png' ? 'png' : params.mimeType === 'image/webp' ? 'webp' : 'jpg';
    const originalKey = `${params.weddingId}/${params.photoId}/original.${ext}`;
    const mediumKey = `${params.weddingId}/${params.photoId}/medium.jpg`;
    const thumbnailKey = `${params.weddingId}/${params.photoId}/thumb.jpg`;

    const image = sharp(params.buffer).rotate();
    const original = await image.toBuffer();
    const medium = await sharp(params.buffer)
      .rotate()
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    const thumbnail = await sharp(params.buffer)
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
      mimeType: params.mimeType,
      fileSize: original.length,
    };
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
}
