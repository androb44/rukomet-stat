import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPlayerSchema } from "@shared/schema";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import type { Team, Player } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

const POSITIONS = ["GK", "LW", "LB", "CB", "RB", "RW", "P"];

export default function TeamDetails() {
  const { id } = useParams();
  const teamId = Number(id);
  const [addOpen, setAddOpen] = useState(false);

  const { data: team, isLoading: teamLoading } = useQuery<Team>({
    queryKey: ["/api/teams", teamId],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${teamId}`);
      if (!res.ok) throw new Error("Team not found");
      return res.json();
    },
  });

  const { data: players, isLoading: playersLoading } = useQuery<Player[]>({
    queryKey: ["/api/players", teamId],
    queryFn: async () => {
      const res = await fetch(`/api/players?teamId=${teamId}`);
      if (!res.ok) throw new Error("Failed to load players");
      return res.json();
    },
  });

  if (teamLoading || playersLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <PageHeader title="Team" backTo="/teams" />
        <div className="p-4 space-y-3 max-w-lg mx-auto">
          <div className="h-32 bg-muted/50 rounded-2xl animate-pulse" />
          <div className="h-16 bg-muted/50 rounded-xl animate-pulse" />
          <div className="h-16 bg-muted/50 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-background pb-24 flex items-center justify-center">
        <p className="text-destructive">Team not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title={team.name}
        subtitle="Roster Management"
        backTo="/teams"
        action={<AddPlayerDialog teamId={teamId} open={addOpen} onOpenChange={setAddOpen} />}
      />

      <main className="max-w-lg mx-auto p-4 space-y-5">
        {/* Team Banner */}
        <div
          className="rounded-2xl p-5 text-white relative overflow-hidden"
          style={{ backgroundColor: team.color }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/20" />
          <div className="relative flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-2xl font-bold border border-white/30">
              {team.shortName}
            </div>
            <div>
              <h2 className="text-xl font-bold">{team.name}</h2>
              <p className="opacity-80 text-sm">{players?.length ?? 0} players</p>
            </div>
          </div>
        </div>

        {/* Players */}
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Roster</h3>

          {players?.length === 0 && (
            <div className="border border-dashed border-border rounded-xl p-8 text-center text-muted-foreground">
              <p className="text-sm">No players yet.</p>
              <button
                className="mt-1 text-primary text-sm font-medium hover:underline"
                onClick={() => setAddOpen(true)}
                data-testid="button-add-first-player"
              >
                Add your first player
              </button>
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            {players?.map((player) => (
              <PlayerRow key={player.id} player={player} teamId={teamId} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function PlayerRow({ player, teamId }: { player: Player; teamId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { mutate: deletePlayer, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/players/${player.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete player");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players", teamId] });
      toast({ title: "Player removed" });
    },
    onError: () => toast({ title: "Failed to remove player", variant: "destructive" }),
  });

  return (
    <div
      className="bg-card border border-border/50 rounded-xl p-3 flex items-center gap-3"
      data-testid={`player-row-${player.id}`}
    >
      <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center font-bold font-mono text-sm shrink-0">
        {player.number}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">{player.name}</div>
        <div className="text-xs text-muted-foreground">
          <span className="bg-muted px-1.5 py-0.5 rounded font-medium">{player.position}</span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
        onClick={() => deletePlayer()}
        disabled={isPending}
        data-testid={`button-delete-player-${player.id}`}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

function AddPlayerDialog({
  teamId,
  open,
  onOpenChange,
}: {
  teamId: number;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const formSchema = insertPlayerSchema.extend({
    number: z.coerce.number().min(1, "Required").max(99),
    teamId: z.coerce.number(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", number: undefined as any, position: "GK", teamId },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add player");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players", teamId] });
      onOpenChange(false);
      form.reset({ name: "", number: undefined as any, position: "GK", teamId });
      toast({ title: "Player added!" });
    },
    onError: () => toast({ title: "Failed to add player", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-full" data-testid="button-add-player">
          <Plus className="w-4 h-4 mr-1" /> Add Player
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Add Player</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutate(d))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" className="rounded-xl" data-testid="input-player-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jersey #</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="10"
                        className="rounded-xl"
                        data-testid="input-player-number"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl" data-testid="select-player-position">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {POSITIONS.map((pos) => (
                          <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" className="w-full rounded-xl" disabled={isPending} data-testid="button-submit-player">
              {isPending ? "Adding..." : "Add Player"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
