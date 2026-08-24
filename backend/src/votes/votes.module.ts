import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Photo } from '../entities/photo.entity';
import { Vote } from '../entities/vote.entity';
import { Wedding } from '../entities/wedding.entity';
import { VotesController } from './votes.controller';
import { VotesService } from './votes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Vote, Photo, Wedding])],
  controllers: [VotesController],
  providers: [VotesService],
  exports: [VotesService],
})
export class VotesModule {}
