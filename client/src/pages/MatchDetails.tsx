import { useState } from "react";
import { useParams } from "wouter";
import { useMatch, useUpdateMatchStatus, useCreateMatchEvent } from "@/hooks/use-matches";
import { useTeams } from "@/hooks/use-teams";
import { usePlayers } from "@/hooks/use-players";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Play, Square, Trophy, XCircle, Timer, AlertTriangle, AlertOctagon, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { MatchEvent } from "@shared/schema";

const EVENT_TYPES = [
  { type: 'goal', label: 'Goal', icon: Trophy, color: 'bg-green-500 text-white' },
  { type: 'miss', label: 'Miss', icon: XCircle, color: 'bg-zinc-500 text-white' },
  { type: 'save', label: 'Save', icon: User, color: 'bg-blue-500 text-white' },
  { type: 'turnover', label: 'Turnover', icon: AlertTriangle, color: 'bg-orange-500 text-white' },
  { type: 'yellow_card', label: 'Yellow', icon: Square, color: 'bg-yellow-400 text-black' },
  { type: '2min', label: '2 Min', icon: Timer, color: 'bg-zinc-800 text-white' },
  { type: 'red_card', label: 'Red', icon: Square, color: 'bg-red-600 text-white' },
  { type: 'timeout', label: 'Timeout', icon: AlertOctagon, color: 'bg-zinc-700 text-white' },
] as const;

