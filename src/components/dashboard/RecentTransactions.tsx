"use client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string | null;
  account: { name: string; bank: string };
}

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Últimas Transacciones</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {transactions.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">No hay transacciones. Importa tu extracto bancario.</p>
        ) : (
          <div className="divide-y divide-border">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{tx.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString("es-ES")}</span>
                    {tx.category && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{tx.category}</Badge>
                    )}
                  </div>
                </div>
                <span className={cn("text-sm font-mono font-semibold tabular-nums ml-4 shrink-0", tx.amount >= 0 ? "text-emerald-400" : "text-foreground")}>
                  {tx.amount >= 0 ? "+" : ""}{formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
