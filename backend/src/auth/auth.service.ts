import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { participantDisplayName, participantIsClaimed } from '../common/participant-name.util';
import { Admin } from '../entities/admin.entity';
import {
  ParticipantRole,
  ParticipantStatus,
  WeddingParticipant,
} from '../entities/wedding-participant.entity';
import { AccessInvitation } from '../entities/access-invitation.entity';
import { AuthContext } from './auth.types';
import { ClaimNameDto } from './dto/claim-name.dto';
import { InvitationCryptoService } from './invitation-crypto.service';
import { SessionService } from './session.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Admin)
    private readonly admins: Repository<Admin>,
    @InjectRepository(WeddingParticipant)
    private readonly participants: Repository<WeddingParticipant>,
    @InjectRepository(AccessInvitation)
    private readonly invitations: Repository<AccessInvitation>,
    private readonly sessions: SessionService,
    private readonly invitationCrypto: InvitationCryptoService,
  ) {}

  async loginAdmin(username: string, password: string): Promise<string> {
    const admin = await this.admins.findOne({ where: { username } });
    if (!admin) {
      throw new UnauthorizedException('Invalid username or password.');
    }
    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid username or password.');
    }
    return this.sessions.create({ adminId: admin.id });
  }

  async exchangeInvitation(rawToken: string): Promise<{
    sessionToken: string;
    participant: WeddingParticipant;
    needsName: boolean;
  }> {
    const tokenHash = this.invitationCrypto.hash(rawToken);
    const invitation = await this.invitations.findOne({
      where: { tokenHash },
      relations: { participant: { wedding: true } },
    });

    if (
      !invitation ||
      invitation.revokedAt ||
      (invitation.expiresAt && invitation.expiresAt.getTime() < Date.now())
    ) {
      throw new UnauthorizedException(
        'This invitation link is invalid, expired, or has been replaced. Please ask the wedding organizer for a new QR code.',
      );
    }

    const participant = invitation.participant;
    if (participant.status !== ParticipantStatus.ACTIVE) {
      throw new UnauthorizedException(
        'This participant account is inactive. Please contact the wedding organizer.',
      );
    }

    const sessionToken = await this.sessions.create({ participantId: participant.id });
    void this.participants.update(participant.id, { lastAccessedAt: new Date() });
    const needsName =
      participant.role === ParticipantRole.GUEST && !participantIsClaimed(participant);
    return { sessionToken, participant, needsName };
  }

  async claimName(auth: AuthContext, dto: ClaimNameDto) {
    if (auth.kind !== 'participant' || auth.role !== ParticipantRole.GUEST) {
      throw new BadRequestException('Only guests can set a name from an invitation.');
    }
    const participant = await this.participants.findOne({
      where: { id: auth.participantId },
      relations: { wedding: true },
    });
    if (!participant) {
      throw new UnauthorizedException('Authentication required.');
    }
    if (participantIsClaimed(participant)) {
      throw new BadRequestException('This invitation already has a name.');
    }
    participant.primaryName = dto.primaryName.trim();
    participant.secondaryName = dto.secondaryName?.trim() ? dto.secondaryName.trim() : null;
    participant.claimedAt = new Date();
    await this.participants.save(participant);
    const next = await this.resolveParticipant(participant);
    return this.serialize(next);
  }

  async resolveSession(rawSessionToken: string): Promise<AuthContext | null> {
    const session = await this.sessions.findValid(rawSessionToken);
    if (!session) {
      return null;
    }

    if (session.adminId) {
      const admin = await this.admins.findOne({ where: { id: session.adminId } });
      if (!admin) {
        return null;
      }
      return { kind: 'admin', adminId: admin.id, username: admin.username };
    }

    if (session.participantId) {
      const participant = await this.participants.findOne({
        where: { id: session.participantId },
        relations: { wedding: true },
      });
      if (!participant || participant.status !== ParticipantStatus.ACTIVE) {
        return null;
      }
      return this.resolveParticipant(participant);
    }

    return null;
  }

  private resolveParticipant(participant: WeddingParticipant): AuthContext {
    const claimed = participantIsClaimed(participant);
    return {
      kind: 'participant',
      participantId: participant.id,
      weddingId: participant.weddingId,
      role: participant.role,
      primaryName: participant.primaryName,
      secondaryName: participant.secondaryName,
      displayName: claimed ? participantDisplayName(participant) : 'Guest',
      claimed,
      weddingSlug: participant.wedding.slug,
      weddingName: participant.wedding.name,
    };
  }

  serialize(auth: AuthContext) {
    if (auth.kind === 'admin') {
      return { kind: 'admin' as const, username: auth.username };
    }
    return {
      kind: 'participant' as const,
      role: auth.role,
      participantId: auth.participantId,
      weddingId: auth.weddingId,
      weddingSlug: auth.weddingSlug,
      weddingName: auth.weddingName,
      primaryName: auth.primaryName,
      secondaryName: auth.secondaryName,
      displayName: auth.displayName,
      claimed: auth.claimed,
    };
  }
}