export default function MatchDetails() {
  const { id } = useParams();
  const matchId = Number(id);
  
  const { data: match, isLoading: matchLoading } = useMatch(matchId);
  const { data: teams } = useTeams();
  const updateStatus = useUpdateMatchStatus();

  // Load players for both teams
  const homeTeamId = match?.homeTeamId;
  const awayTeamId = match?.awayTeamId;
  const { data: homePlayers } = usePlayers(homeTeamId);
  const { data: awayPlayers } = usePlayers(awayTeamId);

  const homeTeam = teams?.find(t => t.id === homeTeamId);
  const awayTeam = teams?.find(t => t.id === awayTeamId);

  if (matchLoading || !match || !homeTeam || !awayTeam) {
    return <div className="p-8 text-center animate-pulse">Loading match details...</div>;
  }

  const isLive = match.status === 'in_progress';

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="Match Scorer" backTo="/matches" />

      {/* Live Scoreboard */}
      <div className="bg-zinc-900 text-white p-6 pb-8 sticky top-[60px] z-30 shadow-2xl">
        <div className="flex justify-between items-center max-w-lg mx-auto">
          {/* Home */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold border-2 border-white/10"
              style={{ backgroundColor: homeTeam.color }}
            >
              {homeTeam.shortName}
            </div>
            <span className="text-4xl font-display font-bold">{match.homeScore ?? 0}</span>
          </div>

          {/* Timer / Status */}
          <div className="flex flex-col items-center gap-2 px-4">
            <div className="text-xs font-mono uppercase tracking-widest opacity-60">
              {match.status.replace('_', ' ')}
            </div>
            {match.status === 'scheduled' && (
              <Button 
                size="sm" 
                className="bg-green-600 hover:bg-green-500 rounded-full"
                onClick={() => updateStatus.mutate({ id: matchId, status: 'in_progress' })}
                disabled={updateStatus.isPending}
              >
                <Play className="w-4 h-4 mr-1" /> Start
              </Button>
            )}
            {match.status === 'in_progress' && (
              <div className="flex flex-col items-center gap-2">
                <span className="text-red-500 font-mono text-xl animate-pulse">LIVE</span>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-7 text-xs border-white/20 text-white hover:bg-white/10"
                  onClick={() => updateStatus.mutate({ id: matchId, status: 'finished' })}
                >
                  End Game
                </Button>
              </div>
            )}
            {match.status === 'finished' && (
              <span className="text-muted-foreground font-bold">FINAL</span>
            )}
          </div>

          {/* Away */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold border-2 border-white/10"
              style={{ backgroundColor: awayTeam.color }}
            >
              {awayTeam.shortName}
            </div>
            <span className="text-4xl font-display font-bold">{match.awayScore ?? 0}</span>
          </div>
        </div>
      </div>

      <main className="max-w-lg mx-auto p-4 space-y-6">
        {/* Scorer Controls - Only visible if live */}
        {isLive && (
          <div className="grid grid-cols-2 gap-4">
            <ScorerDrawer 
              team={homeTeam} 
              players={homePlayers || []} 
              matchId={matchId} 
              side="home"
            />
            <ScorerDrawer 
              team={awayTeam} 
              players={awayPlayers || []} 
              matchId={matchId} 
              side="away"
            />
          </div>
        )}

        {/* Event Log */}
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
          <div className="p-4 border-b border-border/50 bg-muted/30">
            <h3 className="font-bold flex items-center gap-2">
              <Timer className="w-4 h-4" /> Match Events
            </h3>
          </div>
          <div className="divide-y divide-border/50 max-h-[400px] overflow-y-auto">
            {match.events?.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No events recorded yet. Start the match to log actions.
              </div>
            )}
            {match.events?.map((event: any) => {
              const isHome = event.teamId === homeTeam.id;
              const player = isHome 
                ? homePlayers?.find(p => p.id === event.playerId) 
                : awayPlayers?.find(p => p.id === event.playerId);

              return (
                <div key={event.id} className="p-3 flex items-center justify-between hover:bg-muted/20">
                  <div className={cn("flex items-center gap-3", !isHome && "flex-row-reverse text-right")}>
                    <div className={cn(
                      "w-1 h-8 rounded-full",
                      isHome ? "bg-primary" : "bg-destructive" // Simple coloring based on side
                    )} />
                    <div>
                      <div className="font-bold text-sm">
                        {EVENT_TYPES.find(t => t.type === event.type)?.label || event.type}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {player ? `${player.number} • ${player.name}` : 'Team Event'}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                    {Math.floor(event.time / 60)}'
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

function ScorerDrawer({ team, players, matchId, side }: { team: any, players: any[], matchId: number, side: 'home' | 'away' }) {
  const [isOpen, setIsOpen] = useState(false);
  const { mutate } = useCreateMatchEvent();

  const handleEvent = (type: string, playerId?: number) => {
    mutate({
      matchId,
      teamId: team.id,
      playerId, // undefined for team events like timeout
      type,
      time: 0, // In real app, calculate offset from match start
    }, {
      onSuccess: () => setIsOpen(false)
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          className={cn(
            "h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 hover:bg-accent/5",
            side === 'home' ? "border-l-4 border-l-primary" : "border-r-4 border-r-destructive"
          )}
        >
          <span className="font-bold text-lg">{team.shortName} Action</span>
          <span className="text-xs text-muted-foreground">Tap to record</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl h-[85vh] overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full" style={{ backgroundColor: team.color }} />
            {team.name} Event
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* 1. Select Event Type */}
          <div className="grid grid-cols-4 gap-3">
            {EVENT_TYPES.map((evt) => (
              <button
                key={evt.type}
                onClick={() => evt.type === 'timeout' ? handleEvent('timeout') : null} // Timeout has no player
                className={cn(
                  "flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-transform active:scale-95",
                  evt.color,
                  evt.type === 'timeout' ? "col-span-4 h-14 flex-row" : "aspect-square"
                )}
              >
                <evt.icon className="w-6 h-6" />
                <span className="text-xs font-bold">{evt.label}</span>
              </button>
            ))}
          </div>

          <div className="h-px bg-border" />

          {/* 2. Select Player (for events that need it) */}
          <div>
            <h4 className="text-sm font-bold text-muted-foreground mb-3 uppercase tracking-wider">Select Player</h4>
            <div className="grid grid-cols-1 gap-2">
              {players.map(player => (
                <div key={player.id} className="flex gap-2 overflow-x-auto pb-2">
                  {/* Creating a row of event buttons for each player is too dense. 
                      Instead, let's make the player list trigger the event. 
                      Ideally we select Event -> Then Player.
                  */}
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start h-14 gap-4 bg-muted/30 hover:bg-muted rounded-xl"
                  >
                    <span className="w-8 h-8 rounded-full bg-background flex items-center justify-center font-bold text-sm border shadow-sm">
                      {player.number}
                    </span>
                    <div className="text-left flex-1">
                      <div className="font-bold">{player.name}</div>
                      <div className="text-xs text-muted-foreground">{player.position}</div>
                    </div>
                    {/* Quick Actions for Player */}
                    <div className="flex gap-1">
                      <div 
                        onClick={(e) => { e.stopPropagation(); handleEvent('goal', player.id); }}
                        className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white cursor-pointer active:scale-90 transition-transform"
                      >
                        <Trophy className="w-5 h-5" />
                      </div>
                      <div 
                        onClick={(e) => { e.stopPropagation(); handleEvent('miss', player.id); }}
                        className="w-10 h-10 bg-zinc-200 dark:bg-zinc-700 rounded-lg flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
                      >
                        <XCircle className="w-5 h-5" />
                      </div>
                    </div>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
