import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AccessInvitation } from '../entities/access-invitation.entity';
import { Category } from '../entities/category.entity';
import { Photo } from '../entities/photo.entity';
import { TimelineEvent } from '../entities/timeline-event.entity';
import { Wedding } from '../entities/wedding.entity';
import { WeddingParticipant } from '../entities/wedding-participant.entity';
import { StorageModule } from '../storage/storage.module';
import { AdminController } from './admin.controller';
import { CategoriesService } from './categories.service';
import { InvitationsService } from './invitations.service';
import { ParticipantsService } from './participants.service';
import { TimelineEventsService } from './timeline-events.service';
import { WeddingsService } from './weddings.service';

@Module({
  imports: [
    AuthModule,
    StorageModule,
    TypeOrmModule.forFeature([
      Wedding,
      Category,
      WeddingParticipant,
      AccessInvitation,
      Photo,
      TimelineEvent,
    ]),
  ],
  controllers: [AdminController],
  providers: [
    WeddingsService,
    CategoriesService,
    ParticipantsService,
    InvitationsService,
    TimelineEventsService,
  ],
  exports: [
    WeddingsService,
    CategoriesService,
    ParticipantsService,
    InvitationsService,
    TimelineEventsService,
  ],
})
export class AdminModule {}
