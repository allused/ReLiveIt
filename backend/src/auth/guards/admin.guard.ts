import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthContext } from '../auth.types';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const auth = context.switchToHttp().getRequest().auth as AuthContext | undefined;
    if (!auth || auth.kind !== 'admin') {
      throw new ForbiddenException('Admin access required.');
    }
    return true;
  }
}
