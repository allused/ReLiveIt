import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Response } from 'express';
import * as QRCode from 'qrcode';
import { IsNull, Repository } from 'typeorm';
import { ZipFile } from 'yazl';
import { InvitationCryptoService } from '../auth/invitation-crypto.service';
import { SessionService } from '../auth/session.service';
import { participantDisplayName } from '../common/participant-name.util';
import { AccessInvitation } from '../entities/access-invitation.entity';
import { ParticipantRole, WeddingParticipant } from '../entities/wedding-participant.entity';
import { WeddingsService } from './weddings.service';

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(AccessInvitation)
    private readonly invitations: Repository<AccessInvitation>,
    @InjectRepository(WeddingParticipant)
    private readonly participants: Repository<WeddingParticipant>,
    private readonly crypto: InvitationCryptoService,
    private readonly sessions: SessionService,
    private readonly weddings: WeddingsService,
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

  async writeQrZip(weddingId: string, res: Response) {
    const wedding = await this.weddings.get(weddingId);
    const people = await this.participants.find({
      where: { weddingId },
      order: { createdAt: 'ASC' },
    });

    const entries: { name: string; png: Buffer }[] = [];
    const used = new Set<string>();
    let guestIndex = 0;
    let coupleIndex = 0;

    for (const person of people) {
      const invitation = await this.invitations.findOne({
        where: { participantId: person.id, revokedAt: IsNull() },
        order: { createdAt: 'DESC' },
      });
      if (!invitation) continue;

      const url = this.crypto.inviteUrl(this.crypto.decrypt(invitation.encryptedToken));
      const png = await QRCode.toBuffer(url, { type: 'png', width: 512, margin: 2 });
      const folder = person.role === ParticipantRole.REVIEWER ? 'couple' : 'guests';
      const index = person.role === ParticipantRole.REVIEWER ? ++coupleIndex : ++guestIndex;
      entries.push({
        name: uniqueZipName(`${folder}/${padIndex(index)}-${safeLabel(participantDisplayName(person))}.png`, used),
        png,
      });
    }

    if (!entries.length) {
      throw new NotFoundException('No invitation QR codes to download.');
    }

    const filename = `${wedding.slug}-qr-codes.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const zip = new ZipFile();
    const done = new Promise<void>((resolve, reject) => {
      res.on('finish', resolve);
      zip.outputStream.on('error', reject);
    });
    zip.outputStream.pipe(res);
    for (const entry of entries) {
      zip.addBuffer(entry.png, entry.name);
    }
    zip.end();
    await done;
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

function padIndex(index: number) {
  return String(index).padStart(2, '0');
}

function safeLabel(name: string) {
  const cleaned = name
    .normalize('NFKD')
    .replace(/[^\w\s&-]+/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return cleaned || 'guest';
}

function uniqueZipName(name: string, used: Set<string>): string {
  let next = name;
  let n = 2;
  while (used.has(next.toLowerCase())) {
    const dot = name.lastIndexOf('.');
    const stem = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : '';
    next = `${stem}-${n}${ext}`;
    n += 1;
  }
  used.add(next.toLowerCase());
  return next;
}
