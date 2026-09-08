import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TimelineEvent } from '../entities/timeline-event.entity';
import { CreateTimelineEventDto } from './dto/create-timeline-event.dto';
import { UpdateTimelineEventDto } from './dto/update-timeline-event.dto';
import { WeddingsService } from './weddings.service';

@Injectable()
export class TimelineEventsService {
  constructor(
    @InjectRepository(TimelineEvent)
    private readonly events: Repository<TimelineEvent>,
    private readonly weddings: WeddingsService,
  ) {}

  async list(weddingId: string) {
    await this.weddings.get(weddingId);
    return this.events.find({
      where: { weddingId },
      order: { occursAt: 'ASC', createdAt: 'ASC' },
    });
  }

  async create(weddingId: string, dto: CreateTimelineEventDto) {
    await this.weddings.get(weddingId);
    const event = this.events.create({
      weddingId,
      title: dto.title.trim(),
      occursAt: parseOccursAt(dto.occursAt),
    });
    return this.events.save(event);
  }

  async update(id: string, dto: UpdateTimelineEventDto) {
    const event = await this.events.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException('Timeline moment not found.');
    }
    if (dto.title !== undefined) {
      event.title = dto.title.trim();
    }
    if (dto.occursAt !== undefined) {
      event.occursAt = parseOccursAt(dto.occursAt);
    }
    return this.events.save(event);
  }

  async remove(id: string) {
    const event = await this.events.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException('Timeline moment not found.');
    }
    await this.events.delete(id);
    return { ok: true };
  }
}

function parseOccursAt(value: string): Date {
  const occursAt = new Date(value);
  if (Number.isNaN(occursAt.getTime())) {
    throw new BadRequestException('Please enter a valid time.');
  }
  return occursAt;
}
