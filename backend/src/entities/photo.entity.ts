import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Category } from './category.entity';
import { Vote } from './vote.entity';
import { Wedding } from './wedding.entity';
import { WeddingParticipant } from './wedding-participant.entity';

@Entity('photos')
@Index(['weddingId', 'createdAt'])
export class Photo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  weddingId: string;

  @ManyToOne(() => Wedding, (wedding) => wedding.photos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'weddingId' })
  wedding: Wedding;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  categoryId: string | null;

  @ManyToOne(() => Category, (category) => category.photos, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category: Category | null;

  @Index()
  @Column()
  uploaderParticipantId: string;

  @ManyToOne(() => WeddingParticipant, (participant) => participant.photos, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'uploaderParticipantId' })
  uploader: WeddingParticipant;

  @Column()
  originalKey: string;

  @Column()
  mediumKey: string;

  @Column()
  thumbnailKey: string;

  @Column()
  originalFilename: string;

  @Column()
  mimeType: string;

  @Column({ type: 'int' })
  fileSize: number;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Vote, (vote) => vote.photo)
  votes: Vote[];
}
