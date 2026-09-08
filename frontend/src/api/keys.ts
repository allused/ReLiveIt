export const queryKeys = {
  auth: {
    me: () => ['auth', 'me'] as const,
  },
  invite: (token: string) => ['invite', token] as const,
  admin: {
    weddings: () => ['admin', 'weddings'] as const,
    wedding: (id: string) => ['admin', 'weddings', id] as const,
    categories: (id: string) => ['admin', 'weddings', id, 'categories'] as const,
    participants: (id: string) => ['admin', 'weddings', id, 'participants'] as const,
    timelineEvents: (id: string) => ['admin', 'weddings', id, 'timeline-events'] as const,
  },
  guest: {
    all: () => ['guest'] as const,
    wedding: (slug: string) => ['guest', 'wedding', slug] as const,
    photosRoot: (slug: string) => ['guest', 'photos', slug] as const,
    photos: (slug: string, params: Record<string, unknown> = {}) =>
      ['guest', 'photos', slug, params] as const,
    quickVote: (slug: string) => ['guest', 'quickVote', slug] as const,
    voteQueue: (slug: string, categoryId: string) =>
      ['guest', 'voteQueue', slug, categoryId] as const,
  },
  reviewer: {
    dashboard: (id: string) => ['reviewer', 'dashboard', id] as const,
    photos: (id: string, params: Record<string, unknown> = {}) =>
      ['reviewer', 'photos', id, params] as const,
    categories: (id: string) => ['reviewer', 'categories', id] as const,
    rankings: (id: string) => ['reviewer', 'rankings', id] as const,
    timeline: (id: string) => ['reviewer', 'timeline', id] as const,
  },
};
