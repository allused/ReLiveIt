import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from './client';
import { queryKeys } from './keys';
import type {
  AuthUser,
  Category,
  GuestWedding,
  Participant,
  PagedPhotos,
  Photo,
  RankingsResponse,
  TimelineEvent,
  TimelineItem,
  WeddingSummary,
} from './types';

export type ReviewerDashboard = {
  id: string;
  name: string;
  status: 'ACTIVE' | 'CONCLUDED';
  photoCount: number;
  categoryCount: number;
  guestCount: number;
};

async function fetchMe(): Promise<AuthUser | null> {
  try {
    return await api<AuthUser>('/auth/me');
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return null;
    }
    throw error;
  }
}

export function useAuthMe() {
  return useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: fetchMe,
    retry: false,
    staleTime: 60_000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { username: string; password: string }) =>
      api('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() }),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.auth.me(), null);
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth' });
    },
  });
}

export function useInvite(token: string | undefined) {
  return useQuery({
    queryKey: queryKeys.invite(token ?? ''),
    queryFn: () =>
      api<{ redirectTo: string; needsName: boolean }>(`/invite/${token}`),
    enabled: Boolean(token),
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
  });
}

export function useClaimName() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { primaryName: string; secondaryName?: string | null }) =>
      api<AuthUser>('/auth/claim-name', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.auth.me(), user);
    },
  });
}

export function useAdminWeddings() {
  return useQuery({
    queryKey: queryKeys.admin.weddings(),
    queryFn: () => api<WeddingSummary[]>('/admin/weddings'),
  });
}

export function useCreateWedding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; quickVoteEnabled: boolean; quickVotePhotoCount: number }) =>
      api('/admin/weddings', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.weddings() }),
  });
}

export function useAdminWedding(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.admin.wedding(id ?? ''),
    queryFn: () => api<WeddingSummary>(`/admin/weddings/${id}`),
    enabled: Boolean(id),
  });
}

export function useAdminCategories(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.admin.categories(id ?? ''),
    queryFn: () => api<Category[]>(`/admin/weddings/${id}/categories`),
    enabled: Boolean(id),
  });
}

export function useAdminParticipants(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.admin.participants(id ?? ''),
    queryFn: () => api<Participant[]>(`/admin/weddings/${id}/participants`),
    enabled: Boolean(id),
  });
}

export function useAdminTimelineEvents(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.admin.timelineEvents(id ?? ''),
    queryFn: () => api<TimelineEvent[]>(`/admin/weddings/${id}/timeline-events`),
    enabled: Boolean(id),
  });
}

export function invalidateAdminWedding(queryClient: ReturnType<typeof useQueryClient>, id: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.wedding(id) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.categories(id) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.participants(id) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.timelineEvents(id) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.reviewer.timeline(id) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.weddings() }),
  ]);
}

export function useGuestWedding(slug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.guest.wedding(slug ?? ''),
    queryFn: () => api<GuestWedding>(`/weddings/${slug}`),
    enabled: Boolean(slug),
  });
}

export function useGuestPhotos(slug: string | undefined, params: { categoryId?: string; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.guest.photos(slug ?? '', params),
    queryFn: () => {
      const search = new URLSearchParams();
      if (params.categoryId) search.set('categoryId', params.categoryId);
      if (params.limit) search.set('limit', String(params.limit));
      const suffix = search.toString();
      return api<PagedPhotos>(`/weddings/${slug}/photos${suffix ? `?${suffix}` : ''}`);
    },
    enabled: Boolean(slug && params.categoryId),
  });
}

export function useGuestGallery(slug: string | undefined) {
  return useInfiniteQuery({
    queryKey: queryKeys.guest.photos(slug ?? '', { pageSize: 24 }),
    queryFn: ({ pageParam }) =>
      api<PagedPhotos>(`/weddings/${slug}/photos?page=${pageParam}&limit=24`),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((count, page) => count + page.items.length, 0);
      return loaded < lastPage.total ? pages.length + 1 : undefined;
    },
    enabled: Boolean(slug),
  });
}

