"use client";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { AddTransactionSheet } from "./AddTransactionSheet";
import { ImportWizard } from "@/components/import/ImportWizard";
import { useUIStore } from "@/store/uiStore";
import { useAccounts } from "@/hooks/useAccounts";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { importOpen, setImportOpen, addTxOpen, setAddTxOpen } = useUIStore();
  const { data: accounts = [] } = useAccounts();

  return (
    <div className="flex min-h-screen">
      <Sidebar onImport={() => setImportOpen(true)} />
      <main className="flex-1 overflow-auto pb-16 lg:pb-0 min-w-0">
        {children}
      </main>
      <BottomNav onAdd={() => setAddTxOpen(true)} />
      <AddTransactionSheet open={addTxOpen} onClose={() => setAddTxOpen(false)} />
      <ImportWizard open={importOpen} onClose={() => setImportOpen(false)} accounts={accounts} />
    </div>
  );
}
