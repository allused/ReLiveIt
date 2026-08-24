import { ParticipantRole } from '../entities/wedding-participant.entity';

export type AdminAuth = {
  kind: 'admin';
  adminId: string;
  username: string;
};

export type ParticipantAuth = {
  kind: 'participant';
  participantId: string;
  weddingId: string;
  role: ParticipantRole;
  primaryName: string;
  secondaryName: string | null;
  displayName: string;
  weddingSlug: string;
  weddingName: string;
};

export type AuthContext = AdminAuth | ParticipantAuth;
