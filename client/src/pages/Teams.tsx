import { useState } from "react";
import { useTeams, useCreateTeam } from "@/hooks/use-teams";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTeamSchema } from "@shared/schema";
import { Link } from "wouter";
import { Plus, Users, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import type { InsertTeam } from "@shared/routes";

export default function Teams() {
  const { data: teams, isLoading } = useTeams();
  const [open, setOpen] = useState(false);
  
  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader 
        title="Teams" 
        subtitle="Manage roster & colors"
        action={
          <CreateTeamDialog open={open} onOpenChange={setOpen} />
        }
      />

      <main className="max-w-4xl mx-auto p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {teams?.map((team, idx) => (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link href={`/teams/${team.id}`}>
                  <div className="group bg-card hover:bg-muted/50 border border-border/50 rounded-xl p-4 flex items-center justify-between transition-all active:scale-[0.99] cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-md"
                        style={{ backgroundColor: team.color }}
                      >
                        {team.shortName}
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                          {team.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">View details</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              </motion.div>
            ))}
            
            {teams?.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-bold">No teams yet</h3>
                <p className="text-muted-foreground mb-4">Create your first team to get started.</p>
                <Button onClick={() => setOpen(true)}>Create Team</Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function CreateTeamDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { mutate, isPending } = useCreateTeam();
  const form = useForm<InsertTeam>({
    resolver: zodResolver(insertTeamSchema),
    defaultValues: {
      name: "",
      shortName: "",
      color: "#000000",
    },
  });

  const onSubmit = (data: InsertTeam) => {
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
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Create Team</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Denmark" className="rounded-xl" {...field} />
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
                    <FormLabel>Short Name (3 chars)</FormLabel>
                    <FormControl>
                      <Input placeholder="DEN" maxLength={3} className="uppercase rounded-xl" {...field} />
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
                    <FormLabel>Team Color</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input type="color" className="w-12 p-1 rounded-xl cursor-pointer" {...field} />
                        <Input className="flex-1 rounded-xl uppercase" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" className="w-full rounded-xl" disabled={isPending}>
              {isPending ? "Creating..." : "Create Team"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
