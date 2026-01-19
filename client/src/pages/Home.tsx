import { useMatches } from "@/hooks/use-matches";
import { useTeams } from "@/hooks/use-teams";
import { ScoreCard } from "@/components/ScoreCard";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, Trophy, Activity } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { data: matches, isLoading: matchesLoading, error: matchesError } = useMatches();
  const { data: teams, isLoading: teamsLoading, error: teamsError } = useTeams();

  // Show error state
  if (matchesError || teamsError) {
    return (
      <div className="min-h-screen bg-background pb-20 p-4">
        <PageHeader title="Handball Stats" subtitle="Error loading data" />
        <div className="text-center py-12">
          <p className="text-destructive">Failed to load data. Please refresh.</p>
        </div>
      </div>
    );
  }

  // Show loading state
  if (matchesLoading || teamsLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <PageHeader title="Handball Stats" subtitle="Loading..." />
        <div className="p-4 space-y-4">
          <div className="h-40 bg-muted/50 rounded-2xl" />
          <div className="h-40 bg-muted/50 rounded-2xl" />
        </div>
      </div>
    );
  }

  // The API now returns matches with homeTeam and awayTeam included
  const enrichedMatches = (matches || []).filter(
    (m: any) => m.homeTeam && m.awayTeam
  );

  const liveMatches = enrichedMatches.filter((m: any) => m.status === 'in_progress');
  const upcomingMatches = enrichedMatches.filter((m: any) => m.status === 'scheduled').slice(0, 3);

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader 
        title="Dashboard" 
        subtitle="Welcome back, Coach"
        action={
          <Link href="/matches">
            <Button size="sm" variant="outline" className="rounded-full h-8" data-testid="button-view-all">
              View All
            </Button>
          </Link>
        }
      />

      <main className="max-w-4xl mx-auto p-4 space-y-8">
        {/* Live Matches Section */}
        {liveMatches.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-accent">
              <Activity className="w-5 h-5" />
              <h2 className="text-lg font-bold tracking-tight text-foreground">Live Now</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {liveMatches.map((match: any) => (
                <ScoreCard key={match.id} match={match} />
              ))}
            </div>
          </section>
        )}

        {/* Quick Actions */}
        <section className="grid grid-cols-2 gap-3">
          <Link href="/matches">
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-4 rounded-2xl border border-primary/10 cursor-pointer" data-testid="card-new-match">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-3">
                <Plus className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-foreground">New Match</h3>
              <p className="text-xs text-muted-foreground mt-1">Schedule a game</p>
            </div>
          </Link>
          <Link href="/teams">
            <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 p-4 rounded-2xl border border-purple-500/10 cursor-pointer" data-testid="card-manage-teams">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-3">
                <Trophy className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-foreground">Manage Teams</h3>
              <p className="text-xs text-muted-foreground mt-1">Rosters & Players</p>
            </div>
          </Link>
        </section>

        {/* Upcoming Matches */}
        {upcomingMatches.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold tracking-tight">Upcoming Matches</h2>
            <div className="space-y-3">
              {upcomingMatches.map((match: any) => (
                <ScoreCard key={match.id} match={match} />
              ))}
            </div>
          </section>
        )}
        
        {/* Empty State */}
        {enrichedMatches.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold">No matches found</h3>
            <p className="text-muted-foreground mt-1">Start by creating teams and scheduling a match.</p>
            <Link href="/teams">
              <Button className="mt-4 rounded-full px-6" data-testid="button-create-team">Create Team</Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
