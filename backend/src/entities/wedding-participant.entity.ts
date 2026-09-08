import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AccessInvitation } from './access-invitation.entity';
import { Photo } from './photo.entity';
import { Vote } from './vote.entity';
import { Wedding } from './wedding.entity';

export enum ParticipantRole {
  GUEST = 'GUEST',
  REVIEWER = 'REVIEWER',
}

export enum ParticipantStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity('wedding_participants')
@Index(['weddingId', 'role'])
@Index(['weddingId', 'status'])
export class WeddingParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  weddingId: string;

  @ManyToOne(() => Wedding, (wedding) => wedding.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'weddingId' })
  wedding: Wedding;

  @Index()
  @Column({ type: 'varchar' })
  role: ParticipantRole;

  @Column({ type: 'varchar', nullable: true })
  primaryName: string | null;

  @Column({ type: 'varchar', nullable: true })
  secondaryName: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  claimedAt: Date | null;

  @Index()
  @Column({ type: 'varchar', default: ParticipantStatus.ACTIVE })
  status: ParticipantStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lastAccessedAt: Date | null;

  @OneToMany(() => AccessInvitation, (invitation) => invitation.participant)
  invitations: AccessInvitation[];

  @OneToMany(() => Photo, (photo) => photo.uploader)
  photos: Photo[];

  @OneToMany(() => Vote, (vote) => vote.voter)
  votes: Vote[];
}
