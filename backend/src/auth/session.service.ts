import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { SESSION_TTL_MS } from '../common/constants';
import { hmacSha256, randomToken } from '../common/crypto.util';
import { Session } from '../entities/session.entity';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(Session)
    private readonly sessions: Repository<Session>,
    private readonly config: ConfigService,
  ) {}

  private hash(token: string): string {
    return hmacSha256(this.config.getOrThrow('SESSION_SECRET'), token);
  }

  async create(params: { adminId?: string; participantId?: string }): Promise<string> {
    const token = randomToken();
    const session = this.sessions.create({
      tokenHash: this.hash(token),
      adminId: params.adminId ?? null,
      participantId: params.participantId ?? null,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    });
    await this.sessions.save(session);
    return token;
  }

  async findValid(token: string): Promise<Session | null> {
    const session = await this.sessions.findOne({
      where: { tokenHash: this.hash(token) },
    });
    if (!session || session.expiresAt.getTime() < Date.now()) {
      if (session) {
        await this.sessions.delete(session.id);
      }
      return null;
    }
    return session;
  }

  async revokeByToken(token: string): Promise<void> {
    await this.sessions.delete({ tokenHash: this.hash(token) });
  }

  async revokeParticipant(participantId: string): Promise<void> {
    await this.sessions.delete({ participantId });
  }

  async purgeExpired(): Promise<void> {
    await this.sessions.delete({ expiresAt: LessThan(new Date()) });
  }
}
