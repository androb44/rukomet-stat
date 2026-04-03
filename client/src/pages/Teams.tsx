import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTeamSchema } from "@shared/schema";
import { Plus, Users, ChevronRight } from "lucide-react";
import type { InsertTeam, Team } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function Teams() {
  const { data: teams, isLoading } = useQuery<Team[]>({ queryKey: ["/api/teams"] });
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title="Teams"
        subtitle="Manage rosters"
        action={<CreateTeamDialog open={open} onOpenChange={setOpen} />}
      />

      <main className="max-w-lg mx-auto p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {teams?.map((team) => (
              <Link key={team.id} href={`/teams/${team.id}`}>
                <div
                  className="bg-card border border-border/50 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  data-testid={`team-card-${team.id}`}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 shadow"
                    style={{ backgroundColor: team.color }}
                  >
                    {team.shortName}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold truncate">{team.name}</h3>
                    <p className="text-xs text-muted-foreground">View roster</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </div>
              </Link>
            ))}

            {teams?.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-bold">No teams yet</h3>
                <p className="text-muted-foreground text-sm mt-1">Create your first team to get started.</p>
                <Button className="mt-4 rounded-full px-6" onClick={() => setOpen(true)} data-testid="button-create-first-team">
                  Create Team
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function CreateTeamDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: InsertTeam) => {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create team");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      onOpenChange(false);
      form.reset();
      toast({ title: "Team created!" });
    },
    onError: () => toast({ title: "Failed to create team", variant: "destructive" }),
  });

  const form = useForm<InsertTeam>({
    resolver: zodResolver(insertTeamSchema),
    defaultValues: { name: "", shortName: "", color: "#3b82f6" },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="icon" className="rounded-full" data-testid="button-add-team">
          <Plus className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Create Team</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutate(d))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Denmark" className="rounded-xl" data-testid="input-team-name" {...field} />
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
                    <FormLabel>Short Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="DEN"
                        maxLength={3}
                        className="rounded-xl uppercase"
                        data-testid="input-team-short-name"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
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
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="color"
                          className="w-12 h-10 p-1 rounded-xl cursor-pointer"
                          data-testid="input-team-color"
                          {...field}
                        />
                        <Input className="flex-1 rounded-xl font-mono text-sm" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" className="w-full rounded-xl" disabled={isPending} data-testid="button-submit-team">
              {isPending ? "Creating..." : "Create Team"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
