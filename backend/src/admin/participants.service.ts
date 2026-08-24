import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionService } from '../auth/session.service';
import { AccessInvitation } from '../entities/access-invitation.entity';
import {
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
          displayName: person.secondaryName
            ? `${person.primaryName} & ${person.secondaryName}`
            : person.primaryName,
          invitationStatus: activeInvitation ? 'ACTIVE' : 'REVOKED',
          invitationCreatedAt: activeInvitation?.createdAt ?? latestInvitation?.createdAt ?? null,
        };
      }),
    );
  }

  async create(weddingId: string, dto: CreateParticipantDto) {
    await this.weddings.get(weddingId);
    const participant = await this.participants.save(
      this.participants.create({
        weddingId,
        role: dto.role,
        primaryName: dto.primaryName.trim(),
        secondaryName: dto.secondaryName?.trim() ? dto.secondaryName.trim() : null,
        status: ParticipantStatus.ACTIVE,
      }),
    );
    await this.invitationService.createForParticipant(participant.id);
    return this.get(participant.id);
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
