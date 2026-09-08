import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthContext } from '../auth.types';

@Injectable()
export class ClaimedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const auth = context.switchToHttp().getRequest().auth as AuthContext | undefined;
    if (!auth || auth.kind !== 'participant' || !auth.claimed) {
      throw new ForbiddenException('Add your name before using this invitation.');
    }
    return true;
  }
}
