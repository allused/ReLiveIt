import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { InvitePage } from './pages/InvitePage';
import { WelcomePage } from './pages/WelcomePage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { WeddingManagePage } from './pages/admin/WeddingManagePage';
import { CategoriesPage } from './pages/guest/CategoriesPage';
import { CategoryVotePage } from './pages/guest/CategoryVotePage';
import { GuestGalleryPage } from './pages/guest/GalleryPage';
import { GuestHome, GuestLayout } from './pages/guest/GuestHome';
import { QuickVotePage } from './pages/guest/QuickVotePage';
import { UploadPage } from './pages/guest/UploadPage';
import { RankingsPage } from './pages/reviewer/RankingsPage';
import { ReviewerCategories } from './pages/reviewer/ReviewerCategories';
import { ReviewerGallery } from './pages/reviewer/ReviewerGallery';
import { ReviewerHome } from './pages/reviewer/ReviewerHome';
import { TimelinePage } from './pages/reviewer/TimelinePage';

function AdminGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (user?.kind !== 'admin') return <Navigate to="/login" replace />;
  return children;
}

function GuestGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (user?.kind !== 'participant' || user.role !== 'GUEST') return <Navigate to="/login" replace />;
  if (!user.claimed) return <Navigate to="/welcome" replace />;
  return children;
}

function ReviewerGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (user?.kind !== 'participant' || user.role !== 'REVIEWER') return <Navigate to="/login" replace />;
  return children;
}

function Splash() {
  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Typography variant="h1">ReLiveIt</Typography>
    </Box>
  );
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (user?.kind === 'admin') return <Navigate to="/admin" replace />;
  if (user?.kind === 'participant' && user.role === 'GUEST') {
    if (!user.claimed) return <Navigate to="/welcome" replace />;
    return <Navigate to={`/wedding/${user.weddingSlug}`} replace />;
  }
  if (user?.kind === 'participant' && user.role === 'REVIEWER') {
    return <Navigate to={`/reviewer/${user.weddingId}`} replace />;
  }
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/invite/:token" element={<InvitePage />} />
      <Route path="/welcome" element={<WelcomePage />} />
      <Route
        path="/admin"
        element={
          <AdminGate>
            <AdminDashboard />
          </AdminGate>
        }
      />
      <Route
        path="/admin/weddings/:id"
        element={
          <AdminGate>
            <WeddingManagePage />
          </AdminGate>
        }
      />
      <Route
        path="/wedding/:slug"
        element={
          <GuestGate>
            <GuestLayout />
          </GuestGate>
        }
      >
        <Route index element={<GuestHome />} />
        <Route path="upload" element={<UploadPage />} />
        <Route path="gallery" element={<GuestGalleryPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="categories/:categoryId" element={<CategoryVotePage />} />
        <Route path="categories/:categoryId/vote" element={<CategoryVotePage />} />
        <Route path="quick-vote" element={<QuickVotePage />} />
      </Route>
      <Route
        path="/reviewer/:weddingId"
        element={
          <ReviewerGate>
            <ReviewerHome />
          </ReviewerGate>
        }
      />
      <Route
        path="/reviewer/:weddingId/gallery"
        element={
          <ReviewerGate>
            <ReviewerGallery />
          </ReviewerGate>
        }
      />
      <Route
        path="/reviewer/:weddingId/categories"
        element={
          <ReviewerGate>
            <ReviewerCategories />
          </ReviewerGate>
        }
      />
      <Route
        path="/reviewer/:weddingId/categories/:categoryId"
        element={
          <ReviewerGate>
            <ReviewerCategories />
          </ReviewerGate>
        }
      />
      <Route
        path="/reviewer/:weddingId/rankings"
        element={
          <ReviewerGate>
            <RankingsPage />
          </ReviewerGate>
        }
      />
      <Route
        path="/reviewer/:weddingId/timeline"
        element={
          <ReviewerGate>
            <TimelinePage />
          </ReviewerGate>
        }
      />
    </Routes>
  );
}
