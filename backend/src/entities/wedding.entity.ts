import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Category } from './category.entity';
import { Photo } from './photo.entity';
import { WeddingParticipant } from './wedding-participant.entity';

export enum WeddingStatus {
  ACTIVE = 'ACTIVE',
  CONCLUDED = 'CONCLUDED',
}

@Entity('weddings')
export class Wedding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Index({ unique: true })
  @Column({ unique: true })
  slug: string;

  @Index()
  @Column({ type: 'varchar', default: WeddingStatus.ACTIVE })
  status: WeddingStatus;

  @Column({ type: 'boolean', default: false })
  quickVoteEnabled: boolean;

  @Column({ type: 'int', default: 20 })
  quickVotePhotoCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  concludedAt: Date | null;

  @OneToMany(() => Category, (category) => category.wedding)
  categories: Category[];

  @OneToMany(() => WeddingParticipant, (participant) => participant.wedding)
  participants: WeddingParticipant[];

  @OneToMany(() => Photo, (photo) => photo.wedding)
  photos: Photo[];
}
