import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import * as QRCode from 'qrcode';
import { AdminGuard } from '../auth/guards/admin.guard';
import { SessionGuard } from '../auth/guards/session.guard';
import { DEFAULT_MAX_FILE_SIZE } from '../common/constants';
import { imageFileFilter } from '../common/image-upload.util';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { CreateWeddingDto } from './dto/create-wedding.dto';
import { ReorderCategoriesDto } from './dto/reorder-categories.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateTimelineEventDto } from './dto/create-timeline-event.dto';
import { UpdateTimelineEventDto } from './dto/update-timeline-event.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { UpdateWeddingDto } from './dto/update-wedding.dto';
import { InvitationsService } from './invitations.service';
import { ParticipantsService } from './participants.service';
import { TimelineEventsService } from './timeline-events.service';
import { WeddingsService } from './weddings.service';

const coverUploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: DEFAULT_MAX_FILE_SIZE },
  fileFilter: imageFileFilter,
};

@Controller('admin')
@UseGuards(SessionGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly weddings: WeddingsService,
    private readonly categories: CategoriesService,
    private readonly participants: ParticipantsService,
    private readonly invitations: InvitationsService,
    private readonly timelineEvents: TimelineEventsService,
  ) {}

  @Get('weddings')
  listWeddings() {
    return this.weddings.list();
  }

  @Post('weddings')
  createWedding(@Body() dto: CreateWeddingDto) {
    return this.weddings.create(dto);
  }

  @Get('weddings/:id')
  getWedding(@Param('id', ParseUUIDPipe) id: string) {
    return this.weddings.get(id);
  }

  @Patch('weddings/:id')
  updateWedding(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateWeddingDto) {
    return this.weddings.update(id, dto);
  }

  @Post('weddings/:id/cover')
  @UseInterceptors(FileInterceptor('file', coverUploadOptions))
  uploadCover(@Param('id', ParseUUIDPipe) id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Please select a photo to upload.');
    }
    return this.weddings.uploadCover(id, file);
  }

  @Delete('weddings/:id/cover')
  @HttpCode(204)
  async removeCover(@Param('id', ParseUUIDPipe) id: string) {
    await this.weddings.removeCover(id);
  }

  @Get('weddings/:id/categories')
  listCategories(@Param('id', ParseUUIDPipe) id: string) {
    return this.categories.list(id);
  }

  @Post('weddings/:id/categories')
  createCategory(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateCategoryDto) {
    return this.categories.create(id, dto);
  }

  @Patch('weddings/:id/categories/reorder')
  reorderCategories(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReorderCategoriesDto) {
    return this.categories.reorder(id, dto);
  }

  @Patch('categories/:id')
  updateCategory(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCategoryDto) {
    return this.categories.update(id, dto);
  }

  @Delete('categories/:id')
  removeCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.categories.remove(id);
  }

  @Get('weddings/:id/timeline-events')
  listTimelineEvents(@Param('id', ParseUUIDPipe) id: string) {
    return this.timelineEvents.list(id);
  }

  @Post('weddings/:id/timeline-events')
  createTimelineEvent(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateTimelineEventDto) {
    return this.timelineEvents.create(id, dto);
  }

  @Patch('timeline-events/:id')
  updateTimelineEvent(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTimelineEventDto) {
    return this.timelineEvents.update(id, dto);
  }

  @Delete('timeline-events/:id')
  @HttpCode(204)
  async removeTimelineEvent(@Param('id', ParseUUIDPipe) id: string) {
    await this.timelineEvents.remove(id);
  }

  @Get('weddings/:id/participants')
  listParticipants(@Param('id', ParseUUIDPipe) id: string) {
    return this.participants.list(id);
  }

  @Post('weddings/:id/participants')
  createParticipant(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateParticipantDto) {
    return this.participants.create(id, dto);
  }

  @Patch('participants/:participantId')
  updateParticipant(
    @Param('participantId', ParseUUIDPipe) participantId: string,
    @Body() dto: UpdateParticipantDto,
  ) {
    return this.participants.update(participantId, dto);
  }

  @Post('participants/:participantId/invitation')
  createInvitation(@Param('participantId', ParseUUIDPipe) participantId: string) {
    return this.invitations.createForParticipant(participantId).then(({ invitation, url }) => ({
      id: invitation.id,
      createdAt: invitation.createdAt,
      url,
    }));
  }

  @Post('participants/:participantId/invitation/regenerate')
  regenerateInvitation(@Param('participantId', ParseUUIDPipe) participantId: string) {
    return this.invitations.regenerate(participantId).then(({ invitation, url }) => ({
      id: invitation.id,
      createdAt: invitation.createdAt,
      url,
    }));
  }

  @Post('participants/:participantId/invitation/revoke')
  @HttpCode(200)
  revokeInvitation(@Param('participantId', ParseUUIDPipe) participantId: string) {
    return this.invitations.revoke(participantId);
  }

  @Get('participants/:participantId/invitation')
  getInvitation(@Param('participantId', ParseUUIDPipe) participantId: string) {
    return this.invitations.getActive(participantId);
  }

  @Get('weddings/:id/invitations/qr.zip')
  async invitationQrZip(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    await this.invitations.writeQrZip(id, res);
  }

  @Get('participants/:participantId/invitation/qr')
  @Header('Content-Type', 'image/png')
  @Header('Cache-Control', 'no-store')
  async invitationQr(
    @Param('participantId', ParseUUIDPipe) participantId: string,
    @Res() res: Response,
  ) {
    const { url } = await this.invitations.getActive(participantId);
    const png = await QRCode.toBuffer(url, { type: 'png', width: 512, margin: 2 });
    res.setHeader('Content-Disposition', 'inline; filename="invitation-qr.png"');
    res.send(png);
  }
}
