import { useTeam } from "@/hooks/use-teams";
import { usePlayers, useCreatePlayer, useDeletePlayer } from "@/hooks/use-players";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Shirt, Trash2, UserPlus } from "lucide-react";
import { Link, useRoute } from "wouter";
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
import { insertPlayerSchema } from "@shared/schema";
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function TeamDetails() {
  const [, params] = useRoute("/teams/:id");
  const id = params ? parseInt(params.id) : 0;
  
  const { data: team, isLoading: teamLoading } = useTeam(id);
  const { data: players, isLoading: playersLoading } = usePlayers(id);
  const deletePlayer = useDeletePlayer();
  const [open, setOpen] = useState(false);

  if (teamLoading || playersLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Team not found</h1>
        <Link href="/teams">
          <Button>Return to Teams</Button>
        </Link>
      </div>
    );
  }

  const positions = ["GK", "LW", "LB", "CB", "RB", "RW", "P"];
  const playersByPosition = positions.reduce((acc, pos) => {
    acc[pos] = players?.filter(p => p.position === pos) || [];
    return acc;
  }, {} as Record<string, typeof players>);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/teams" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Teams
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex items-center gap-6">
              <div 
                className="w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center text-white font-bold font-display text-3xl shadow-xl"
                style={{ backgroundColor: team.color }}
              >
                {team.shortName}
              </div>
              <div>
                <h1 className="text-3xl md:text-5xl font-bold font-display text-foreground">{team.name}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-sm font-normal py-1 px-3">
                    {players?.length || 0} Players
                  </Badge>
                </div>
              </div>
            </div>

            <CreatePlayerDialog teamId={team.id} open={open} onOpenChange={setOpen} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {positions.map((pos) => {
              const posPlayers = playersByPosition[pos];
              if (!posPlayers?.length) return null;
              
              return (
                <div key={pos} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h3 className="text-lg font-bold text-muted-foreground mb-4 flex items-center">
                    <span className="bg-primary/10 text-primary w-8 h-8 rounded-lg flex items-center justify-center mr-2 text-sm">
                      {pos}
                    </span>
                    {getPositionName(pos)}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {posPlayers.map((player) => (
                      <div key={player.id} className="group bg-card p-4 rounded-xl border border-border/50 hover:border-primary/50 shadow-sm transition-all flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div className="font-mono text-xl font-bold text-muted-foreground w-8 text-center">
                            {player.number}
                          </div>
                          <div>
                            <div className="font-semibold">{player.name}</div>
                            <div className="text-xs text-muted-foreground">{getPositionName(player.position)}</div>
                          </div>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            if (confirm("Are you sure you want to remove this player?")) {
                              deletePlayer.mutate(player.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            
            {players?.length === 0 && (
              <div className="bg-card rounded-2xl border border-dashed border-border p-12 text-center">
                <Shirt className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No players yet</h3>
                <p className="text-muted-foreground mb-6">Add players to build your roster</p>
                <Button onClick={() => setOpen(true)} variant="outline">
                  Add First Player
                </Button>
              </div>
            )}
          </div>
          
          <div className="lg:col-span-1">
            <Card className="bg-primary/5 border-primary/10 sticky top-8">
              <CardContent className="pt-6">
                <h3 className="font-display text-xl font-bold mb-4">Team Summary</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-primary/10 pb-2">
                    <span className="text-muted-foreground">Total Players</span>
                    <span className="font-bold">{players?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-primary/10 pb-2">
                    <span className="text-muted-foreground">Goalkeepers</span>
                    <span className="font-bold">{playersByPosition["GK"]?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2">
                    <span className="text-muted-foreground">Field Players</span>
                    <span className="font-bold">
                      {(players?.length || 0) - (playersByPosition["GK"]?.length || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function getPositionName(abbr: string) {
  const map: Record<string, string> = {
    GK: "Goalkeeper",
    LW: "Left Wing",
    LB: "Left Back",
    CB: "Center Back",
    RB: "Right Back",
    RW: "Right Wing",
    P: "Pivot",
  };
  return map[abbr] || abbr;
}

function CreatePlayerDialog({ teamId, open, onOpenChange }: { teamId: number, open: boolean, onOpenChange: (open: boolean) => void }) {
  const createPlayer = useCreatePlayer();
  
  const form = useForm<z.infer<typeof insertPlayerSchema>>({
    resolver: zodResolver(insertPlayerSchema),
    defaultValues: {
      teamId,
      name: "",
      number: 0,
      position: "CB",
    },
  });

  function onSubmit(data: z.infer<typeof insertPlayerSchema>) {
    createPlayer.mutate(data, {
      onSuccess: () => {
        onOpenChange(false);
        form.reset({ ...data, name: "", number: 0 }); // Keep position/teamId
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="rounded-xl shadow-lg shadow-primary/20">
          <UserPlus className="w-5 h-5 mr-2" />
          Add Player
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Add Player</DialogTitle>
          <DialogDescription>
            Add a new player to the roster.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <Label>Full Name</Label>
                  <FormControl>
                    <Input placeholder="e.g. John Doe" {...field} className="rounded-xl" />
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
                    <Label>Jersey Number</Label>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={0} 
                        max={99} 
                        {...field} 
                        onChange={e => field.onChange(parseInt(e.target.value))}
                        className="rounded-xl" 
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
                    <Label>Position</Label>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Select position" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="GK">Goalkeeper</SelectItem>
                        <SelectItem value="LW">Left Wing</SelectItem>
                        <SelectItem value="LB">Left Back</SelectItem>
                        <SelectItem value="CB">Center Back</SelectItem>
                        <SelectItem value="RB">Right Back</SelectItem>
                        <SelectItem value="RW">Right Wing</SelectItem>
                        <SelectItem value="P">Pivot</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full rounded-xl mt-4" 
              disabled={createPlayer.isPending}
            >
              {createPlayer.isPending ? "Adding..." : "Add Player"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
