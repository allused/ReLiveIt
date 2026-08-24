import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ParticipantAuth } from '../auth/auth.types';
import { DEFAULT_TOP_N } from '../common/constants';
import { rankPhotos } from '../common/rankings.util';
import { Category } from '../entities/category.entity';
import { Photo } from '../entities/photo.entity';
import { Wedding, WeddingStatus } from '../entities/wedding.entity';
import { ParticipantRole, WeddingParticipant } from '../entities/wedding-participant.entity';

@Injectable()
export class ReviewerService {
  constructor(
    @InjectRepository(Wedding)
    private readonly weddings: Repository<Wedding>,
    @InjectRepository(Photo)
    private readonly photoRepo: Repository<Photo>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(WeddingParticipant)
    private readonly participants: Repository<WeddingParticipant>,
    private readonly config: ConfigService,
  ) {}

  private async getWedding(id: string, auth: ParticipantAuth) {
    if (auth.weddingId !== id) {
      throw new ForbiddenException('You do not have access to this wedding.');
    }
    const wedding = await this.weddings.findOne({ where: { id } });
    if (!wedding) {
      throw new NotFoundException('Wedding not found.');
    }
    return wedding;
  }

  async dashboard(id: string, auth: ParticipantAuth) {
    const wedding = await this.getWedding(id, auth);
    const [photoCount, categoryCount, guestCount] = await Promise.all([
      this.photoRepo.count({ where: { weddingId: id } }),
      this.categoryRepo.count({ where: { weddingId: id } }),
      this.participants.count({ where: { weddingId: id, role: ParticipantRole.GUEST } }),
    ]);
    return {
      ...wedding,
      photoCount,
      categoryCount,
      guestCount,
    };
  }

  async listPhotos(id: string, auth: ParticipantAuth, page = 1, limit = 24, categoryId?: string) {
    const wedding = await this.getWedding(id, auth);
    const qb = this.photoRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.uploader', 'uploader')
      .leftJoinAndSelect('p.category', 'category')
      .where('p.weddingId = :weddingId', { weddingId: wedding.id })
      .orderBy('p.createdAt', 'DESC')
      .skip((Math.max(1, page) - 1) * limit)
      .take(Math.min(60, Math.max(1, limit)));
    if (categoryId) {
      qb.andWhere('p.categoryId = :categoryId', { categoryId });
    }
    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async listCategories(id: string, auth: ParticipantAuth) {
    await this.getWedding(id, auth);
    return this.categoryRepo.find({
      where: { weddingId: id },
      order: { sortOrder: 'ASC' },
    });
  }

  async rankings(id: string, auth: ParticipantAuth) {
    const wedding = await this.getWedding(id, auth);
    if (wedding.status !== WeddingStatus.CONCLUDED) {
      throw new BadRequestException('Final rankings are available after the wedding is concluded.');
    }
    const topN = Number(this.config.get('TOP_N') ?? DEFAULT_TOP_N);
    const categories = await this.categoryRepo.find({
      where: { weddingId: id },
      order: { sortOrder: 'ASC' },
    });

    const rows = await this.photoRepo
      .createQueryBuilder('p')
      .leftJoin('p.votes', 'v')
      .select('p.id', 'id')
      .addSelect('p.categoryId', 'categoryId')
      .addSelect('p.createdAt', 'createdAt')
      .addSelect('COALESCE(SUM(v.value), 0)', 'totalPoints')
      .addSelect('COUNT(v.id)', 'voteCount')
      .where('p.weddingId = :weddingId', { weddingId: id })
      .andWhere('p.categoryId IS NOT NULL')
      .groupBy('p.id')
      .getRawMany<{
        id: string;
        categoryId: string;
        createdAt: Date;
        totalPoints: string;
        voteCount: string;
      }>();

    const ranked = rankPhotos(
      rows.map((row) => ({
        id: row.id,
        categoryId: row.categoryId,
        createdAt: new Date(row.createdAt),
        totalPoints: Number(row.totalPoints),
        voteCount: Number(row.voteCount),
      })),
    );

    const photos =
      ranked.length === 0
        ? []
        : await this.photoRepo.find({ where: { id: In(ranked.map((r) => r.id)) } });
    const photoMap = new Map(photos.map((p) => [p.id, p]));

    return categories.map((category) => {
      const items = ranked
        .filter((r) => r.categoryId === category.id)
        .map((r) => ({
          ...r,
          photo: photoMap.get(r.id) ?? null,
        }));
      return {
        category,
        top: items.slice(0, topN),
        all: items,
      };
    });
  }

  async timeline(id: string, auth: ParticipantAuth) {
    await this.getWedding(id, auth);
    const photos = await this.photoRepo.find({
      where: { weddingId: id },
      relations: { uploader: true, category: true },
      order: { createdAt: 'ASC' },
    });

    const groups: { label: string; photos: Photo[] }[] = [];
    for (const photo of photos) {
      const label = photo.createdAt.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const last = groups[groups.length - 1];
      if (last && last.label === label) {
        last.photos.push(photo);
      } else {
        groups.push({ label, photos: [photo] });
      }
    }
    return { groups, total: photos.length };
  }

  async conclude(id: string, auth: ParticipantAuth) {
    const wedding = await this.getWedding(id, auth);
    if (wedding.status === WeddingStatus.CONCLUDED) {
      throw new BadRequestException('This wedding has already been concluded.');
    }
    wedding.status = WeddingStatus.CONCLUDED;
    wedding.concludedAt = new Date();
    return this.weddings.save(wedding);
  }
}
