'use client';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../api/client';
import {
  authSessionKey,
  type AuthResponse,
  type SessionOrganization,
  type SessionUser,
  useLogoutMutation,
} from '../../features/auth/use-auth-mutations';
import { useAuthStore } from '../../stores/auth.store';

type AuthContextValue = {
  accessToken: string | null;
  user: SessionUser | null;
  organizations: SessionOrganization[];
  activeOrganizationId: string | null;
  isRestoring: boolean;
  signOut(): Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signIn(...args: any): Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register(...args: any): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublicSigningRoute = pathname.startsWith('/sign/');

  const session = useQuery({
    queryKey: authSessionKey,
    queryFn: () =>
      apiRequest<AuthResponse>('/v1/auth/refresh', { method: 'POST' }).then((r) => r.data),
    enabled: !isPublicSigningRoute,
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const activeOrganizationId = useAuthStore((s) => s.activeOrganizationId);
  const setActiveOrganizationId = useAuthStore((s) => s.setActiveOrganizationId);
  const logout = useLogoutMutation();
  const data = session.data;

  useEffect(() => {
    if (!activeOrganizationId && data?.organizations[0])
      setActiveOrganizationId(data.organizations[0].organization.id);
  }, [activeOrganizationId, data?.organizations, setActiveOrganizationId]);

  const value = useMemo(
    () => ({
      accessToken: data?.accessToken ?? null,
      user: data?.user ?? null,
      organizations: data?.organizations ?? [],
      activeOrganizationId,
      isRestoring: session.isLoading,
      signOut: async () => {
        await logout.mutateAsync();
        setActiveOrganizationId(null);
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
      signIn: async (...args: any) => {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
      register: async (...args: any) => {},
    }),
    [data, activeOrganizationId, session.isLoading, logout, setActiveOrganizationId],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
