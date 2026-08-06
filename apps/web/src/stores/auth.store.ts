'use client';
import { create } from 'zustand';

type AuthUiState = {
  activeOrganizationId: string | null;
  setActiveOrganizationId(id: string | null): void;
};

export const useAuthStore = create<AuthUiState>((set) => ({
  activeOrganizationId: null,
  setActiveOrganizationId: (activeOrganizationId) => set({ activeOrganizationId }),
}));
