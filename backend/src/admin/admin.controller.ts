import {
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
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import * as QRCode from 'qrcode';
import { AdminGuard } from '../auth/guards/admin.guard';
import { SessionGuard } from '../auth/guards/session.guard';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { CreateWeddingDto } from './dto/create-wedding.dto';
import { ReorderCategoriesDto } from './dto/reorder-categories.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { UpdateWeddingDto } from './dto/update-wedding.dto';
import { InvitationsService } from './invitations.service';
import { ParticipantsService } from './participants.service';
import { WeddingsService } from './weddings.service';

@Controller('admin')
@UseGuards(SessionGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly weddings: WeddingsService,
    private readonly categories: CategoriesService,
    private readonly participants: ParticipantsService,
    private readonly invitations: InvitationsService,
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
