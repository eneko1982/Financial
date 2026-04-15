import { create } from "zustand";

export interface EditTxData {
  id: string;
  amount: number;
  description: string;
  date: string; // ISO string
  accountId: string;
  category: string | null;
  subcategory: string | null;
  notes: string | null;
  isTransfer: boolean;
}

interface UIStore {
  selectedMonth: string; // "YYYY-MM"
  setSelectedMonth: (v: string) => void;
  addTxOpen: boolean;
  setAddTxOpen: (v: boolean) => void;
  editTx: EditTxData | null;
  setEditTx: (tx: EditTxData | null) => void;
}

const nowISO = new Date().toISOString().slice(0, 7);

export const useUIStore = create<UIStore>((set) => ({
  selectedMonth: nowISO,
  setSelectedMonth: (v) => set({ selectedMonth: v }),
  addTxOpen: false,
  setAddTxOpen: (v) => set({ addTxOpen: v }),
  editTx: null,
  setEditTx: (tx) => set({ editTx: tx }),
}));
