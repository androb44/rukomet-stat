import { useMatches, useCreateMatch } from "@/hooks/use-matches";
import { useTeams } from "@/hooks/use-teams";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, MapPin, Clock } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMatchSchema } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Matches() {
  const { data: matches, isLoading } = useMatches();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold font-display text-foreground">Matches</h1>
            <p className="text-muted-foreground mt-2">Schedule and match history</p>
          </div>
          
          <CreateMatchDialog open={open} onOpenChange={setOpen} />
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted/20 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : matches?.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border/60">
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">No matches scheduled</h3>
            <p className="text-muted-foreground mb-6">Schedule your first match to start tracking stats</p>
            <Button onClick={() => setOpen(true)} className="rounded-xl">
              Schedule Match
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {matches?.map((match) => {
              const matchDate = new Date(match.date);
              const isLive = match.status === 'in_progress';
              const isFinished = match.status === 'finished';
              
              return (
                <Link key={match.id} href={`/matches/${match.id}`}>
                  <div className="group bg-card hover:bg-accent/5 rounded-2xl p-6 border border-border/50 hover:border-primary/50 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer relative overflow-hidden">
                    {isLive && (
                      <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 animate-pulse" />
                    )}
                    
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-6 flex-1 justify-end">
                        <span className="font-display font-bold text-lg md:text-xl text-right">{match.homeTeam?.name}</span>
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold font-display text-lg shadow-md shrink-0"
                          style={{ backgroundColor: match.homeTeam?.color || '#333' }}
                        >
                          {match.homeTeam?.shortName}
                        </div>
                      </div>

                      <div className="flex flex-col items-center px-4 min-w-[120px]">
                        {isFinished || isLive ? (
                          <div className="font-display font-bold text-3xl md:text-4xl tracking-widest flex items-center gap-2">
                            <span>{match.homeScore}</span>
                            <span className="text-muted-foreground/30">-</span>
                            <span>{match.awayScore}</span>
                          </div>
                        ) : (
                          <div className="font-mono font-bold text-2xl text-muted-foreground">VS</div>
                        )}
                        
                        <div className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          {isLive ? (
                            <span className="text-red-500 animate-pulse flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-red-500" /> LIVE
                            </span>
                          ) : isFinished ? (
                            "Finished"
                          ) : (
                            format(matchDate, "h:mm a")
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-6 flex-1 justify-start">
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold font-display text-lg shadow-md shrink-0"
                          style={{ backgroundColor: match.awayTeam?.color || '#333' }}
                        >
                          {match.awayTeam?.shortName}
                        </div>
                        <span className="font-display font-bold text-lg md:text-xl text-left">{match.awayTeam?.name}</span>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-border/40 flex justify-between items-center text-sm text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(matchDate, "EEE, MMM d, yyyy")}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {match.location}
                        </span>
                      </div>
                      <div className="text-primary font-medium group-hover:underline">
                        {isFinished ? "View Stats" : isLive ? "Open Live Scorer" : "Manage"}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function CreateMatchDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const createMatch = useCreateMatch();
  const { data: teams } = useTeams();
  
  const form = useForm<z.infer<typeof insertMatchSchema>>({
    resolver: zodResolver(insertMatchSchema),
    defaultValues: {
      location: "",
      status: "scheduled",
    },
  });

  function onSubmit(data: z.infer<typeof insertMatchSchema>) {
    createMatch.mutate(data, {
      onSuccess: () => {
        onOpenChange(false);
        form.reset();
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="lg" className="rounded-xl shadow-lg shadow-primary/25">
          <Plus className="w-5 h-5 mr-2" />
          Schedule Match
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Schedule Match</DialogTitle>
          <DialogDescription>
            Create a new match between two teams.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="homeTeamId"
                render={({ field }) => (
                  <FormItem>
                    <Label>Home Team</Label>
                    <Select onValueChange={val => field.onChange(parseInt(val))}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Select team" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {teams?.map(team => (
                          <SelectItem key={team.id} value={team.id.toString()}>
                            {team.name}
                          </SelectItem>
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
                    <Label>Away Team</Label>
                    <Select onValueChange={val => field.onChange(parseInt(val))}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Select team" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {teams?.map(team => (
                          <SelectItem key={team.id} value={team.id.toString()}>
                            {team.name}
                          </SelectItem>
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
                  <Label>Date & Time</Label>
                  <FormControl>
                    <Input 
                      type="datetime-local" 
                      {...field}
                      value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                      onChange={e => field.onChange(new Date(e.target.value))}
                      className="rounded-xl" 
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
                  <Label>Location</Label>
                  <FormControl>
                    <Input placeholder="Stadium or Gym name" {...field} className="rounded-xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full rounded-xl mt-4" 
              disabled={createMatch.isPending}
            >
              {createMatch.isPending ? "Scheduling..." : "Schedule Match"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
