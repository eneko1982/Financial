"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Liability {
  id: string;
  name: string;
  type: string;
  balance: number;
  interestRate: number | null;
  monthlyPayment: number | null;
  lender: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

async function fetchLiabilities(): Promise<Liability[]> {
  const res = await fetch("/api/liabilities");
  const json = await res.json();
  return json.data ?? [];
}

export function useLiabilities() {
  return useQuery({ queryKey: ["liabilities"], queryFn: fetchLiabilities });
}

export function useCreateLiability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Liability, "id" | "isActive" | "createdAt" | "updatedAt">) =>
      fetch("/api/liabilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["liabilities"] }),
  });
}

export function useUpdateLiability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Liability> & { id: string }) =>
      fetch(`/api/liabilities/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["liabilities"] }),
  });
}

export function useDeleteLiability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/liabilities/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["liabilities"] }),
  });
}
