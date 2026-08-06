'use client';
import { create } from 'zustand';
type Notification = { id: string; title: string; message?: string; kind: 'error' | 'success' };
type State = {
  items: Notification[];
  push(input: Omit<Notification, 'id'>): void;
  remove(id: string): void;
};

export const useNotificationStore = create<State>((set) => ({
  items: [],
  push: (input) =>
    set((s) => ({ items: [...s.items, { ...input, id: crypto.randomUUID() }].slice(-4) })),
  remove: (id) => set((s) => ({ items: s.items.filter((item) => item.id !== id) })),
}));
