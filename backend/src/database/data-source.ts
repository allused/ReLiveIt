import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { AccessInvitation } from '../entities/access-invitation.entity';
import { Admin } from '../entities/admin.entity';
import { Category } from '../entities/category.entity';
import { Photo } from '../entities/photo.entity';
import { Session } from '../entities/session.entity';
import { Vote } from '../entities/vote.entity';
import { Wedding } from '../entities/wedding.entity';
import { WeddingParticipant } from '../entities/wedding-participant.entity';

config();

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    Admin,
    Wedding,
    Category,
    WeddingParticipant,
    AccessInvitation,
    Session,
    Photo,
    Vote,
  ],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
});