export function useQuickVote(slug: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.guest.quickVote(slug ?? ''),
    queryFn: () =>
      api<{ photos: Photo[]; requested: number; total: number }>(`/weddings/${slug}/quick-vote`),
    enabled: Boolean(slug) && enabled,
    retry: false,
    staleTime: 0,
  });
}

export function useVoteQueue(slug: string | undefined, categoryId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.guest.voteQueue(slug ?? '', categoryId ?? ''),
    queryFn: () =>
      api<{ photos: Photo[] }>(`/weddings/${slug}/categories/${categoryId}/vote-queue`),
    enabled: Boolean(slug && categoryId) && enabled,
    staleTime: 0,
  });
}

export function useUploadPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, form }: { slug: string; form: FormData }) =>
      api(`/weddings/${slug}/photos`, { method: 'POST', body: form }),
    onSuccess: (_data, { slug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.guest.wedding(slug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.guest.photosRoot(slug) });
    },
  });
}

export function useDeleteCategoryPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, photoId }: { slug: string; photoId: string }) =>
      api(`/weddings/${slug}/photos/${photoId}`, { method: 'DELETE' }),
    onSuccess: (_data, { slug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.guest.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.guest.wedding(slug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.guest.photosRoot(slug) });
    },
  });
}

export function useUploadGalleryBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, form }: { slug: string; form: FormData }) =>
      api<{ failed: { filename: string; message: string }[] }>(`/weddings/${slug}/photos/batch`, {
        method: 'POST',
        body: form,
      }),
    onSuccess: (_data, { slug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.guest.wedding(slug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.guest.photosRoot(slug) });
    },
  });
}

export function useCastVote() {
  return useMutation({
    mutationFn: ({ photoId, value }: { photoId: string; value: 0 | 1 }) =>
      api(`/photos/${photoId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ value }),
      }),
  });
}

export function useReviewerDashboard(weddingId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.reviewer.dashboard(weddingId ?? ''),
    queryFn: () => api<ReviewerDashboard>(`/reviewer/weddings/${weddingId}`),
    enabled: Boolean(weddingId),
  });
}

export function useConcludeWedding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (weddingId: string) =>
      api(`/reviewer/weddings/${weddingId}/conclude`, { method: 'POST' }),
    onSuccess: (_data, weddingId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reviewer.dashboard(weddingId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.guest.all() });
    },
  });
}

export function useReviewerGallery(weddingId: string | undefined) {
  return useInfiniteQuery({
    queryKey: queryKeys.reviewer.photos(weddingId ?? '', { pageSize: 'default' }),
    queryFn: ({ pageParam }) =>
      api<PagedPhotos>(`/reviewer/weddings/${weddingId}/photos?page=${pageParam}`),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((count, page) => count + page.items.length, 0);
      return loaded < lastPage.total ? pages.length + 1 : undefined;
    },
    enabled: Boolean(weddingId),
  });
}

export function useReviewerCategories(weddingId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.reviewer.categories(weddingId ?? ''),
    queryFn: () => api<Category[]>(`/reviewer/weddings/${weddingId}/categories`),
    enabled: Boolean(weddingId),
  });
}

export function useReviewerCategoryPhotos(weddingId: string | undefined, categoryId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.reviewer.photos(weddingId ?? '', { categoryId, limit: 60 }),
    queryFn: () =>
      api<PagedPhotos>(
        `/reviewer/weddings/${weddingId}/photos?categoryId=${categoryId}&limit=60`,
      ),
    enabled: Boolean(weddingId && categoryId),
  });
}

export function useRankings(weddingId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.reviewer.rankings(weddingId ?? ''),
    queryFn: () => api<RankingsResponse>(`/reviewer/weddings/${weddingId}/rankings`),
    enabled: Boolean(weddingId),
  });
}

export function useTimeline(weddingId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.reviewer.timeline(weddingId ?? ''),
    queryFn: () => api<{ items: TimelineItem[] }>(`/reviewer/weddings/${weddingId}/timeline`),
    enabled: Boolean(weddingId),
  });
}
