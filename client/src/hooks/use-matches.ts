import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertMatch, type InsertMatchEvent } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useMatches() {
  return useQuery({
    queryKey: [api.matches.list.path],
    queryFn: async () => {
      const res = await fetch(api.matches.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch matches");
      return api.matches.list.responses[200].parse(await res.json());
    },
  });
}

export function useMatch(id: number) {
  return useQuery({
    queryKey: [api.matches.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.matches.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch match");
      return api.matches.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
    refetchInterval: (query) => {
      // Poll more frequently if match is in progress
      const match = query.state.data;
      if (match && match.status === 'in_progress') return 3000;
      return 10000;
    },
  });
}

export function useCreateMatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertMatch) => {
      const res = await fetch(api.matches.create.path, {
        method: api.matches.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to schedule match");
      return api.matches.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.matches.list.path] });
      toast({ title: "Success", description: "Match scheduled successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateMatchStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'scheduled' | 'in_progress' | 'finished' }) => {
      const url = buildUrl(api.matches.updateStatus.path, { id });
      const res = await fetch(url, {
        method: api.matches.updateStatus.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update status");
      return api.matches.updateStatus.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.matches.get.path, data.id] });
      queryClient.invalidateQueries({ queryKey: [api.matches.list.path] });
      toast({ title: "Status Updated", description: `Match is now ${data.status}` });
    },
  });
}

export function useCreateMatchEvent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertMatchEvent) => {
      const res = await fetch(api.matchEvents.create.path, {
        method: api.matchEvents.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to record event");
      return api.matchEvents.create.responses[201].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.matches.get.path, data.matchId] });
      // Don't show toast for every event to avoid spamming the UI during live scoring
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteMatchEvent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, matchId }: { id: number; matchId: number }) => {
      const url = buildUrl(api.matchEvents.delete.path, { id });
      const res = await fetch(url, {
        method: api.matchEvents.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete event");
      return matchId;
    },
    onSuccess: (matchId) => {
      queryClient.invalidateQueries({ queryKey: [api.matches.get.path, matchId] });
      toast({ title: "Success", description: "Event undone" });
    },
  });
}
