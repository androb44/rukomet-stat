import { useState } from "react";
import { useMatches, useCreateMatch } from "@/hooks/use-matches";
import { useTeams } from "@/hooks/use-teams";
import { PageHeader } from "@/components/PageHeader";
import { ScoreCard } from "@/components/ScoreCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMatchSchema } from "@shared/schema";
import { z } from "zod";
import { Plus, Calendar as CalendarIcon } from "lucide-react";

export default function Matches() {
  const { data: matches, isLoading: matchesLoading } = useMatches();
  const { data: teams, isLoading: teamsLoading } = useTeams();
  const [open, setOpen] = useState(false);

  const enrichedMatches = matches?.map(match => ({
    ...match,
    homeTeam: teams?.find(t => t.id === match.homeTeamId)!,
    awayTeam: teams?.find(t => t.id === match.awayTeamId)!,
  })).filter(m => m.homeTeam && m.awayTeam) ?? [];

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader 
        title="Matches" 
        subtitle="Schedule & Results" 
        action={<CreateMatchDialog open={open} onOpenChange={setOpen} teams={teams || []} />}
      />

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        {matchesLoading || teamsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted/50 rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <>
            {enrichedMatches.map(match => (
              <ScoreCard key={match.id} match={match} />
            ))}
            
            {enrichedMatches.length === 0 && (
              <div className="text-center py-12">
                <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-bold">No matches found</h3>
                <Button className="mt-4" onClick={() => setOpen(true)}>Schedule Match</Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function CreateMatchDialog({ open, onOpenChange, teams }: { open: boolean; onOpenChange: (o: boolean) => void, teams: any[] }) {
  const { mutate, isPending } = useCreateMatch();

  const formSchema = insertMatchSchema.extend({
    homeTeamId: z.coerce.number(),
    awayTeamId: z.coerce.number(),
    date: z.coerce.date(), // handles string -> Date
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      location: "",
      status: "scheduled",
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    mutate(data, {
      onSuccess: () => {
        onOpenChange(false);
        form.reset();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="icon" className="rounded-full shadow-lg shadow-primary/20">
          <Plus className="w-6 h-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl h-[90vh] sm:h-auto overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Match</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="homeTeamId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Home Team</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={String(field.value || "")}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {teams.map(t => (
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
                    <Select onValueChange={field.onChange} defaultValue={String(field.value || "")}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {teams.map(t => (
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
                      {...field} 
                      value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
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
                    <Input placeholder="Stadium Name" className="rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full rounded-xl" disabled={isPending}>
              {isPending ? "Scheduling..." : "Create Match"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
