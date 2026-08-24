import { compareRankings, rankPhotos, selectQuickVotePhotos } from './rankings.util';

describe('ranking calculation', () => {
  const photo = (id: string, points: number, votes: number, createdAt: string) => ({
    id,
    totalPoints: points,
    voteCount: votes,
    createdAt: new Date(createdAt),
  });

  it('ranks by total points, then approval rate, then earlier upload', () => {
    const ranked = rankPhotos([
      photo('c', 10, 20, '2026-06-01T18:00:00Z'),
      photo('a', 12, 20, '2026-06-01T19:00:00Z'),
      photo('b', 10, 12, '2026-06-01T20:00:00Z'),
      photo('d', 10, 20, '2026-06-01T17:00:00Z'),
    ]);

    expect(ranked.map((p) => p.id)).toEqual(['a', 'b', 'd', 'c']);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[0].approvalRate).toBe(0.6);
    expect(ranked[1].approvalRate).toBeCloseTo(10 / 12);
  });

  it('treats zero-vote photos as approval rate 0', () => {
    const ranked = rankPhotos([photo('z', 0, 0, '2026-06-01T10:00:00Z')]);
    expect(ranked[0].approvalRate).toBe(0);
  });

  it('uses a deterministic fallback for identical scores', () => {
    const a = photo('aaa', 5, 10, '2026-06-01T12:00:00Z');
    const b = photo('bbb', 5, 10, '2026-06-01T12:00:00Z');
    expect(compareRankings(a, b)).toBeLessThan(0);
  });

  it('limits top N after ranking', () => {
    const ranked = rankPhotos([
      photo('1', 9, 10, '2026-06-01T10:00:00Z'),
      photo('2', 3, 10, '2026-06-01T10:00:00Z'),
      photo('3', 8, 10, '2026-06-01T10:00:00Z'),
    ]);
    expect(ranked.slice(0, 2).map((p) => p.id)).toEqual(['1', '3']);
  });
});

describe('quick vote selection', () => {
  it('prioritizes zero-vote photos, then lowest vote counts', () => {
    const selected = selectQuickVotePhotos(
      [
        { id: 'hot', categoryId: 'a', voteCount: 8 },
        { id: 'zero-1', categoryId: 'a', voteCount: 0 },
        { id: 'low', categoryId: 'b', voteCount: 1 },
        { id: 'zero-2', categoryId: 'b', voteCount: 0 },
      ],
      3,
    );
    expect(selected.map((p) => p.id)).toEqual(['zero-1', 'zero-2', 'low']);
  });

  it('respects the configured session size and returns fewer when needed', () => {
    const selected = selectQuickVotePhotos(
      [
        { id: 'a', categoryId: 'x', voteCount: 0 },
        { id: 'b', categoryId: 'y', voteCount: 0 },
      ],
      20,
    );
    expect(selected).toHaveLength(2);
  });

  it('spreads categories within the same vote-count level', () => {
    const selected = selectQuickVotePhotos(
      [
        { id: 'c1-1', categoryId: 'c1', voteCount: 0 },
        { id: 'c1-2', categoryId: 'c1', voteCount: 0 },
        { id: 'c2-1', categoryId: 'c2', voteCount: 0 },
      ],
      2,
    );
    const categories = new Set(selected.map((p) => p.categoryId));
    expect(categories.size).toBe(2);
  });
});
