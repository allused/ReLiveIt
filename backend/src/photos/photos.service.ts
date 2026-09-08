import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ParticipantAuth } from '../auth/auth.types';
import { DEFAULT_MAX_FILE_SIZE, DEFAULT_MAX_GALLERY_PHOTOS, GALLERY_PAGE_SIZE } from '../common/constants';
import { Category } from '../entities/category.entity';
import { Photo } from '../entities/photo.entity';
import { Wedding, WeddingStatus } from '../entities/wedding.entity';
import { ImageStorageService } from '../storage/image-storage.service';
import type { Response } from 'express';
import { ZipFile } from 'yazl';

@Injectable()
export class PhotosService {
  constructor(
    @InjectRepository(Photo)
    private readonly photos: Repository<Photo>,
    @InjectRepository(Wedding)
    private readonly weddings: Repository<Wedding>,
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
    private readonly storage: ImageStorageService,
    private readonly config: ConfigService,
  ) {}

  async getWeddingBySlug(slug: string) {
    const wedding = await this.weddings.findOne({ where: { slug } });
    if (!wedding) {
      throw new NotFoundException('Wedding not found.');
    }
    return wedding;
  }

  assertGuestWedding(auth: ParticipantAuth, wedding: Wedding) {
    if (auth.weddingId !== wedding.id) {
      throw new ForbiddenException('You do not have access to this wedding.');
    }
  }

  async assertActive(wedding: Wedding) {
    if (wedding.status === WeddingStatus.CONCLUDED) {
      throw new BadRequestException(
        'This wedding has already concluded. Uploads are no longer available.',
      );
    }
  }

  async upload(params: {
    wedding: Wedding;
    auth: ParticipantAuth;
    file: Express.Multer.File;
    categoryId?: string | null;
  }) {
    await this.assertActive(params.wedding);
    this.assertGuestWedding(params.auth, params.wedding);

    const maxSize = Number(this.config.get('MAX_FILE_SIZE') ?? DEFAULT_MAX_FILE_SIZE);
    if (params.file.size > maxSize) {
      throw new BadRequestException('This photo is too large to upload.');
    }

    let categoryId: string | null = params.categoryId ?? null;
    if (categoryId) {
      const category = await this.categories.findOne({
        where: { id: categoryId, weddingId: params.wedding.id },
      });
      if (!category || !category.isActive) {
        throw new BadRequestException('Category not found.');
      }
      const existing = await this.photos.findOne({
        where: {
          weddingId: params.wedding.id,
          categoryId,
          uploaderParticipantId: params.auth.participantId,
        },
      });
      if (existing) {
        throw new BadRequestException('You have already uploaded a photo to this category.');
      }
    } else {
      const galleryCount = await this.photos.count({
        where: {
          weddingId: params.wedding.id,
          categoryId: IsNull(),
          uploaderParticipantId: params.auth.participantId,
        },
      });
      const maxGallery = Number(this.config.get('MAX_GALLERY_PHOTOS') ?? DEFAULT_MAX_GALLERY_PHOTOS);
      if (galleryCount >= maxGallery) {
        throw new BadRequestException(`You can upload up to ${maxGallery} general gallery photos.`);
      }
    }

    const photo = this.photos.create({
      weddingId: params.wedding.id,
      categoryId,
      uploaderParticipantId: params.auth.participantId,
      originalKey: 'pending',
      mediumKey: 'pending',
      thumbnailKey: 'pending',
      originalFilename: params.file.originalname,
      mimeType: params.file.mimetype,
      fileSize: params.file.size,
    });
    const saved = await this.photos.save(photo);

    try {
      const stored = await this.storage.saveImage({
        weddingId: params.wedding.id,
        photoId: saved.id,
        buffer: params.file.buffer,
        originalFilename: params.file.originalname,
        mimeType: params.file.mimetype,
      });
      saved.originalKey = stored.originalKey;
      saved.mediumKey = stored.mediumKey;
      saved.thumbnailKey = stored.thumbnailKey;
      saved.mimeType = stored.mimeType;
      saved.fileSize = stored.fileSize;
      return this.photos.save(saved);
    } catch (error) {
      await this.photos.delete(saved.id);
      throw error;
    }
  }

