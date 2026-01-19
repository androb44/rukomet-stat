import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertPlayer } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function usePlayers(teamId?: number) {
  return useQuery({
    queryKey: [api.players.list.path, { teamId }],
    queryFn: async () => {
      const url = new URL(window.location.origin + api.players.list.path);
      if (teamId) {
        url.searchParams.append("teamId", teamId.toString());
      }
      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch players");
      return api.players.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreatePlayer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertPlayer) => {
      const res = await fetch(api.players.create.path, {
        method: api.players.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create player");
      return api.players.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.players.list.path] });
      toast({ title: "Success", description: "Player added to roster" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeletePlayer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.players.delete.path, { id });
      const res = await fetch(url, {
        method: api.players.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete player");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.players.list.path] });
      toast({ title: "Success", description: "Player removed" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
