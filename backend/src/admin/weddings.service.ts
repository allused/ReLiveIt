import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DEFAULT_QUICK_VOTE_COUNT } from '../common/constants';
import { slugify } from '../common/slug';
import { Wedding, WeddingStatus } from '../entities/wedding.entity';
import { CreateWeddingDto } from './dto/create-wedding.dto';
import { UpdateWeddingDto } from './dto/update-wedding.dto';

type WeddingWithCounts = Wedding & { categoryCount: number; photoCount: number };

@Injectable()
export class WeddingsService {
  constructor(
    @InjectRepository(Wedding)
    private readonly weddings: Repository<Wedding>,
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