  async listForWedding(params: {
    wedding: Wedding;
    page?: number;
    limit?: number;
    categoryId?: string | null;
    galleryOnly?: boolean;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(60, Math.max(1, params.limit ?? GALLERY_PAGE_SIZE));
    const qb = this.photos
      .createQueryBuilder('p')
      .where('p.weddingId = :weddingId', { weddingId: params.wedding.id })
      .orderBy('p.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (params.categoryId) {
      qb.andWhere('p.categoryId = :categoryId', { categoryId: params.categoryId });
    } else if (params.galleryOnly) {
      qb.andWhere('p.categoryId IS NULL');
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async guestCategoryState(wedding: Wedding, auth: ParticipantAuth) {
    const categories = await this.categories.find({
      where: { weddingId: wedding.id, isActive: true },
      order: { sortOrder: 'ASC' },
    });
    const myCategoryPhotos = await this.photos.find({
      where: { weddingId: wedding.id, uploaderParticipantId: auth.participantId },
    });
    const byCategory = new Map(
      myCategoryPhotos.filter((p) => p.categoryId).map((p) => [p.categoryId as string, p]),
    );
    const latestPhotos = await this.photos
      .createQueryBuilder('p')
      .distinctOn(['p.categoryId'])
      .where('p.weddingId = :weddingId', { weddingId: wedding.id })
      .andWhere('p.categoryId IS NOT NULL')
      .orderBy('p.categoryId')
      .addOrderBy('p.createdAt', 'DESC')
      .getMany();
    const previewByCategory = new Map(
      latestPhotos
        .filter((photo) => photo.categoryId)
        .map((photo) => [photo.categoryId as string, photo]),
    );
    const galleryCount = myCategoryPhotos.filter((p) => !p.categoryId).length;
    const maxGallery = Number(this.config.get('MAX_GALLERY_PHOTOS') ?? DEFAULT_MAX_GALLERY_PHOTOS);
    return {
      categories: categories.map((category) => ({
        ...category,
        myPhoto: byCategory.get(category.id) ?? null,
        previewPhoto: previewByCategory.get(category.id) ?? null,
      })),
      galleryCount,
      maxGalleryPhotos: maxGallery,
    };
  }

  async deleteOwnCategoryPhoto(params: {
    wedding: Wedding;
    auth: ParticipantAuth;
    photoId: string;
  }) {
    await this.assertActive(params.wedding);
    this.assertGuestWedding(params.auth, params.wedding);

    const photo = await this.photos.findOne({
      where: { id: params.photoId, weddingId: params.wedding.id },
    });
    if (!photo) {
      throw new NotFoundException('Photo not found.');
    }
    if (photo.uploaderParticipantId !== params.auth.participantId) {
      throw new ForbiddenException('You can only delete your own photo.');
    }
    if (!photo.categoryId) {
      throw new BadRequestException('You can only replace contest photos.');
    }

    await this.storage.remove(
      [photo.originalKey, photo.mediumKey, photo.thumbnailKey].filter(
        (key): key is string => Boolean(key) && key !== 'pending',
      ),
    );
    await this.photos.delete(photo.id);
    return { ok: true };
  }

  async getOwnedByWedding(photoId: string, weddingId: string) {
    const photo = await this.photos.findOne({ where: { id: photoId, weddingId } });
    if (!photo) {
      throw new NotFoundException('Photo not found.');
    }
    return photo;
  }

  async writeZip(wedding: Wedding, res: Response) {
    const photos = await this.photos.find({
      where: { weddingId: wedding.id },
      order: { createdAt: 'ASC' },
    });
    const ready = photos.filter((photo) => photo.originalKey && photo.originalKey !== 'pending');
    if (!ready.length) {
      throw new NotFoundException('No photos to download.');
    }

    const filename = `${wedding.slug}-photos.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const zip = new ZipFile();
    const done = new Promise<void>((resolve, reject) => {
      res.on('finish', resolve);
      zip.outputStream.on('error', reject);
    });
    zip.outputStream.pipe(res);

    const used = new Set<string>();
    for (const photo of ready) {
      try {
        const buffer = await this.storage.read(photo.originalKey);
        zip.addBuffer(buffer, zipEntryName(photo.originalFilename, used));
      } catch {
        // skip missing files
      }
    }
    zip.end();
    await done;
  }
}

function zipEntryName(original: string, used: Set<string>): string {
  const cleaned = (original || 'photo.jpg').replace(/[/\\]/g, '_').replace(/^\.+/, '');
  const base = cleaned || 'photo.jpg';
  let name = base;
  let n = 2;
  while (used.has(name.toLowerCase())) {
    const dot = base.lastIndexOf('.');
    const stem = dot > 0 ? base.slice(0, dot) : base;
    const ext = dot > 0 ? base.slice(dot) : '';
    name = `${stem}-${n}${ext}`;
    n += 1;
  }
  used.add(name.toLowerCase());
  return name;
}
