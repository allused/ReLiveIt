import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../entities/category.entity';
import { Photo } from '../entities/photo.entity';
import { Wedding } from '../entities/wedding.entity';
import { WeddingParticipant } from '../entities/wedding-participant.entity';
import { ReviewerController } from './reviewer.controller';
import { ReviewerService } from './reviewer.service';

@Module({
  imports: [TypeOrmModule.forFeature([Wedding, Photo, Category, WeddingParticipant])],
  controllers: [ReviewerController],
  providers: [ReviewerService],
})
export class ReviewerModule {}
