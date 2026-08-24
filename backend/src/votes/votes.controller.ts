import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GuestGuard } from '../auth/guards/guest.guard';
import { SessionGuard } from '../auth/guards/session.guard';
import type { ParticipantAuth } from '../auth/auth.types';
import { CreateVoteDto } from './dto/create-vote.dto';
import { VotesService } from './votes.service';

@Controller()
@UseGuards(SessionGuard, GuestGuard)
export class VotesController {
  constructor(private readonly votes: VotesService) {}

  @Get('weddings/:slug/categories/:categoryId/vote-queue')
  categoryQueue(
    @Param('slug') slug: string,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @CurrentUser() auth: ParticipantAuth,
  ) {
    return this.votes.categoryQueue(slug, categoryId, auth);
  }

  @Get('weddings/:slug/quick-vote')
  quickVote(@Param('slug') slug: string, @CurrentUser() auth: ParticipantAuth) {
    return this.votes.quickVoteQueue(slug, auth);
  }

  @Post('photos/:id/vote')
  vote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateVoteDto,
    @CurrentUser() auth: ParticipantAuth,
  ) {
    return this.votes.vote(id, dto.value, auth);
  }
}
