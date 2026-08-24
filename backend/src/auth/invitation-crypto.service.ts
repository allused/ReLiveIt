import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { decryptAesGcm, encryptAesGcm, hmacSha256, randomToken } from '../common/crypto.util';

@Injectable()
export class InvitationCryptoService {
  constructor(private readonly config: ConfigService) {}

  generateRawToken(): string {
    return randomToken(32);
  }

  hash(rawToken: string): string {
    return hmacSha256(this.config.getOrThrow('INVITATION_TOKEN_HASH_SECRET'), rawToken);
  }

  encrypt(rawToken: string): string {
    return encryptAesGcm(rawToken, this.config.getOrThrow('INVITATION_TOKEN_ENCRYPTION_KEY'));
  }

  decrypt(encryptedToken: string): string {
    return decryptAesGcm(encryptedToken, this.config.getOrThrow('INVITATION_TOKEN_ENCRYPTION_KEY'));
  }

  inviteUrl(rawToken: string): string {
    const frontend = this.config.get('FRONTEND_URL', 'http://localhost:5173').replace(/\/$/, '');
    return `${frontend}/invite/${rawToken}`;
  }
}
