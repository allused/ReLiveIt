import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities/category.entity';
import { Photo } from '../entities/photo.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ReorderCategoriesDto } from './dto/reorder-categories.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { WeddingsService } from './weddings.service';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
    @InjectRepository(Photo)
    private readonly photos: Repository<Photo>,
    private readonly weddings: WeddingsService,
  ) {}

  async list(weddingId: string) {
    await this.weddings.get(weddingId);
    return this.categories.find({
      where: { weddingId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async create(weddingId: string, dto: CreateCategoryDto) {
    await this.weddings.get(weddingId);
    const max = await this.categories
      .createQueryBuilder('c')
      .select('MAX(c.sortOrder)', 'max')
      .where('c.weddingId = :weddingId', { weddingId })
      .getRawOne<{ max: number | null }>();
    const category = this.categories.create({
      weddingId,
      name: dto.name.trim(),
      sortOrder: (max?.max ?? -1) + 1,
      isActive: true,
    });
    return this.categories.save(category);
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.categories.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found.');
    }
    if (dto.name !== undefined) {
      category.name = dto.name.trim();
    }
    if (dto.isActive !== undefined) {
      category.isActive = dto.isActive;
    }
    return this.categories.save(category);
  }

  async remove(id: string) {
    const category = await this.categories.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found.');
    }
    const photoCount = await this.photos.count({ where: { categoryId: id } });
    if (photoCount > 0) {
      throw new BadRequestException(
        'This category still has photos. Disable it instead of deleting so historical photos are preserved.',
      );
    }
    await this.categories.delete(id);
    return { ok: true };
  }

  async reorder(weddingId: string, dto: ReorderCategoriesDto) {
    const existing = await this.list(weddingId);
    const existingIds = new Set(existing.map((c) => c.id));
    if (dto.categoryIds.length !== existing.length || dto.categoryIds.some((id) => !existingIds.has(id))) {
      throw new BadRequestException('Category order must include every category exactly once.');
    }
    await Promise.all(
      dto.categoryIds.map((id, index) => this.categories.update(id, { sortOrder: index })),
    );
    return this.list(weddingId);
  }
}
