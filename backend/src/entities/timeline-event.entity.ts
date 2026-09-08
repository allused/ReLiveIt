import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Wedding } from './wedding.entity';

@Entity('timeline_events')
@Index(['weddingId', 'occursAt'])
export class TimelineEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  weddingId: string;

  @ManyToOne(() => Wedding, (wedding) => wedding.timelineEvents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'weddingId' })
  wedding: Wedding;

  @Column()
  title: string;

  @Column({ type: 'timestamptz' })
  occursAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
