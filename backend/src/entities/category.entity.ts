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
import { Photo } from './photo.entity';
import { Wedding } from './wedding.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  weddingId: string;

  @ManyToOne(() => Wedding, (wedding) => wedding.categories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'weddingId' })
  wedding: Wedding;

  @Column()
  name: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Photo, (photo) => photo.category)
  photos: Photo[];
}
