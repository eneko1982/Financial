import { create } from "zustand";

interface UIStore {
  importOpen: boolean;
  setImportOpen: (v: boolean) => void;
  selectedMonth: string; // "YYYY-MM"
  setSelectedMonth: (v: string) => void;
  addTxOpen: boolean;
  setAddTxOpen: (v: boolean) => void;
}

const nowISO = new Date().toISOString().slice(0, 7);

export const useUIStore = create<UIStore>((set) => ({
  importOpen: false,
  setImportOpen: (v) => set({ importOpen: v }),
  selectedMonth: nowISO,
  setSelectedMonth: (v) => set({ selectedMonth: v }),
  addTxOpen: false,
  setAddTxOpen: (v) => set({ addTxOpen: v }),
}));
