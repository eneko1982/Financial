import { create } from "zustand";

interface UIStore {
  selectedMonth: string; // "YYYY-MM"
  setSelectedMonth: (v: string) => void;
  addTxOpen: boolean;
  setAddTxOpen: (v: boolean) => void;
}

const nowISO = new Date().toISOString().slice(0, 7);

export const useUIStore = create<UIStore>((set) => ({
  selectedMonth: nowISO,
  setSelectedMonth: (v) => set({ selectedMonth: v }),
  addTxOpen: false,
  setAddTxOpen: (v) => set({ addTxOpen: v }),
}));
