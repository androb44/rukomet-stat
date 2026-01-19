import { useMatch, useCreateMatchEvent, useDeleteMatchEvent, useUpdateMatchStatus } from "@/hooks/use-matches";
import { usePlayers } from "@/hooks/use-players";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PlayCircle, StopCircle, Trophy, Timer, AlertTriangle, Shield, CheckCircle } from "lucide-react";
import { Link, useRoute } from "wouter";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { EventLog } from "@/components/EventLog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MatchDetails() {
  const [, params] = useRoute("/matches/:id");
  const id = params ? parseInt(params.id) : 0;
  
  const { data: match, isLoading } = useMatch(id);
  const updateStatus = useUpdateMatchStatus();
  const createEvent = useCreateMatchEvent();
  const deleteEvent = useDeleteMatchEvent();
  
  // Game timer logic
  const [seconds, setSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning) {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  // Sync with match state when loaded
  useEffect(() => {
    if (match) {
      setTimerRunning(match.status === 'in_progress');
      // In a real app, we'd sync time with server timestamp
    }
  }, [match?.status]);

  if (isLoading || !match) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStatusChange = (status: 'scheduled' | 'in_progress' | 'finished') => {
    updateStatus.mutate({ id: match.id, status });
    if (status === 'in_progress') setTimerRunning(true);
    else setTimerRunning(false);
  };

  const recordEvent = (type: string, teamId: number, playerId?: number) => {
    createEvent.mutate({
      matchId: match.id,
      teamId,
      playerId,
      type,
      time: seconds,
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="bg-card border-b border-border shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <Link href="/matches" className="text-sm text-muted-foreground hover:text-primary flex items-center">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Link>
            
            <div className="flex items-center gap-2">
              {match.status === 'scheduled' && (
                <Button 
                  onClick={() => handleStatusChange('in_progress')}
                  className="bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg shadow-green-500/20"
                >
                  <PlayCircle className="w-4 h-4 mr-2" /> Start Match
                </Button>
              )}
              {match.status === 'in_progress' && (
                <Button 
                  onClick={() => handleStatusChange('finished')}
                  variant="destructive"
                  className="rounded-xl shadow-lg shadow-red-500/20"
                >
                  <StopCircle className="w-4 h-4 mr-2" /> End Match
                </Button>
              )}
              {match.status === 'finished' && (
                <span className="bg-muted px-3 py-1 rounded-full text-sm font-semibold text-muted-foreground">
                  Match Finished
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 md:gap-12">
            <div className="flex flex-col items-center md:flex-row md:gap-4 flex-1 justify-end">
              <div className="text-right hidden md:block">
                <h3 className="font-bold text-lg leading-tight">{match.homeTeam.name}</h3>
                <span className="text-muted-foreground text-sm">Home</span>
              </div>
              <div 
                className="w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-white font-bold font-display text-xl md:text-2xl shadow-lg"
                style={{ backgroundColor: match.homeTeam.color }}
              >
                {match.homeTeam.shortName}
              </div>
            </div>

            <div className="flex flex-col items-center min-w-[140px]">
              <div className="font-display font-bold text-5xl md:text-6xl tracking-widest flex items-center gap-2">
                <span>{match.homeScore}</span>
                <span className="text-muted-foreground/20 text-4xl">:</span>
                <span>{match.awayScore}</span>
              </div>
              <div className="bg-black/5 dark:bg-white/10 px-3 py-1 rounded-md font-mono font-bold text-lg md:text-xl mt-2 flex items-center gap-2">
                <Timer className={cn("w-4 h-4", timerRunning && "animate-pulse text-red-500")} />
                {formatTime(seconds)}
              </div>
            </div>

            <div className="flex flex-col items-center md:flex-row-reverse md:gap-4 flex-1 justify-start">
              <div className="text-left hidden md:block">
                <h3 className="font-bold text-lg leading-tight">{match.awayTeam.name}</h3>
                <span className="text-muted-foreground text-sm">Away</span>
              </div>
              <div 
                className="w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-white font-bold font-display text-xl md:text-2xl shadow-lg"
                style={{ backgroundColor: match.awayTeam.color }}
              >
                {match.awayTeam.shortName}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {match.status === 'in_progress' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <TeamControls 
                  team={match.homeTeam} 
                  onEvent={(type, playerId) => recordEvent(type, match.homeTeamId, playerId)}
                  disabled={!timerRunning}
                />
                <TeamControls 
                  team={match.awayTeam} 
                  onEvent={(type, playerId) => recordEvent(type, match.awayTeamId, playerId)}
                  disabled={!timerRunning}
                  isAway
                />
              </div>
            ) : (
              <div className="bg-card rounded-2xl p-8 text-center border border-border">
                <Trophy className="w-16 h-16 text-primary mx-auto mb-4 opacity-50" />
                <h2 className="text-2xl font-bold font-display mb-2">
                  {match.status === 'scheduled' ? "Match not started" : "Match Finished"}
                </h2>
                <p className="text-muted-foreground">
                  {match.status === 'scheduled' 
                    ? "Start the match to enable the scorer interface." 
                    : "Final stats are available below."}
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-1 h-[600px]">
            <div className="bg-card rounded-2xl border border-border shadow-sm h-full flex flex-col overflow-hidden">
              <div className="p-4 border-b border-border bg-muted/30">
                <h3 className="font-bold font-display">Match Log</h3>
              </div>
              <div className="flex-1 overflow-hidden p-2">
                <EventLog 
                  events={match.events} 
                  canEdit={match.status === 'in_progress'}
                  onDeleteEvent={id => deleteEvent.mutate({ id, matchId: match.id })}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
      <Navigation />
    </div>
  );
}

function TeamControls({ team, onEvent, disabled, isAway }: { team: any, onEvent: (type: string, playerId?: number) => void, disabled: boolean, isAway?: boolean }) {
  const { data: players } = usePlayers(team.id);
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");

  const handleAction = (type: string) => {
    if (!selectedPlayer && type !== 'timeout') return;
    onEvent(type, type === 'timeout' ? undefined : parseInt(selectedPlayer));
    setSelectedPlayer(""); // Reset selection
  };

  return (
    <div className={cn("space-y-4", isAway && "md:text-right")}>
      <div className="flex items-center gap-3 mb-2" style={{ flexDirection: isAway ? 'row-reverse' : 'row' }}>
        <h3 className="font-bold text-xl">{team.name}</h3>
        <span className="text-muted-foreground text-sm uppercase font-bold tracking-wider">{isAway ? 'Away' : 'Home'}</span>
      </div>

      <div className="bg-card rounded-2xl p-6 border border-border shadow-sm space-y-6">
        <div>
          <Label className="mb-2 block">Select Player</Label>
          <Select value={selectedPlayer} onValueChange={setSelectedPlayer} disabled={disabled}>
            <SelectTrigger className="w-full h-12 text-lg rounded-xl">
              <SelectValue placeholder="Choose player..." />
            </SelectTrigger>
            <SelectContent>
              {players?.map(p => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  #{p.number} {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button 
            onClick={() => handleAction('goal')} 
            disabled={disabled || !selectedPlayer}
            className="h-20 rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20 flex flex-col gap-1"
          >
            <CheckCircle className="w-6 h-6" />
            <span className="font-bold">GOAL</span>
          </Button>
          
          <Button 
            onClick={() => handleAction('save')} 
            disabled={disabled || !selectedPlayer}
            className="h-20 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 flex flex-col gap-1"
          >
            <Shield className="w-6 h-6" />
            <span className="font-bold">SAVE</span>
          </Button>

          <Button 
            onClick={() => handleAction('miss')} 
            disabled={disabled || !selectedPlayer}
            variant="outline"
            className="h-16 rounded-xl flex flex-col gap-1 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-950/30"
          >
            <span className="font-bold">MISS</span>
          </Button>

          <Button 
            onClick={() => handleAction('turnover')} 
            disabled={disabled || !selectedPlayer}
            variant="outline"
            className="h-16 rounded-xl flex flex-col gap-1 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 dark:hover:bg-orange-950/30"
          >
            <span className="font-bold">TURNOVER</span>
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border">
          <Button 
            onClick={() => handleAction('yellow_card')} 
            disabled={disabled || !selectedPlayer}
            variant="ghost"
            className="h-12 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400"
          >
            Yellow
          </Button>
          <Button 
            onClick={() => handleAction('2min')} 
            disabled={disabled || !selectedPlayer}
            variant="ghost"
            className="h-12 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
          >
            2 Min
          </Button>
          <Button 
            onClick={() => handleAction('red_card')} 
            disabled={disabled || !selectedPlayer}
            variant="ghost"
            className="h-12 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
          >
            Red
          </Button>
          <Button 
            onClick={() => handleAction('timeout')} 
            disabled={disabled}
            variant="outline"
            className="h-12 border-dashed border-2"
          >
            Timeout
          </Button>
        </div>
      </div>
    </div>
  );
}
