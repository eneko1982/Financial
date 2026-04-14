import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface TransactionFilters {
  accountId?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useTransactions(filters: TransactionFilters = {}) {
  const params = new URLSearchParams();
  if (filters.accountId) params.set("accountId", filters.accountId);
  if (filters.category) params.set("category", filters.category);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.search) params.set("search", filters.search);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));

  return useQuery({
    queryKey: ["transactions", filters],
    queryFn: async () => {
      const res = await fetch(`/api/transactions?${params}`);
      const json = await res.json();
      return { data: json.data, meta: json.meta } as {
        data: Array<{ id: string; date: string; description: string; amount: number; category: string | null; account: { name: string; bank: string; color: string | null } }>;
        meta: { total: number; page: number; limit: number };
      };
    },
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; category?: string; notes?: string }) => {
      const res = await fetch(`/api/transactions/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
  });
}
