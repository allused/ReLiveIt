import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { COOKIE_NAME } from '../common/constants';
import { ParticipantRole } from '../entities/wedding-participant.entity';
import { AuthService } from './auth.service';
import { clearSessionCookie, setSessionCookie } from './cookie';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { ClaimNameDto } from './dto/claim-name.dto';
import { GuestGuard } from './guards/guest.guard';
import { SessionGuard } from './guards/session.guard';
import type { AuthContext } from './auth.types';
import { SessionService } from './session.service';

@Controller()
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
    private readonly config: ConfigService,
  ) {}

  @Post('auth/login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = await this.auth.loginAdmin(dto.username, dto.password);
    setSessionCookie(res, token, this.config);
    return { ok: true };
  }

  @Post('auth/logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[COOKIE_NAME];
    if (token) {
      await this.sessions.revokeByToken(token);
    }
    clearSessionCookie(res, this.config);
    return { ok: true };
  }

  @Get('auth/me')
  @UseGuards(SessionGuard)
  me(@CurrentUser() auth: AuthContext) {
    return this.auth.serialize(auth);
  }

  @Get('invite/:token')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Header('Cache-Control', 'no-store')
  @Header('Referrer-Policy', 'no-referrer')
  async exchangeInvite(
    @Param('token') token: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!token || token.length < 16) {
      throw new UnauthorizedException(
        'This invitation link is invalid, expired, or has been replaced. Please ask the wedding organizer for a new QR code.',
      );
    }
    const { sessionToken, participant, needsName } = await this.auth.exchangeInvitation(token);
    setSessionCookie(res, sessionToken, this.config);
    const redirectTo = needsName
      ? '/welcome'
      : participant.role === ParticipantRole.REVIEWER
        ? `/reviewer/${participant.weddingId}`
        : `/wedding/${participant.wedding.slug}`;
    return {
      ok: true,
      role: participant.role,
      weddingId: participant.weddingId,
      weddingSlug: participant.wedding.slug,
      needsName,
      redirectTo,
    };
  }

  @Post('auth/claim-name')
  @HttpCode(200)
  @UseGuards(SessionGuard, GuestGuard)
  claimName(@CurrentUser() auth: AuthContext, @Body() dto: ClaimNameDto) {
    return this.auth.claimName(auth, dto);
  }
}
