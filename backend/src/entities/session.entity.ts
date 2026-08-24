import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ unique: true })
  tokenHash: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  adminId: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  participantId: string | null;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
