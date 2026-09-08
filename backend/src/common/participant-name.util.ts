import { ParticipantRole, WeddingParticipant } from '../entities/wedding-participant.entity';

export function participantIsClaimed(person: Pick<WeddingParticipant, 'role' | 'claimedAt'>): boolean {
  return person.role === ParticipantRole.REVIEWER || Boolean(person.claimedAt);
}

export function participantDisplayName(
  person: Pick<WeddingParticipant, 'primaryName' | 'secondaryName' | 'role' | 'claimedAt'>,
): string {
  if (!participantIsClaimed(person) || !person.primaryName) {
    return 'Waiting for name';
  }
  return person.secondaryName ? `${person.primaryName} & ${person.secondaryName}` : person.primaryName;
}
