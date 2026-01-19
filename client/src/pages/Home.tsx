import { useMatches } from "@/hooks/use-matches";
import { useTeams } from "@/hooks/use-teams";
import { ScoreCard } from "@/components/ScoreCard";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, Trophy, Activity, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function Home() {
  const { data: matches, isLoading: matchesLoading } = useMatches();
  const { data: teams, isLoading: teamsLoading } = useTeams();

  // Combine data manually since API is split
  const enrichedMatches = matches?.map(match => ({
    ...match,
    homeTeam: teams?.find(t => t.id === match.homeTeamId)!,
    awayTeam: teams?.find(t => t.id === match.awayTeamId)!,
  })).filter(m => m.homeTeam && m.awayTeam) ?? [];

  const liveMatches = enrichedMatches.filter(m => m.status === 'in_progress');
  const recentMatches = enrichedMatches.filter(m => m.status === 'finished').slice(0, 3);
  const upcomingMatches = enrichedMatches.filter(m => m.status === 'scheduled').slice(0, 3);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (matchesLoading || teamsLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <PageHeader title="Handball Stats" subtitle="Live updates & results" />
        <div className="p-4 space-y-4">
          <div className="h-40 bg-muted/50 rounded-2xl animate-pulse" />
          <div className="h-40 bg-muted/50 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader 
        title="Dashboard" 
        subtitle="Welcome back, Coach"
        action={
          <Link href="/matches">
            <Button size="sm" variant="outline" className="rounded-full h-8">
              View All
            </Button>
          </Link>
        }
      />

      <motion.main 
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-4xl mx-auto p-4 space-y-8"
      >
        {/* Live Matches Section */}
        {liveMatches.length > 0 && (
          <motion.section variants={item} className="space-y-4">
            <div className="flex items-center gap-2 text-accent">
              <Activity className="w-5 h-5 animate-pulse" />
              <h2 className="text-lg font-bold tracking-tight text-foreground">Live Now</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {liveMatches.map(match => (
                <ScoreCard key={match.id} match={match} />
              ))}
            </div>
          </motion.section>
        )}

        {/* Quick Actions */}
        <motion.section variants={item} className="grid grid-cols-2 gap-3">
          <Link href="/matches">
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-4 rounded-2xl border border-primary/10 active:scale-95 transition-transform cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-3">
                <Plus className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-foreground">New Match</h3>
              <p className="text-xs text-muted-foreground mt-1">Schedule a game</p>
            </div>
          </Link>
          <Link href="/teams">
            <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 p-4 rounded-2xl border border-purple-500/10 active:scale-95 transition-transform cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-600 mb-3">
                <Trophy className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-foreground">Manage Teams</h3>
              <p className="text-xs text-muted-foreground mt-1">Rosters & Players</p>
            </div>
          </Link>
        </motion.section>

        {/* Recent Matches */}
        {recentMatches.length > 0 && (
          <motion.section variants={item} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight">Recent Results</h2>
            </div>
            <div className="space-y-3">
              {recentMatches.map(match => (
                <ScoreCard key={match.id} match={match} />
              ))}
            </div>
          </motion.section>
        )}
        
        {/* Empty State */}
        {enrichedMatches.length === 0 && (
          <motion.div variants={item} className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold">No matches found</h3>
            <p className="text-muted-foreground mt-1">Start by creating teams and scheduling a match.</p>
            <Link href="/teams">
              <Button className="mt-4 rounded-full px-6">Create Team</Button>
            </Link>
          </motion.div>
        )}
      </motion.main>
    </div>
  );
}
