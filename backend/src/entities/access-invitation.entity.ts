import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WeddingParticipant } from './wedding-participant.entity';

@Entity('access_invitations')
export class AccessInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  participantId: string;

  @ManyToOne(() => WeddingParticipant, (participant) => participant.invitations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'participantId' })
  participant: WeddingParticipant;

  @Index({ unique: true })
  @Column({ unique: true })
  tokenHash: string;

  @Column({ type: 'text' })
  encryptedToken: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;
}
