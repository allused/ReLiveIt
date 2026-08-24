export type RankablePhoto = {
  id: string;
  createdAt: Date;
  totalPoints: number;
  voteCount: number;
};

export type RankedPhoto<T extends RankablePhoto> = T & {
  approvalRate: number;
  rank: number;
};

export function approvalRate(totalPoints: number, voteCount: number): number {
  if (voteCount === 0) {
    return 0;
  }
  return totalPoints / voteCount;
}

/**
 * Deterministic ranking:
 * 1. Higher total points
 * 2. Higher approval rate
 * 3. Earlier upload timestamp
 * 4. Photo id (stable fallback)
 */
export function compareRankings(a: RankablePhoto, b: RankablePhoto): number {
  if (b.totalPoints !== a.totalPoints) {
    return b.totalPoints - a.totalPoints;
  }
  const aRate = approvalRate(a.totalPoints, a.voteCount);
  const bRate = approvalRate(b.totalPoints, b.voteCount);
  if (bRate !== aRate) {
    return bRate - aRate;
  }
  const timeDiff = a.createdAt.getTime() - b.createdAt.getTime();
  if (timeDiff !== 0) {
    return timeDiff;
  }
  return a.id.localeCompare(b.id);
}

export function rankPhotos<T extends RankablePhoto>(photos: T[]): RankedPhoto<T>[] {
  return [...photos]
    .sort(compareRankings)
    .map((photo, index) => ({
      ...photo,
      approvalRate: approvalRate(photo.totalPoints, photo.voteCount),
      rank: index + 1,
    }));
}

export type QuickVoteCandidate = {
  id: string;
  categoryId: string | null;
  voteCount: number;
};

export function selectQuickVotePhotos(
  candidates: QuickVoteCandidate[],
  sessionSize: number,
): QuickVoteCandidate[] {
  if (candidates.length === 0 || sessionSize <= 0) {
    return [];
  }

  const byVoteCount = new Map<number, QuickVoteCandidate[]>();
  for (const candidate of candidates) {
    const list = byVoteCount.get(candidate.voteCount) ?? [];
    list.push(candidate);
    byVoteCount.set(candidate.voteCount, list);
  }

  const selected: QuickVoteCandidate[] = [];
  const categoryUsage = new Map<string, number>();
  const levels = [...byVoteCount.keys()].sort((a, b) => a - b);

  for (const level of levels) {
    const pool = [...(byVoteCount.get(level) ?? [])];
    while (pool.length > 0 && selected.length < sessionSize) {
      pool.sort((a, b) => {
        const aKey = a.categoryId ?? '__none__';
        const bKey = b.categoryId ?? '__none__';
        const usageDiff = (categoryUsage.get(aKey) ?? 0) - (categoryUsage.get(bKey) ?? 0);
        if (usageDiff !== 0) {
          return usageDiff;
        }
        return a.id.localeCompare(b.id);
      });
      const next = pool.shift();
      if (!next) {
        break;
      }
      selected.push(next);
      const key = next.categoryId ?? '__none__';
      categoryUsage.set(key, (categoryUsage.get(key) ?? 0) + 1);
    }
    if (selected.length >= sessionSize) {
      break;
    }
  }

  return selected;
}
