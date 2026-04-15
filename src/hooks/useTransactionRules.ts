"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface TransactionRule {
  id: string;
  name: string;
  pattern: string;
  matchType: string;
  category: string;
  subcategory: string | null;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

async function fetchRules(): Promise<TransactionRule[]> {
  const res = await fetch("/api/transaction-rules");
  const json = await res.json();
  return json.data ?? [];
}

export function useTransactionRules() {
  return useQuery({ queryKey: ["transaction-rules"], queryFn: fetchRules });
}

export function useCreateTransactionRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<TransactionRule, "id" | "isActive" | "createdAt" | "updatedAt">) =>
      fetch("/api/transaction-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transaction-rules"] }),
  });
}

export function useUpdateTransactionRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<TransactionRule> & { id: string }) =>
      fetch(`/api/transaction-rules/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transaction-rules"] }),
  });
}

export function useDeleteTransactionRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/transaction-rules/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transaction-rules"] }),
  });
}

export function useApplyTransactionRules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetch("/api/transaction-rules/apply", { method: "POST" }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}
