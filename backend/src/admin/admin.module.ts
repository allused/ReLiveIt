import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AccessInvitation } from '../entities/access-invitation.entity';
import { Category } from '../entities/category.entity';
import { Photo } from '../entities/photo.entity';
import { Wedding } from '../entities/wedding.entity';
import { WeddingParticipant } from '../entities/wedding-participant.entity';
import { AdminController } from './admin.controller';
import { CategoriesService } from './categories.service';
import { InvitationsService } from './invitations.service';
import { ParticipantsService } from './participants.service';
import { WeddingsService } from './weddings.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Wedding, Category, WeddingParticipant, AccessInvitation, Photo]),
  ],
  controllers: [AdminController],
  providers: [WeddingsService, CategoriesService, ParticipantsService, InvitationsService],
  exports: [WeddingsService, CategoriesService, ParticipantsService, InvitationsService],
})
export class AdminModule {}
