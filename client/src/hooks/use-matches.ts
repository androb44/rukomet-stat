import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertMatch, InsertMatchEvent } from "@shared/schema";

export function useMatches() {
  return useQuery({
    queryKey: [api.matches.list.path],
    queryFn: async () => {
      const res = await fetch(api.matches.list.path);
      if (!res.ok) throw new Error("Failed to fetch matches");
      return res.json();
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
      return res.json();
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
      return res.json();
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
      return res.json();
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
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.matches.get.path, variables.matchId] });
    },
  });
}

export function useDeleteMatchEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, matchId }: { id: number; matchId: number }) => {
      const url = buildUrl(api.matchEvents.delete.path, { id });
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete event");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.matches.get.path, variables.matchId] });
    },
  });
}
