import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertMatch, type InsertMatchEvent } from "@shared/routes";

export function useMatches() {
  return useQuery({
    queryKey: [api.matches.list.path],
    queryFn: async () => {
      const res = await fetch(api.matches.list.path);
      if (!res.ok) throw new Error("Failed to fetch matches");
      // JSON dates come back as strings, handled by app logic or z.coerce in schema if needed
      // Here we rely on API returning compatible types
      return api.matches.list.responses[200].parse(await res.json());
    },
  });
}

export function useMatch(id: number) {
  return useQuery({
    queryKey: [api.matches.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.matches.get.path, { id });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch match");
      return api.matches.get.responses[200].parse(await res.json());
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      // Poll more frequently if match is in progress
      if (data && data.status === 'in_progress') return 3000;
      return false;
    },
  });
}

export function useCreateMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertMatch) => {
      const res = await fetch(api.matches.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create match");
      return api.matches.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.matches.list.path] });
    },
  });
}

export function useUpdateMatchStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'scheduled' | 'in_progress' | 'finished' }) => {
      const url = buildUrl(api.matches.updateStatus.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return api.matches.updateStatus.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.matches.get.path, variables.id] });
      queryClient.invalidateQueries({ queryKey: [api.matches.list.path] });
    },
  });
}

export function useCreateMatchEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertMatchEvent) => {
      const res = await fetch(api.matchEvents.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to record event");
      return api.matchEvents.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.matches.get.path, variables.matchId] });
    },
  });
}
