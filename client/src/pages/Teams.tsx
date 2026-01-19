import { useTeams, useCreateTeam } from "@/hooks/use-teams";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Plus, Users, ChevronRight, Hexagon } from "lucide-react";
import { Link } from "wouter";
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
import { insertTeamSchema } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

export default function Teams() {
  const { data: teams, isLoading } = useTeams();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold font-display text-foreground">Teams</h1>
            <p className="text-muted-foreground mt-2">Manage your teams and rosters</p>
          </div>
          
          <CreateTeamDialog open={open} onOpenChange={setOpen} />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-muted/20 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : teams?.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border/60">
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">No teams yet</h3>
            <p className="text-muted-foreground mb-6">Create your first team to get started</p>
            <Button onClick={() => setOpen(true)} className="rounded-xl">
              Create Team
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams?.map((team) => (
              <Link key={team.id} href={`/teams/${team.id}`}>
                <div className="group bg-card hover:bg-accent/5 rounded-2xl p-6 border border-border/50 hover:border-primary/50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/10 to-transparent -mr-8 -mt-8 rounded-full blur-2xl group-hover:from-primary/20 transition-all duration-500" />
                  
                  <div className="flex items-center justify-between mb-6">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold font-display text-xl shadow-lg"
                      style={{ backgroundColor: team.color }}
                    >
                      {team.shortName}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  
                  <h3 className="text-xl font-bold font-display mb-1">{team.name}</h3>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Hexagon className="w-4 h-4 mr-2" />
                    <span>View Roster</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function CreateTeamDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const createTeam = useCreateTeam();
  
  const form = useForm<z.infer<typeof insertTeamSchema>>({
    resolver: zodResolver(insertTeamSchema),
    defaultValues: {
      name: "",
      shortName: "",
      color: "#3b82f6",
    },
  });

  function onSubmit(data: z.infer<typeof insertTeamSchema>) {
    createTeam.mutate(data, {
      onSuccess: () => {
        onOpenChange(false);
        form.reset();
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="lg" className="rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
          <Plus className="w-5 h-5 mr-2" />
          Add Team
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Create Team</DialogTitle>
          <DialogDescription>
            Add a new team to track stats for.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <Label>Team Name</Label>
                  <FormControl>
                    <Input placeholder="e.g. Thunder Bay Lions" {...field} className="rounded-xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="shortName"
                render={({ field }) => (
                  <FormItem>
                    <Label>Short Name (3 chars)</Label>
                    <FormControl>
                      <Input placeholder="TBL" maxLength={3} {...field} className="uppercase rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <Label>Team Color</Label>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input type="color" {...field} className="w-12 h-10 p-1 rounded-xl cursor-pointer" />
                        <span className="text-sm font-mono text-muted-foreground">{field.value}</span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full rounded-xl mt-4" 
              disabled={createTeam.isPending}
            >
              {createTeam.isPending ? "Creating..." : "Create Team"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
