import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await fetch("/api/accounts");
      const json = await res.json();
      return json.data as Array<{ id: string; name: string; bank: string; type: string; color: string | null; balance: number; currency: string }>;
    },
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  });
}
