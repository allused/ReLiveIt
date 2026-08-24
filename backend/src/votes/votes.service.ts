import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParticipantAuth } from '../auth/auth.types';
import { selectQuickVotePhotos } from '../common/rankings.util';
import { Photo } from '../entities/photo.entity';
import { Vote } from '../entities/vote.entity';
import { Wedding, WeddingStatus } from '../entities/wedding.entity';

@Injectable()
export class VotesService {
  constructor(
    @InjectRepository(Vote)
    private readonly votes: Repository<Vote>,
    @InjectRepository(Photo)
    private readonly photos: Repository<Photo>,
    @InjectRepository(Wedding)
    private readonly weddings: Repository<Wedding>,
  ) {}

  private async getActiveWedding(slug: string, auth: ParticipantAuth) {
    const wedding = await this.weddings.findOne({ where: { slug } });
    if (!wedding) {
      throw new NotFoundException('Wedding not found.');
    }
    if (auth.weddingId !== wedding.id) {
      throw new ForbiddenException('You do not have access to this wedding.');
    }
    return wedding;
  }

  private assertActive(wedding: Wedding) {
    if (wedding.status === WeddingStatus.CONCLUDED) {
      throw new BadRequestException(
        'This wedding has already concluded. Votes are no longer available.',
      );
    }
  }

  async categoryQueue(slug: string, categoryId: string, auth: ParticipantAuth) {
    const wedding = await this.getActiveWedding(slug, auth);
    this.assertActive(wedding);
    const photos = await this.photos
      .createQueryBuilder('p')
      .where('p.weddingId = :weddingId', { weddingId: wedding.id })
      .andWhere('p.categoryId = :categoryId', { categoryId })
      .andWhere('p.uploaderParticipantId != :me', { me: auth.participantId })
      .andWhere(
        `p.id NOT IN (SELECT v."photoId" FROM votes v WHERE v."voterParticipantId" = :me)`,
        { me: auth.participantId },
      )
      .orderBy('RANDOM()')
      .getMany();
    return { photos, total: photos.length };
  }

  async quickVoteQueue(slug: string, auth: ParticipantAuth) {
    const wedding = await this.getActiveWedding(slug, auth);
    this.assertActive(wedding);
    if (!wedding.quickVoteEnabled) {
      throw new BadRequestException('Quick Vote is not available for this wedding.');
    }

    const rows = await this.photos
      .createQueryBuilder('p')
      .leftJoin('p.votes', 'v')
      .select('p.id', 'id')
      .addSelect('p.categoryId', 'categoryId')
      .addSelect('COUNT(v.id)', 'voteCount')
      .where('p.weddingId = :weddingId', { weddingId: wedding.id })
      .andWhere('p.uploaderParticipantId != :me', { me: auth.participantId })
      .andWhere(
        `p.id NOT IN (SELECT vote."photoId" FROM votes vote WHERE vote."voterParticipantId" = :me)`,
        { me: auth.participantId },
      )
      .groupBy('p.id')
      .addGroupBy('p.categoryId')
      .getRawMany<{ id: string; categoryId: string | null; voteCount: string }>();

    const selected = selectQuickVotePhotos(
      rows.map((row) => ({
        id: row.id,
        categoryId: row.categoryId,
        voteCount: Number(row.voteCount),
      })),
      wedding.quickVotePhotoCount,
    );

    if (selected.length === 0) {
      return { photos: [], requested: wedding.quickVotePhotoCount, total: 0 };
    }

    const photos = await this.photos
      .createQueryBuilder('p')
      .whereInIds(selected.map((s) => s.id))
      .getMany();
    const order = new Map(selected.map((s, i) => [s.id, i]));
    photos.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    return {
      photos,
      requested: wedding.quickVotePhotoCount,
      total: photos.length,
    };
  }

  async vote(photoId: string, value: 0 | 1, auth: ParticipantAuth) {
    const photo = await this.photos.findOne({
      where: { id: photoId },
      relations: { wedding: true },
    });
    if (!photo) {
      throw new NotFoundException('Photo not found.');
    }
    if (photo.weddingId !== auth.weddingId) {
      throw new ForbiddenException('You do not have access to this photo.');
    }
    if (photo.wedding.status === WeddingStatus.CONCLUDED) {
      throw new BadRequestException(
        'This wedding has already concluded. Votes are no longer available.',
      );
    }
    if (photo.uploaderParticipantId === auth.participantId) {
      throw new BadRequestException('You cannot vote on your own photo.');
    }
    if (value !== 0 && value !== 1) {
      throw new BadRequestException('Vote must be 0 or 1.');
    }

    try {
      const vote = this.votes.create({
        photoId,
        voterParticipantId: auth.participantId,
        value,
      });
      return await this.votes.save(vote);
    } catch {
      throw new BadRequestException('You have already voted on this photo.');
    }
  }
}
