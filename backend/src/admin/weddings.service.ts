import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DEFAULT_MAX_FILE_SIZE, DEFAULT_QUICK_VOTE_COUNT } from '../common/constants';
import { slugify } from '../common/slug';
import { Wedding, WeddingStatus } from '../entities/wedding.entity';
import { ImageStorageService } from '../storage/image-storage.service';
import { CreateWeddingDto } from './dto/create-wedding.dto';
import { UpdateWeddingDto } from './dto/update-wedding.dto';

type WeddingWithCounts = Wedding & {
  categoryCount: number;
  photoCount: number;
  hasCoverPhoto: boolean;
};

@Injectable()
export class WeddingsService {
  constructor(
    @InjectRepository(Wedding)
    private readonly weddings: Repository<Wedding>,
    private readonly storage: ImageStorageService,
    private readonly config: ConfigService,
  ) {}

  async list() {
    const weddings = await this.weddings.find({ order: { createdAt: 'DESC' } });
    return Promise.all(weddings.map((wedding) => this.withCounts(wedding)));
  }

  async get(id: string) {
    const wedding = await this.weddings.findOne({ where: { id } });
    if (!wedding) {
      throw new NotFoundException('Wedding not found.');
    }
    return this.withCounts(wedding);
  }

  async create(dto: CreateWeddingDto) {
    const slug = await this.uniqueSlug(dto.slug?.trim() ? slugify(dto.slug) : slugify(dto.name));
    const wedding = this.weddings.create({
      name: dto.name.trim(),
      slug,
      status: WeddingStatus.ACTIVE,
      quickVoteEnabled: dto.quickVoteEnabled ?? false,
      quickVotePhotoCount: dto.quickVotePhotoCount ?? DEFAULT_QUICK_VOTE_COUNT,
    });
    return this.withCounts(await this.weddings.save(wedding));
  }

  async update(id: string, dto: UpdateWeddingDto) {
    const wedding = await this.weddings.findOne({ where: { id } });
    if (!wedding) {
      throw new NotFoundException('Wedding not found.');
    }
    if (dto.name) {
      wedding.name = dto.name.trim();
    }
    if (dto.quickVoteEnabled !== undefined) {
      wedding.quickVoteEnabled = dto.quickVoteEnabled;
    }
    if (dto.quickVotePhotoCount !== undefined) {
      wedding.quickVotePhotoCount = dto.quickVotePhotoCount;
    }
    return this.withCounts(await this.weddings.save(wedding));
  }

  async uploadCover(id: string, file: Express.Multer.File) {
    const wedding = await this.weddings.findOne({ where: { id } });
    if (!wedding) {
      throw new NotFoundException('Wedding not found.');
    }
    const maxSize = Number(this.config.get('MAX_FILE_SIZE') ?? DEFAULT_MAX_FILE_SIZE);
    if (file.size > maxSize) {
      throw new BadRequestException('This photo is too large to upload.');
    }

    const previousKeys = [wedding.coverOriginalKey, wedding.coverMediumKey, wedding.coverThumbnailKey].filter(
      (key): key is string => Boolean(key),
    );

    const stored = await this.storage.saveCover({
      weddingId: wedding.id,
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalFilename: file.originalname,
    });
    wedding.coverOriginalKey = stored.originalKey;
    wedding.coverMediumKey = stored.mediumKey;
    wedding.coverThumbnailKey = stored.thumbnailKey;
    wedding.updatedAt = new Date();
    const saved = await this.weddings.save(wedding);

    const stale = previousKeys.filter(
      (key) => key !== stored.originalKey && key !== stored.mediumKey && key !== stored.thumbnailKey,
    );
    if (stale.length) {
      await this.storage.remove(stale);
    }

    return this.withCounts(saved);
  }

  async removeCover(id: string) {
    const wedding = await this.weddings.findOne({ where: { id } });
    if (!wedding) {
      throw new NotFoundException('Wedding not found.');
    }
    if (!wedding.coverMediumKey) {
      throw new NotFoundException('No couple photo to remove.');
    }

    await this.storage.remove(
      [wedding.coverOriginalKey, wedding.coverMediumKey, wedding.coverThumbnailKey].filter(
        (key): key is string => Boolean(key),
      ),
    );
    wedding.coverOriginalKey = null;
    wedding.coverMediumKey = null;
    wedding.coverThumbnailKey = null;
    wedding.updatedAt = new Date();
    return this.withCounts(await this.weddings.save(wedding));
  }

  private async withCounts(wedding: Wedding): Promise<WeddingWithCounts> {
    const raw = await this.weddings
      .createQueryBuilder('w')
      .leftJoin('w.categories', 'c')
      .leftJoin('w.photos', 'p')
      .select('COUNT(DISTINCT c.id)', 'categoryCount')
      .addSelect('COUNT(DISTINCT p.id)', 'photoCount')
      .where('w.id = :id', { id: wedding.id })
      .getRawOne<{ categoryCount: string; photoCount: string }>();
    return {
      ...wedding,
      categoryCount: Number(raw?.categoryCount ?? 0),
      photoCount: Number(raw?.photoCount ?? 0),
      hasCoverPhoto: Boolean(wedding.coverMediumKey),
    };
  }

  private async uniqueSlug(base: string): Promise<string> {
    let slug = base;
    let n = 2;
    while (await this.weddings.existsBy({ slug })) {
      slug = `${base}-${n}`;
      n += 1;
      if (n > 50) {
        throw new ConflictException('Could not generate a unique wedding slug.');
      }
    }
    return slug;
  }
}
