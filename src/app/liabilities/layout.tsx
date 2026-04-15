"use client";
import { Sidebar } from "@/components/layout/Sidebar";
import { useUIStore } from "@/store/uiStore";
import { useAccounts } from "@/hooks/useAccounts";
import { ImportWizard } from "@/components/import/ImportWizard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { importOpen, setImportOpen } = useUIStore();
  const { data: accounts = [] } = useAccounts();

  return (
    <div className="flex min-h-screen">
      <Sidebar onImport={() => setImportOpen(true)} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
      <ImportWizard open={importOpen} onClose={() => setImportOpen(false)} accounts={accounts} />
    </div>
  );
}
