import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GuestGuard } from '../auth/guards/guest.guard';
import { SessionGuard } from '../auth/guards/session.guard';
import type { ParticipantAuth } from '../auth/auth.types';
import { ALLOWED_MIME_TYPES, DEFAULT_MAX_FILE_SIZE } from '../common/constants';
import { PhotosService } from './photos.service';

const uploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: DEFAULT_MAX_FILE_SIZE },
  fileFilter: (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype as (typeof ALLOWED_MIME_TYPES)[number])) {
      cb(new BadRequestException('Only JPEG, PNG, and WEBP photos are supported.'), false);
      return;
    }
    cb(null, true);
  },
};

@Controller()
@UseGuards(SessionGuard, GuestGuard)
export class PhotosController {
  constructor(private readonly photos: PhotosService) {}

  @Get('weddings/:slug')
  async getWedding(@Param('slug') slug: string, @CurrentUser() auth: ParticipantAuth) {
    const wedding = await this.photos.getWeddingBySlug(slug);
    this.photos.assertGuestWedding(auth, wedding);
    const state = await this.photos.guestCategoryState(wedding, auth);
    return {
      id: wedding.id,
      name: wedding.name,
      slug: wedding.slug,
      status: wedding.status,
      concludedAt: wedding.concludedAt,
      quickVoteEnabled: wedding.quickVoteEnabled,
      quickVotePhotoCount: wedding.quickVotePhotoCount,
      ...state,
    };
  }

  @Get('weddings/:slug/categories')
  async categories(@Param('slug') slug: string, @CurrentUser() auth: ParticipantAuth) {
    const wedding = await this.photos.getWeddingBySlug(slug);
    this.photos.assertGuestWedding(auth, wedding);
    const state = await this.photos.guestCategoryState(wedding, auth);
    return state.categories;
  }

  @Get('weddings/:slug/photos')
  async list(
    @Param('slug') slug: string,
    @CurrentUser() auth: ParticipantAuth,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('categoryId') categoryId?: string,
    @Query('galleryOnly') galleryOnly?: string,
  ) {
    const wedding = await this.photos.getWeddingBySlug(slug);
    this.photos.assertGuestWedding(auth, wedding);
    return this.photos.listForWedding({
      wedding,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : undefined,
      categoryId: categoryId || undefined,
      galleryOnly: galleryOnly === 'true',
    });
  }

  @Post('weddings/:slug/photos')
  @UseInterceptors(FileInterceptor('file', uploadOptions))
  async uploadOne(
    @Param('slug') slug: string,
    @CurrentUser() auth: ParticipantAuth,
    @UploadedFile() file: Express.Multer.File,
    @Body('categoryId') categoryId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Please select a photo to upload.');
    }
    const wedding = await this.photos.getWeddingBySlug(slug);
    return this.photos.upload({
      wedding,
      auth,
      file,
      categoryId: categoryId || null,
    });
  }

  @Post('weddings/:slug/photos/batch')
  @UseInterceptors(FilesInterceptor('files', 30, uploadOptions))
  async uploadMany(
    @Param('slug') slug: string,
    @CurrentUser() auth: ParticipantAuth,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files?.length) {
      throw new BadRequestException('Please select photos to upload.');
    }
    const wedding = await this.photos.getWeddingBySlug(slug);
    const succeeded: unknown[] = [];
    const failed: { filename: string; message: string }[] = [];
    for (const file of files) {
      try {
        const photo = await this.photos.upload({ wedding, auth, file, categoryId: null });
        succeeded.push(photo);
      } catch (error) {
        failed.push({
          filename: file.originalname,
          message: error instanceof Error ? error.message : 'Upload failed.',
        });
      }
    }
    return { succeeded, failed };
  }
}
