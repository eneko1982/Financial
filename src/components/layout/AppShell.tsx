"use client";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { AddTransactionSheet } from "./AddTransactionSheet";
import { useUIStore } from "@/store/uiStore";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { addTxOpen, setAddTxOpen } = useUIStore();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto pb-16 lg:pb-0 min-w-0">
        {children}
      </main>
      <BottomNav onAdd={() => setAddTxOpen(true)} />
      <AddTransactionSheet open={addTxOpen} onClose={() => setAddTxOpen(false)} />
    </div>
  );
}
