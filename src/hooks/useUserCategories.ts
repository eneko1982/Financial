import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface UserCategory {
  id: string;
  name: string;
  parentId: string | null;
  color: string | null;
  createdAt: string;
  children: UserCategory[];
}

export function useUserCategories() {
  return useQuery({
    queryKey: ["userCategories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      const json = await res.json();
      return json.data as UserCategory[];
    },
  });
}

export function useCreateUserCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; parentId?: string; color?: string }) => {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["userCategories"] }),
  });
}

export function useUpdateUserCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; color?: string }) => {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["userCategories"] }),
  });
}

export function useDeleteUserCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["userCategories"] }),
  });
}
