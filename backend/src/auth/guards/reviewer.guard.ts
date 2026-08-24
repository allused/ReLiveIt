import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ParticipantRole } from '../../entities/wedding-participant.entity';
import { AuthContext } from '../auth.types';

@Injectable()
export class ReviewerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const auth = context.switchToHttp().getRequest().auth as AuthContext | undefined;
    if (!auth || auth.kind !== 'participant' || auth.role !== ParticipantRole.REVIEWER) {
      throw new ForbiddenException('Reviewer access required.');
    }
    return true;
  }
}
