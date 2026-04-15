import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  balance: number | null;
  category: string | null;
  subcategory: string | null;
  notes: string | null;
  isTransfer: boolean;
  editedByUser: boolean;
  importHash: string | null;
  createdAt: string;
  accountId: string;
  account: { name: string; bank: string; color: string | null };
}

interface TransactionFilters {
  accountId?: string;
  category?: string;
  subcategory?: string;
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
  if (filters.subcategory) params.set("subcategory", filters.subcategory);
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
      return { data: json.data as Transaction[], meta: json.meta as { total: number; page: number; limit: number } };
    },
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      category?: string | null;
      subcategory?: string | null;
      notes?: string | null;
    }) => {
      const res = await fetch(`/api/transactions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
  });
}
