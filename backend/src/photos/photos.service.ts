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
    const galleryCount = myCategoryPhotos.filter((p) => !p.categoryId).length;
    const maxGallery = Number(this.config.get('MAX_GALLERY_PHOTOS') ?? DEFAULT_MAX_GALLERY_PHOTOS);
    return {
      categories: categories.map((category) => ({
        ...category,
        myPhoto: byCategory.get(category.id) ?? null,
      })),
      galleryCount,
      maxGalleryPhotos: maxGallery,
    };
  }

  async getOwnedByWedding(photoId: string, weddingId: string) {
    const photo = await this.photos.findOne({ where: { id: photoId, weddingId } });
    if (!photo) {
      throw new NotFoundException('Photo not found.');
    }
    return photo;
  }
}
