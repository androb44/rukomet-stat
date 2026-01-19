import { useParams } from "wouter";
import { useTeam } from "@/hooks/use-teams";
import { usePlayers, useCreatePlayer, useDeletePlayer } from "@/hooks/use-players";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPlayerSchema } from "@shared/schema";
import { Plus, Trash2, Shirt } from "lucide-react";
import { z } from "zod";

const positions = ["GK", "LW", "LB", "CB", "RB", "RW", "P"];

export default function TeamDetails() {
  const { id } = useParams();
  const teamId = Number(id);
  const { data: team, isLoading: teamLoading } = useTeam(teamId);
  const { data: players, isLoading: playersLoading } = usePlayers(teamId);
  const deletePlayer = useDeletePlayer();

  if (teamLoading || playersLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!team) return <div className="p-8 text-center text-destructive">Team not found</div>;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader 
        title={team.name} 
        subtitle="Roster Management" 
        backTo="/teams"
        action={<AddPlayerDialog teamId={teamId} />}
      />

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Team Banner */}
        <div 
          className="rounded-3xl p-6 text-white shadow-lg relative overflow-hidden"
          style={{ backgroundColor: team.color }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/10 pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-3xl font-bold border border-white/30">
              {team.shortName}
            </div>
            <div>
              <h2 className="text-2xl font-bold font-display">{team.name}</h2>
              <p className="opacity-90">{players?.length ?? 0} Players</p>
            </div>
          </div>
        </div>

        {/* Players List */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold px-1">Players</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {players?.map((player) => (
              <div key={player.id} className="bg-card border border-border/50 rounded-xl p-3 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center font-mono font-bold text-foreground">
                    {player.number}
                  </div>
                  <div>
                    <div className="font-bold">{player.name}</div>
                    <div className="text-xs text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-md inline-block">
                      {player.position}
                    </div>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mr-2"
                  onClick={() => deletePlayer.mutate(player.id)}
                  disabled={deletePlayer.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            
            {players?.length === 0 && (
              <div className="col-span-full py-8 text-center text-muted-foreground bg-muted/30 rounded-xl border border-dashed border-border">
                No players added yet.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function AddPlayerDialog({ teamId }: { teamId: number }) {
  const [open, setOpen] = useState(false);
  const { mutate, isPending } = useCreatePlayer();
  
  // Need to handle number coercion because input type="number" returns string
  const formSchema = insertPlayerSchema.extend({
    number: z.coerce.number().min(1).max(99),
    teamId: z.coerce.number(), // Ensure this is handled
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      number: undefined,
      position: "GK",
      teamId: teamId,
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    mutate(data, {
      onSuccess: () => {
        setOpen(false);
        form.reset({ name: "", number: undefined, position: "GK", teamId });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-full shadow-md">
          <Plus className="w-4 h-4 mr-1" /> Add Player
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Add Player</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" className="rounded-xl" {...field} />
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
                    <FormLabel>Jersey Number</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Shirt className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                        <Input type="number" placeholder="10" className="pl-9 rounded-xl" {...field} />
                      </div>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {positions.map(pos => (
                          <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" className="w-full rounded-xl" disabled={isPending}>
              {isPending ? "Adding..." : "Add Player"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
