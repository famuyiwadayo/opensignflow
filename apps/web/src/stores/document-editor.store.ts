'use client';
import { create } from 'zustand';

type EditorState = {
  selectedRecipientId: string | null;
  selectedFieldIds: string[];
  currentPage: number;
  zoom: number;
  uploadProgress: number;
  setSelectedRecipient(id: string | null): void;
  setSelectedFields(ids: string[]): void;
  setPage(page: number): void;
  setZoom(zoom: number): void;
  setUploadProgress(percent: number): void;
  reset(): void;
};

export const useDocumentEditorStore = create<EditorState>((set) => ({
  selectedRecipientId: null,
  selectedFieldIds: [],
  currentPage: 1,
  zoom: 1,
  uploadProgress: 0,
  setSelectedRecipient: (selectedRecipientId) => set({ selectedRecipientId }),
  setSelectedFields: (selectedFieldIds) => set({ selectedFieldIds }),
  setPage: (currentPage) => set({ currentPage }),
  setZoom: (zoom) => set({ zoom }),
  setUploadProgress: (uploadProgress) => set({ uploadProgress }),
  reset: () =>
    set({
      selectedRecipientId: null,
      selectedFieldIds: [],
      currentPage: 1,
      zoom: 1,
      uploadProgress: 0,
    }),
}));
