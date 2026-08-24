import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Photo } from './photo.entity';
import { WeddingParticipant } from './wedding-participant.entity';

@Entity('votes')
@Unique(['photoId', 'voterParticipantId'])
@Check(`"value" IN (0, 1)`)
export class Vote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  photoId: string;

  @ManyToOne(() => Photo, (photo) => photo.votes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'photoId' })
  photo: Photo;

  @Index()
  @Column()
  voterParticipantId: string;

  @ManyToOne(() => WeddingParticipant, (participant) => participant.votes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'voterParticipantId' })
  voter: WeddingParticipant;

  @Column({ type: 'int' })
  value: 0 | 1;

  @CreateDateColumn()
  createdAt: Date;
}
