import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Response } from 'express';
import { Repository } from 'typeorm';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SessionGuard } from '../auth/guards/session.guard';
import type { AuthContext } from '../auth/auth.types';
import { Photo } from '../entities/photo.entity';
import { ImageStorageService } from '../storage/image-storage.service';

@Controller('media')
@UseGuards(SessionGuard)
export class MediaController {
  constructor(
    @InjectRepository(Photo)
    private readonly photos: Repository<Photo>,
    private readonly storage: ImageStorageService,
  ) {}

  @Get(':photoId')
  async file(
    @Param('photoId', ParseUUIDPipe) photoId: string,
    @Query('variant') variant: 'thumb' | 'medium' | 'original' = 'medium',
    @CurrentUser() auth: AuthContext,
    @Res({ passthrough: true }) res: Response,
  ) {
    const photo = await this.photos.findOne({ where: { id: photoId } });
    if (!photo) {
      throw new NotFoundException('Photo not found.');
    }
    if (auth.kind === 'participant' && auth.weddingId !== photo.weddingId) {
      throw new ForbiddenException('You do not have access to this photo.');
    }

    const key =
      variant === 'original'
        ? photo.originalKey
        : variant === 'thumb'
          ? photo.thumbnailKey
          : photo.mediumKey;
    const buffer = await this.storage.read(key);
    const mime = variant === 'original' ? photo.mimeType : 'image/jpeg';
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    return new StreamableFile(buffer);
  }
}
