import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMatchSchema } from "@shared/schema";
import { z } from "zod";
import { Plus, Calendar, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Team } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function Matches() {
  const { data: matches, isLoading: matchesLoading } = useQuery<any[]>({ queryKey: ["/api/matches"] });
  const { data: teams } = useQuery<Team[]>({ queryKey: ["/api/teams"] });
  const [open, setOpen] = useState(false);

  const live = matches?.filter((m) => m.status === "in_progress") ?? [];
  const upcoming = matches?.filter((m) => m.status === "scheduled") ?? [];
  const finished = matches?.filter((m) => m.status === "finished") ?? [];

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title="Matches"
        subtitle="Schedule & Results"
        action={<CreateMatchDialog open={open} onOpenChange={setOpen} teams={teams ?? []} />}
      />

      <main className="max-w-lg mx-auto p-4 space-y-6">
        {matchesLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted/50 rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <>
            {live.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <h2 className="font-bold">Live</h2>
                </div>
                {live.map((m) => <MatchCard key={m.id} match={m} />)}
              </section>
            )}

            {upcoming.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-bold text-muted-foreground text-sm uppercase tracking-wider">Upcoming</h2>
                {upcoming.map((m) => <MatchCard key={m.id} match={m} />)}
              </section>
            )}

            {finished.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-bold text-muted-foreground text-sm uppercase tracking-wider">Results</h2>
                {finished.map((m) => <MatchCard key={m.id} match={m} />)}
              </section>
            )}

            {matches?.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-bold">No matches yet</h3>
                <p className="text-sm text-muted-foreground mt-1">Schedule your first match.</p>
                <Button className="mt-4 rounded-full px-6" onClick={() => setOpen(true)} data-testid="button-schedule-first">
                  Schedule Match
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function MatchCard({ match }: { match: any }) {
  const isLive = match.status === "in_progress";
  const isFinished = match.status === "finished";

  return (
    <Link href={`/matches/${match.id}`}>
      <div
        className={cn(
          "bg-card border rounded-2xl p-4 cursor-pointer hover:bg-muted/30 transition-colors",
          isLive ? "border-red-500/40 ring-1 ring-red-500/20" : "border-border/50"
        )}
        data-testid={`match-card-${match.id}`}
      >
        <div className="flex items-center gap-3">
          {/* Home */}
          <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ backgroundColor: match.homeTeam?.color ?? "#888" }}
            >
              {match.homeTeam?.shortName ?? "?"}
            </div>
            <span className="text-xs font-medium truncate w-full text-center">{match.homeTeam?.name ?? "Home"}</span>
          </div>

          {/* Score / Status */}
          <div className="flex flex-col items-center shrink-0 min-w-[80px] gap-1">
            {isLive ? (
              <>
                <div className="text-xl font-bold font-mono">
                  {match.homeScore ?? 0} – {match.awayScore ?? 0}
                </div>
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Live</span>
              </>
            ) : isFinished ? (
              <>
                <div className="text-xl font-bold font-mono">
                  {match.homeScore ?? 0} – {match.awayScore ?? 0}
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Final</span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground font-medium text-center">
                {format(new Date(match.date), "d MMM\nHH:mm")}
              </span>
            )}
          </div>

          {/* Away */}
          <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ backgroundColor: match.awayTeam?.color ?? "#888" }}
            >
              {match.awayTeam?.shortName ?? "?"}
            </div>
            <span className="text-xs font-medium truncate w-full text-center">{match.awayTeam?.name ?? "Away"}</span>
          </div>

          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </div>
      </div>
    </Link>
  );
}

function CreateMatchDialog({
  open,
  onOpenChange,
  teams,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  teams: Team[];
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const formSchema = insertMatchSchema.extend({
    homeTeamId: z.coerce.number().min(1, "Required"),
    awayTeamId: z.coerce.number().min(1, "Required"),
    date: z.coerce.date(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { location: "", status: "scheduled" },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create match");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      onOpenChange(false);
      form.reset();
      toast({ title: "Match scheduled!" });
    },
    onError: () => toast({ title: "Failed to schedule match", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="icon" className="rounded-full" data-testid="button-add-match">
          <Plus className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Match</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="homeTeamId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Home Team</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ? String(field.value) : ""}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl" data-testid="select-home-team">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {teams.map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="awayTeamId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Away Team</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ? String(field.value) : ""}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl" data-testid="select-away-team">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {teams.map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date & Time</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      className="rounded-xl"
                      data-testid="input-match-date"
                      {...field}
                      value={field.value ? new Date(field.value as any).toISOString().slice(0, 16) : ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="Stadium / Venue" className="rounded-xl" data-testid="input-match-location" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full rounded-xl" disabled={isPending} data-testid="button-submit-match">
              {isPending ? "Scheduling..." : "Schedule Match"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
