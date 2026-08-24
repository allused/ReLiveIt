import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { InvitationCryptoService } from '../auth/invitation-crypto.service';
import { SessionService } from '../auth/session.service';
import { AccessInvitation } from '../entities/access-invitation.entity';
import { WeddingParticipant } from '../entities/wedding-participant.entity';

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(AccessInvitation)
    private readonly invitations: Repository<AccessInvitation>,
    @InjectRepository(WeddingParticipant)
    private readonly participants: Repository<WeddingParticipant>,
    private readonly crypto: InvitationCryptoService,
    private readonly sessions: SessionService,
  ) {}

  async createForParticipant(participantId: string) {
    await this.ensureParticipant(participantId);
    await this.revokeActive(participantId);
    const raw = this.crypto.generateRawToken();
    const invitation = this.invitations.create({
      participantId,
      tokenHash: this.crypto.hash(raw),
      encryptedToken: this.crypto.encrypt(raw),
    });
    await this.invitations.save(invitation);
    return { invitation, rawToken: raw, url: this.crypto.inviteUrl(raw) };
  }

  async regenerate(participantId: string) {
    await this.ensureParticipant(participantId);
    await this.revokeActive(participantId);
    await this.sessions.revokeParticipant(participantId);
    return this.createForParticipant(participantId);
  }

  async revoke(participantId: string) {
    await this.ensureParticipant(participantId);
    await this.revokeActive(participantId);
    await this.sessions.revokeParticipant(participantId);
    return { ok: true };
  }

  async revokeActive(participantId: string) {
    await this.invitations.update(
      { participantId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async getActive(participantId: string) {
    await this.ensureParticipant(participantId);
    const invitation = await this.invitations.findOne({
      where: { participantId, revokedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    if (!invitation) {
      throw new NotFoundException('No active invitation for this participant.');
    }
    const rawToken = this.crypto.decrypt(invitation.encryptedToken);
    return {
      id: invitation.id,
      createdAt: invitation.createdAt,
      url: this.crypto.inviteUrl(rawToken),
    };
  }

  async getRawToken(participantId: string): Promise<string> {
    const invitation = await this.invitations.findOne({
      where: { participantId, revokedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    if (!invitation) {
      throw new NotFoundException('No active invitation for this participant.');
    }
    return this.crypto.decrypt(invitation.encryptedToken);
  }

  private async ensureParticipant(id: string) {
    const participant = await this.participants.findOne({ where: { id } });
    if (!participant) {
      throw new NotFoundException('Participant not found.');
    }
    return participant;
  }
}
