import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertPlayer } from "@shared/routes";

export function usePlayers(teamId?: number) {
  return useQuery({
    queryKey: [api.players.list.path, teamId],
    queryFn: async () => {
      const url = teamId 
        ? `${api.players.list.path}?teamId=${teamId}`
        : api.players.list.path;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch players");
      return api.players.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreatePlayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertPlayer) => {
      const validated = api.players.create.input.parse(data);
      const res = await fetch(api.players.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!res.ok) throw new Error("Failed to create player");
      return api.players.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.players.list.path] });
      // Invalidate specific team query if we knew it
      queryClient.invalidateQueries({ queryKey: [api.players.list.path, variables.teamId] });
    },
  });
}

export function useDeletePlayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.players.delete.path, { id });
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete player");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.players.list.path] });
    },
  });
}
