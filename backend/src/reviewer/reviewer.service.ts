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
import { DEFAULT_OVERALL_TOP_N, DEFAULT_TOP_N } from '../common/constants';
import { rankPhotos } from '../common/rankings.util';
import { Category } from '../entities/category.entity';
import { Photo } from '../entities/photo.entity';
import { TimelineEvent } from '../entities/timeline-event.entity';
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
    @InjectRepository(TimelineEvent)
    private readonly timelineEvents: Repository<TimelineEvent>,
    private readonly config: ConfigService,
  ) {}

  async getWeddingForZip(id: string, auth: ParticipantAuth) {
    return this.getWedding(id, auth);
  }

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
    const overallTopN = Number(this.config.get('OVERALL_TOP_N') ?? DEFAULT_OVERALL_TOP_N);
    const categories = await this.categoryRepo.find({
      where: { weddingId: id },
      order: { sortOrder: 'ASC' },
    });
    const categoryMap = new Map(categories.map((category) => [category.id, category]));

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

    const scored = rows.map((row) => ({
      id: row.id,
      categoryId: row.categoryId,
      createdAt: new Date(row.createdAt),
      totalPoints: Number(row.totalPoints),
      voteCount: Number(row.voteCount),
    }));

    const photos =
      scored.length === 0
        ? []
        : await this.photoRepo.find({ where: { id: In(scored.map((r) => r.id)) } });
    const photoMap = new Map(photos.map((p) => [p.id, p]));

    const toItem = <T extends { id: string; categoryId: string }>(ranked: T) => ({
      ...ranked,
      photo: photoMap.get(ranked.id) ?? null,
      category: categoryMap.get(ranked.categoryId) ?? null,
    });

    return {
      overall: rankPhotos(scored).slice(0, overallTopN).map(toItem),
      categories: categories.map((category) => {
        const items = rankPhotos(scored.filter((row) => row.categoryId === category.id)).map(toItem);
        return {
          category,
          top: items.slice(0, topN),
          all: items,
        };
      }),
    };
  }

  async timeline(id: string, auth: ParticipantAuth) {
    await this.getWedding(id, auth);
    const [photos, events] = await Promise.all([
      this.photoRepo.find({
        where: { weddingId: id },
        relations: { uploader: true, category: true },
        order: { createdAt: 'ASC' },
      }),
      this.timelineEvents.find({
        where: { weddingId: id },
        order: { occursAt: 'ASC' },
      }),
    ]);

    const items: Array<
      | { type: 'event'; event: TimelineEvent }
      | { type: 'photos'; label: string; photos: Photo[] }
    > = [];
    let photoIndex = 0;
    let eventIndex = 0;
    while (photoIndex < photos.length || eventIndex < events.length) {
      const photo = photos[photoIndex];
      const event = events[eventIndex];
      if (event && (!photo || event.occursAt.getTime() <= photo.createdAt.getTime())) {
        items.push({ type: 'event', event });
        eventIndex += 1;
        continue;
      }
      if (!photo) {
        break;
      }
      const group: Photo[] = [photo];
      const hour = hourKey(photo.createdAt);
      photoIndex += 1;
      const nextEventAt = events[eventIndex]?.occursAt.getTime();
      while (photoIndex < photos.length) {
        const next = photos[photoIndex];
        if (nextEventAt !== undefined && next.createdAt.getTime() >= nextEventAt) {
          break;
        }
        if (hourKey(next.createdAt) !== hour) {
          break;
        }
        group.push(next);
        photoIndex += 1;
      }
      items.push({ type: 'photos', label: formatHour(photo.createdAt), photos: group });
    }

    return { items, total: photos.length };
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

function hourKey(value: Date) {
  return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}-${value.getHours()}`;
}

function formatHour(value: Date) {
  const start = new Date(value);
  start.setMinutes(0, 0, 0);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);
  const time = (date: Date) =>
    date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  return `${time(start)} – ${time(end)}`;
}
