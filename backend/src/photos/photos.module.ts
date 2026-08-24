import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../entities/category.entity';
import { Photo } from '../entities/photo.entity';
import { Wedding } from '../entities/wedding.entity';
import { StorageModule } from '../storage/storage.module';
import { MediaController } from './media.controller';
import { PhotosController } from './photos.controller';
import { PhotosService } from './photos.service';

@Module({
  imports: [StorageModule, TypeOrmModule.forFeature([Photo, Wedding, Category])],
  controllers: [PhotosController, MediaController],
  providers: [PhotosService],
  exports: [PhotosService],
})
export class PhotosModule {}
