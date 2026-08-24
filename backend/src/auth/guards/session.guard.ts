import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { COOKIE_NAME } from '../../common/constants';
import { AuthService } from '../auth.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.[COOKIE_NAME];
    if (!token) {
      throw new UnauthorizedException('Authentication required.');
    }
    const auth = await this.auth.resolveSession(token);
    if (!auth) {
      throw new UnauthorizedException('Authentication required.');
    }
    request.auth = auth;
    return true;
  }
}
