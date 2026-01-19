import { Navigation } from "@/components/Navigation";
import { StatCard } from "@/components/StatCard";
import { useMatches } from "@/hooks/use-matches";
import { useTeams } from "@/hooks/use-teams";
import { Trophy, Calendar, Activity, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { data: matches } = useMatches();
  const { data: teams } = useTeams();

  const activeMatches = matches?.filter(m => m.status === 'in_progress') || [];
  const upcomingMatches = matches?.filter(m => m.status === 'scheduled') || [];
  const finishedMatches = matches?.filter(m => m.status === 'finished') || [];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <header className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <h1 className="text-3xl md:text-5xl font-bold font-display text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground text-lg">Overview of your handball season</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard 
            label="Total Teams" 
            value={teams?.length || 0} 
            icon={Trophy} 
            className="bg-gradient-to-br from-card to-blue-50/50 dark:to-blue-950/20"
          />
          <StatCard 
            label="Live Matches" 
            value={activeMatches.length} 
            icon={Activity} 
            trend={activeMatches.length > 0 ? "Live Now" : undefined}
            trendUp={true}
            className="bg-gradient-to-br from-card to-red-50/50 dark:to-red-950/20"
          />
          <StatCard 
            label="Scheduled" 
            value={upcomingMatches.length} 
            icon={Calendar} 
          />
          <StatCard 
            label="Completed" 
            value={finishedMatches.length} 
            icon={Trophy} 
          />
        </div>

        {/* Live Matches Section */}
        {activeMatches.length > 0 && (
          <section className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold font-display flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                Live Now
              </h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {activeMatches.map(match => (
                <Link key={match.id} href={`/matches/${match.id}`}>
                  <div className="bg-card rounded-2xl p-6 border-2 border-primary/20 hover:border-primary shadow-lg hover:shadow-primary/20 transition-all cursor-pointer relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex justify-between items-center relative z-10">
                      <div className="flex items-center gap-4">
                        <div className="font-bold text-lg">{match.homeTeam.name}</div>
                        <div className="bg-primary/10 text-primary font-bold px-3 py-1 rounded-lg text-xl">{match.homeScore}</div>
                      </div>
                      <div className="text-sm font-mono font-bold text-red-500 animate-pulse">LIVE</div>
                      <div className="flex items-center gap-4">
                        <div className="bg-primary/10 text-primary font-bold px-3 py-1 rounded-lg text-xl">{match.awayScore}</div>
                        <div className="font-bold text-lg">{match.awayTeam.name}</div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold font-display">Upcoming Matches</h2>
              <Link href="/matches">
                <Button variant="ghost" className="text-primary">View All <ArrowRight className="w-4 h-4 ml-1" /></Button>
              </Link>
            </div>
            
            <div className="space-y-4">
              {upcomingMatches.length === 0 ? (
                <div className="bg-card rounded-2xl p-8 text-center border border-dashed border-border">
                  <p className="text-muted-foreground">No upcoming matches scheduled.</p>
                </div>
              ) : (
                upcomingMatches.slice(0, 3).map(match => (
                  <Link key={match.id} href={`/matches/${match.id}`}>
                    <div className="bg-card hover:bg-accent/5 rounded-2xl p-4 border border-border/50 hover:border-primary/50 transition-all flex items-center justify-between group cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-muted flex flex-col items-center justify-center text-xs font-bold text-muted-foreground border border-border">
                          <span className="text-lg text-foreground">{format(new Date(match.date), "d")}</span>
                          <span>{format(new Date(match.date), "MMM")}</span>
                        </div>
                        <div>
                          <div className="font-bold text-lg flex items-center gap-2">
                            {match.homeTeam.name} 
                            <span className="text-muted-foreground text-sm font-normal">vs</span> 
                            {match.awayTeam.name}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary/50" />
                            {format(new Date(match.date), "h:mm a")} • {match.location}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold font-display mb-4">Recent Results</h2>
            <div className="space-y-4">
              {finishedMatches.length === 0 ? (
                <div className="bg-card rounded-2xl p-8 text-center border border-dashed border-border">
                  <p className="text-muted-foreground">No completed matches yet.</p>
                </div>
              ) : (
                finishedMatches.slice(0, 5).map(match => (
                  <Link key={match.id} href={`/matches/${match.id}`}>
                    <div className="bg-card hover:bg-accent/5 p-4 rounded-xl border border-border/50 hover:border-primary/50 transition-all cursor-pointer">
                      <div className="flex justify-between items-center text-sm mb-2 text-muted-foreground">
                        <span>{format(new Date(match.date), "MMM d")}</span>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded text-foreground">Final</span>
                      </div>
                      <div className="flex justify-between items-center font-bold">
                        <span>{match.homeTeam.shortName}</span>
                        <div className="bg-muted px-2 py-1 rounded text-sm min-w-[60px] text-center">
                          {match.homeScore} - {match.awayScore}
                        </div>
                        <span>{match.awayTeam.shortName}</span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
