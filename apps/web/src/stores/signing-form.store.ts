'use client';
import { create } from 'zustand';

type State = {
  values: Record<string, string | boolean>;
  setValue(id: string, value: string | boolean): void;
  reset(): void;
};

export const useSigningFormStore = create<State>((set) => ({
  values: {},
  setValue: (id, value) => set((s) => ({ values: { ...s.values, [id]: value } })),
  reset: () => set({ values: {} }),
}));
