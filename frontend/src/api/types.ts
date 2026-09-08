export type AdminUser = {
  kind: 'admin';
  username: string;
};

export type ParticipantUser = {
  kind: 'participant';
  role: 'GUEST' | 'REVIEWER';
  participantId: string;
  weddingId: string;
  weddingSlug: string;
  weddingName: string;
  primaryName: string | null;
  secondaryName: string | null;
  displayName: string;
  claimed: boolean;
};

export type AuthUser = AdminUser | ParticipantUser;

export type WeddingSummary = {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'CONCLUDED';
  quickVoteEnabled: boolean;
  quickVotePhotoCount: number;
  createdAt: string;
  updatedAt: string;
  concludedAt: string | null;
  categoryCount?: number;
  photoCount?: number;
  hasCoverPhoto?: boolean;
};

export type Category = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  myPhoto?: Photo | null;
  previewPhoto?: Photo | null;
};

export type Photo = {
  id: string;
  weddingId: string;
  categoryId: string | null;
  uploaderParticipantId: string;
  originalFilename: string;
  createdAt: string;
};

export type Participant = {
  id: string;
  role: 'GUEST' | 'REVIEWER';
  primaryName: string | null;
  secondaryName: string | null;
  displayName: string;
  claimed: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  lastAccessedAt: string | null;
  invitationStatus: 'ACTIVE' | 'REVOKED';
};

export type GuestWedding = WeddingSummary & {
  categories: Category[];
  galleryCount: number;
  maxGalleryPhotos: number;
};

export type PagedPhotos = {
  items: Photo[];
  total: number;
  page: number;
  limit: number;
};

export type TimelineEvent = {
  id: string;
  weddingId: string;
  title: string;
  occursAt: string;
  createdAt: string;
  updatedAt: string;
};

export type TimelineItem =
  | { type: 'event'; event: TimelineEvent }
  | { type: 'photos'; label: string; photos: Photo[] };

export type RankingItem = {
  id: string;
  rank: number;
  totalPoints: number;
  voteCount: number;
  approvalRate: number;
  photo: Photo | null;
  category?: Category | null;
};

export type RankingRow = {
  category: Category;
  top: RankingItem[];
  all: RankingItem[];
};

export type RankingsResponse = {
  overall: RankingItem[];
  categories: RankingRow[];
};
