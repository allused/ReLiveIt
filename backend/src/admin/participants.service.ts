import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionService } from '../auth/session.service';
import { MAX_GUEST_BATCH } from '../common/constants';
import { participantDisplayName, participantIsClaimed } from '../common/participant-name.util';
import { AccessInvitation } from '../entities/access-invitation.entity';
import {
  ParticipantRole,
  ParticipantStatus,
  WeddingParticipant,
} from '../entities/wedding-participant.entity';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { InvitationsService } from './invitations.service';
import { WeddingsService } from './weddings.service';

@Injectable()
export class ParticipantsService {
  constructor(
    @InjectRepository(WeddingParticipant)
    private readonly participants: Repository<WeddingParticipant>,
    @InjectRepository(AccessInvitation)
    private readonly invitations: Repository<AccessInvitation>,
    private readonly weddings: WeddingsService,
    private readonly invitationService: InvitationsService,
    private readonly sessions: SessionService,
  ) {}

  async list(weddingId: string) {
    await this.weddings.get(weddingId);
    const people = await this.participants.find({
      where: { weddingId },
      order: { createdAt: 'ASC' },
    });
    return Promise.all(
      people.map(async (person) => {
        const latestInvitation = await this.invitations.findOne({
          where: { participantId: person.id },
          order: { createdAt: 'DESC' },
        });
        const activeInvitation = await this.invitations
          .createQueryBuilder('i')
          .where('i.participantId = :id', { id: person.id })
          .andWhere('i.revokedAt IS NULL')
          .orderBy('i.createdAt', 'DESC')
          .getOne();
        return {
          ...person,
          displayName: participantDisplayName(person),
          claimed: participantIsClaimed(person),
          invitationStatus: activeInvitation ? 'ACTIVE' : 'REVOKED',
          invitationCreatedAt: activeInvitation?.createdAt ?? latestInvitation?.createdAt ?? null,
        };
      }),
    );
  }

  async create(weddingId: string, dto: CreateParticipantDto) {
    await this.weddings.get(weddingId);
    const count = dto.role === ParticipantRole.GUEST ? (dto.count ?? 1) : 1;
    if (dto.role === ParticipantRole.REVIEWER && (dto.count ?? 1) > 1) {
      throw new BadRequestException('Reviewers are added one at a time.');
    }
    if (dto.role === ParticipantRole.REVIEWER && !dto.primaryName?.trim()) {
      throw new BadRequestException('A name is required for reviewers.');
    }
    if (count > MAX_GUEST_BATCH) {
      throw new BadRequestException(`You can add at most ${MAX_GUEST_BATCH} guests at once.`);
    }

    const created: WeddingParticipant[] = [];
    for (let i = 0; i < count; i += 1) {
      created.push(await this.createOne(weddingId, dto, count > 1));
    }
    if (count === 1) {
      return this.withDisplay(created[0]);
    }
    return { count: created.length, items: created.map((person) => this.withDisplay(person)) };
  }

  private async createOne(weddingId: string, dto: CreateParticipantDto, forceUnnamed: boolean) {
    const named = !forceUnnamed && Boolean(dto.primaryName?.trim());
    const participant = await this.participants.save(
      this.participants.create({
        weddingId,
        role: dto.role,
        primaryName: named ? dto.primaryName!.trim() : null,
        secondaryName: named && dto.secondaryName?.trim() ? dto.secondaryName.trim() : null,
        claimedAt: named || dto.role === ParticipantRole.REVIEWER ? new Date() : null,
        status: ParticipantStatus.ACTIVE,
      }),
    );
    await this.invitationService.createForParticipant(participant.id);
    return participant;
  }

  private withDisplay(person: WeddingParticipant) {
    return {
      ...person,
      displayName: participantDisplayName(person),
      claimed: participantIsClaimed(person),
    };
  }

  async get(id: string) {
    const participant = await this.participants.findOne({ where: { id } });
    if (!participant) {
      throw new NotFoundException('Participant not found.');
    }
    return participant;
  }

  async update(id: string, dto: UpdateParticipantDto) {
    const participant = await this.get(id);
    if (dto.primaryName) {
      participant.primaryName = dto.primaryName.trim();
      if (!participant.claimedAt) {
        participant.claimedAt = new Date();
      }
    }
    if (dto.secondaryName !== undefined) {
      participant.secondaryName = dto.secondaryName?.trim() ? dto.secondaryName.trim() : null;
    }
    if (dto.status) {
      participant.status = dto.status;
      if (dto.status === ParticipantStatus.INACTIVE) {
        await this.invitationService.revokeActive(id);
        await this.sessions.revokeParticipant(id);
      }
    }
    return this.participants.save(participant);
  }
}
