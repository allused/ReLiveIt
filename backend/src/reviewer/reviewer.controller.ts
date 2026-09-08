import { Controller, Get, Param, ParseUUIDPipe, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ReviewerGuard } from '../auth/guards/reviewer.guard';
import { SessionGuard } from '../auth/guards/session.guard';
import type { ParticipantAuth } from '../auth/auth.types';
import { PhotosService } from '../photos/photos.service';
import { ReviewerService } from './reviewer.service';

@Controller('reviewer/weddings')
@UseGuards(SessionGuard, ReviewerGuard)
export class ReviewerController {
  constructor(
    private readonly reviewer: ReviewerService,
    private readonly photosService: PhotosService,
  ) {}

  @Get(':id')
  dashboard(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() auth: ParticipantAuth) {
    return this.reviewer.dashboard(id, auth);
  }

  @Get(':id/photos/zip')
  async downloadZip(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() auth: ParticipantAuth,
    @Res() res: Response,
  ) {
    const wedding = await this.reviewer.getWeddingForZip(id, auth);
    await this.photosService.writeZip(wedding, res);
  }

  @Get(':id/photos')
  photos(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() auth: ParticipantAuth,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.reviewer.listPhotos(
      id,
      auth,
      page ? Number(page) : 1,
      limit ? Number(limit) : 24,
      categoryId,
    );
  }

  @Get(':id/categories')
  categories(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() auth: ParticipantAuth) {
    return this.reviewer.listCategories(id, auth);
  }

  @Get(':id/rankings')
  rankings(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() auth: ParticipantAuth) {
    return this.reviewer.rankings(id, auth);
  }

  @Get(':id/timeline')
  timeline(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() auth: ParticipantAuth) {
    return this.reviewer.timeline(id, auth);
  }

  @Post(':id/conclude')
  conclude(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() auth: ParticipantAuth) {
    return this.reviewer.conclude(id, auth);
  }
}
