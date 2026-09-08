import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../api/keys';
import { useAuthMe, useLogout } from '../api/hooks';
import type { AuthUser } from '../api/types';

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const meQuery = useAuthMe();
  const { mutateAsync: logoutAsync } = useLogout();

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
  }, [queryClient]);

  const logout = useCallback(async () => {
    await logoutAsync();
  }, [logoutAsync]);

  const value = useMemo(
    () => ({
      user: meQuery.data ?? null,
      loading: meQuery.isPending,
      refresh,
      logout,
    }),
    [logout, meQuery.data, meQuery.isPending, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
