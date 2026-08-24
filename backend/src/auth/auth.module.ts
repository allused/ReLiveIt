import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessInvitation } from '../entities/access-invitation.entity';
import { Admin } from '../entities/admin.entity';
import { Session } from '../entities/session.entity';
import { WeddingParticipant } from '../entities/wedding-participant.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { InvitationCryptoService } from './invitation-crypto.service';
import { SessionService } from './session.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Admin, Session, WeddingParticipant, AccessInvitation])],
  controllers: [AuthController],
  providers: [AuthService, SessionService, InvitationCryptoService],
  exports: [AuthService, SessionService, InvitationCryptoService],
})
export class AuthModule {}
