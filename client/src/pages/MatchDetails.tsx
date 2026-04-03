import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Play,
  Square,
  Trophy,
  Target,
  Shield,
  Zap,
  RotateCcw,
  AlertTriangle,
  Clock,
  ChevronLeft,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Team, Player } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

const EVENT_TYPES = [
  { type: "goal", label: "Goal", icon: Trophy, color: "bg-green-500 hover:bg-green-600 text-white" },
  { type: "shot", label: "Shot", icon: Target, color: "bg-blue-500 hover:bg-blue-600 text-white" },
  { type: "save", label: "Save", icon: Shield, color: "bg-cyan-500 hover:bg-cyan-600 text-white" },
  { type: "assist", label: "Assist", icon: Zap, color: "bg-violet-500 hover:bg-violet-600 text-white" },
  { type: "turnover", label: "Turnover", icon: RotateCcw, color: "bg-orange-500 hover:bg-orange-600 text-white" },
  { type: "block", label: "Block", icon: Shield, color: "bg-teal-500 hover:bg-teal-600 text-white" },
  { type: "yellow_card", label: "Yellow", icon: Square, color: "bg-yellow-400 hover:bg-yellow-500 text-black" },
  { type: "2min", label: "2 Min", icon: Clock, color: "bg-zinc-700 hover:bg-zinc-800 text-white" },
  { type: "red_card", label: "Red Card", icon: Square, color: "bg-red-600 hover:bg-red-700 text-white" },
] as const;

type EventType = typeof EVENT_TYPES[number]["type"];

export default function MatchDetails() {
  const { id } = useParams();
  const matchId = Number(id);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: match, isLoading } = useQuery<any>({
    queryKey: ["/api/matches", matchId],
    queryFn: async () => {
      const res = await fetch(`/api/matches/${matchId}`);
      if (!res.ok) throw new Error("Match not found");
      return res.json();
    },
    refetchInterval: false,
  });

  const { data: homePlayers } = useQuery<Player[]>({
    queryKey: ["/api/players", match?.homeTeamId],
    queryFn: async () => {
      const res = await fetch(`/api/players?teamId=${match?.homeTeamId}`);
      return res.json();
    },
    enabled: !!match?.homeTeamId,
  });

  const { data: awayPlayers } = useQuery<Player[]>({
    queryKey: ["/api/players", match?.awayTeamId],
    queryFn: async () => {
      const res = await fetch(`/api/players?teamId=${match?.awayTeamId}`);
      return res.json();
    },
    enabled: !!match?.awayTeamId,
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch(`/api/matches/${matchId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches", matchId] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
    },
  });

  const createEvent = useMutation({
    mutationFn: async (data: { teamId: number; playerId?: number; type: EventType; time: number }) => {
      const res = await fetch("/api/match-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, matchId }),
      });
      if (!res.ok) throw new Error("Failed to record event");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches", matchId] });
      toast({ title: "Event recorded" });
    },
    onError: () => toast({ title: "Failed to record event", variant: "destructive" }),
  });

  // Timer
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  // Scorer Sheet state
  const [scorerOpen, setScorerOpen] = useState(false);
  const [scorerTeam, setScorerTeam] = useState<"home" | "away" | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);

  const openScorer = (side: "home" | "away") => {
    setScorerTeam(side);
    setSelectedEvent(null);
    setScorerOpen(true);
  };

  const closeScorer = () => {
    setScorerOpen(false);
    setScorerTeam(null);
    setSelectedEvent(null);
  };

  const handleEventType = (type: EventType) => {
    setSelectedEvent(type);
  };

  const handlePlayerSelect = (playerId?: number) => {
    if (!scorerTeam || !selectedEvent || !match) return;
    const teamId = scorerTeam === "home" ? match.homeTeamId : match.awayTeamId;
    createEvent.mutate({ teamId, playerId, type: selectedEvent, time: timerSeconds }, {
      onSuccess: () => closeScorer(),
    });
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  if (isLoading || !match) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading match...</p>
      </div>
    );
  }

  const homeTeam: Team = match.homeTeam;
  const awayTeam: Team = match.awayTeam;
  const isLive = match.status === "in_progress";
  const isFinished = match.status === "finished";

  const scorerPlayers = scorerTeam === "home" ? (homePlayers ?? []) : (awayPlayers ?? []);
  const scorerTeamData = scorerTeam === "home" ? homeTeam : awayTeam;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Match" backTo="/matches" />

      {/* Scoreboard */}
      <div className="bg-zinc-900 text-white px-4 py-6">
        <div className="max-w-lg mx-auto">
          {/* Teams & Score */}
          <div className="flex items-center justify-between gap-2">
            {/* Home */}
            <div className="flex-1 flex flex-col items-center gap-2 text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-sm font-bold border-2 border-white/20"
                style={{ backgroundColor: homeTeam.color }}
              >
                {homeTeam.shortName}
              </div>
              <span className="text-xs font-medium opacity-80 leading-tight">{homeTeam.name}</span>
              <span className="text-5xl font-bold font-mono" data-testid="score-home">{match.homeScore ?? 0}</span>
            </div>

            {/* Status */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <span className="text-2xl font-bold opacity-30">:</span>
              {isLive && (
                <span className="text-xs font-bold text-red-400 uppercase tracking-widest animate-pulse">
                  Live
                </span>
              )}
              {isFinished && (
                <span className="text-xs text-zinc-400 uppercase tracking-wider">Final</span>
              )}
              {match.status === "scheduled" && (
                <span className="text-xs text-zinc-400 uppercase tracking-wider">Soon</span>
              )}
            </div>

            {/* Away */}
            <div className="flex-1 flex flex-col items-center gap-2 text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-sm font-bold border-2 border-white/20"
                style={{ backgroundColor: awayTeam.color }}
              >
                {awayTeam.shortName}
              </div>
              <span className="text-xs font-medium opacity-80 leading-tight">{awayTeam.name}</span>
              <span className="text-5xl font-bold font-mono" data-testid="score-away">{match.awayScore ?? 0}</span>
            </div>
          </div>

          {/* Timer & Controls */}
          <div className="mt-6 flex flex-col items-center gap-3">
            {isLive && (
              <div className="flex items-center gap-3">
                <span className="font-mono text-xl text-white/60" data-testid="text-timer">
                  {formatTime(timerSeconds)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 rounded-full"
                  onClick={() => setTimerRunning((r) => !r)}
                  data-testid="button-timer-toggle"
                >
                  {timerRunning ? "Pause" : "Resume"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white/40 hover:text-white/80 h-8 w-8 p-0 rounded-full"
                  onClick={() => { setTimerSeconds(0); setTimerRunning(false); }}
                  data-testid="button-timer-reset"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            )}

            {match.status === "scheduled" && (
              <Button
                className="bg-green-600 hover:bg-green-500 text-white rounded-full px-8"
                onClick={() => {
                  updateStatus.mutate("in_progress");
                  setTimerRunning(true);
                }}
                disabled={updateStatus.isPending}
                data-testid="button-start-match"
              >
                <Play className="w-4 h-4 mr-2" /> Start Match
              </Button>
            )}

            {isLive && (
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10 rounded-full"
                onClick={() => { updateStatus.mutate("finished"); setTimerRunning(false); }}
                disabled={updateStatus.isPending}
                data-testid="button-end-match"
              >
                End Match
              </Button>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-lg mx-auto p-4 space-y-5 pb-10">
        {/* Action Buttons */}
        {isLive && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-16 rounded-2xl border-2 flex flex-col gap-1 text-sm font-bold"
              style={{ borderColor: homeTeam.color + "60" }}
              onClick={() => openScorer("home")}
              data-testid="button-home-action"
            >
              <div className="w-5 h-5 rounded-full" style={{ backgroundColor: homeTeam.color }} />
              {homeTeam.shortName} Action
            </Button>
            <Button
              variant="outline"
              className="h-16 rounded-2xl border-2 flex flex-col gap-1 text-sm font-bold"
              style={{ borderColor: awayTeam.color + "60" }}
              onClick={() => openScorer("away")}
              data-testid="button-away-action"
            >
              <div className="w-5 h-5 rounded-full" style={{ backgroundColor: awayTeam.color }} />
              {awayTeam.shortName} Action
            </Button>
          </div>
        )}

        {/* Event Log */}
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50 bg-muted/20">
            <h3 className="font-bold text-sm">Match Events</h3>
          </div>
          <div className="divide-y divide-border/30 max-h-96 overflow-y-auto">
            {(!match.events || match.events.length === 0) && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No events recorded yet.
              </div>
            )}
            {match.events?.map((event: any) => {
              const isHome = event.teamId === homeTeam.id;
              const players = isHome ? homePlayers : awayPlayers;
              const player = players?.find((p) => p.id === event.playerId);
              const evtDef = EVENT_TYPES.find((e) => e.type === event.type);

              return (
                <div
                  key={event.id}
                  className={cn(
                    "px-4 py-3 flex items-center gap-3",
                    isHome ? "" : "flex-row-reverse"
                  )}
                  data-testid={`event-row-${event.id}`}
                >
                  <div
                    className="w-1 h-8 rounded-full shrink-0"
                    style={{ backgroundColor: isHome ? homeTeam.color : awayTeam.color }}
                  />
                  <div className={cn("flex-1", !isHome && "text-right")}>
                    <div className="font-semibold text-sm">{evtDef?.label ?? event.type}</div>
                    <div className="text-xs text-muted-foreground">
                      {player ? `#${player.number} ${player.name}` : isHome ? homeTeam.name : awayTeam.name}
                    </div>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded shrink-0">
                    {Math.floor(event.time / 60)}'
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats Summary */}
        {match.events && match.events.length > 0 && (
          <StatsSummary events={match.events} homeTeam={homeTeam} awayTeam={awayTeam} />
        )}
      </main>

      {/* Scorer Sheet */}
      <Sheet open={scorerOpen} onOpenChange={(o) => { if (!o) closeScorer(); }}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto p-0">
          <div className="sticky top-0 bg-card border-b border-border px-4 py-4 flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              {selectedEvent ? (
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-back-event"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span className="font-normal text-sm">Back</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded-full"
                    style={{ backgroundColor: scorerTeamData?.color }}
                  />
                  <span>{scorerTeamData?.name}</span>
                </div>
              )}
            </SheetTitle>
            <button
              onClick={closeScorer}
              className="p-1 rounded-full hover:bg-muted transition-colors"
              data-testid="button-close-scorer"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {!selectedEvent ? (
              <>
                <p className="text-sm text-muted-foreground font-medium">Select event type:</p>
                <div className="grid grid-cols-3 gap-2">
                  {EVENT_TYPES.map((evt) => (
                    <button
                      key={evt.type}
                      onClick={() => handleEventType(evt.type as EventType)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 p-3 rounded-xl font-bold text-xs transition-all active:scale-95",
                        evt.color
                      )}
                      data-testid={`button-event-${evt.type}`}
                    >
                      <evt.icon className="w-5 h-5" />
                      {evt.label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className={cn("px-3 py-1.5 rounded-lg text-xs font-bold", EVENT_TYPES.find(e => e.type === selectedEvent)?.color)}>
                    {EVENT_TYPES.find(e => e.type === selectedEvent)?.label}
                  </span>
                  <span className="text-sm text-muted-foreground">— Select player:</span>
                </div>

                <div className="space-y-2">
                  {scorerPlayers.length === 0 ? (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                      No players in roster.
                      <br />
                      <button
                        onClick={() => handlePlayerSelect(undefined)}
                        className="text-primary font-medium mt-2 hover:underline"
                        data-testid="button-no-player"
                      >
                        Record without player
                      </button>
                    </div>
                  ) : (
                    <>
                      {scorerPlayers
                        .slice()
                        .sort((a, b) => a.number - b.number)
                        .map((player) => (
                          <button
                            key={player.id}
                            onClick={() => handlePlayerSelect(player.id)}
                            disabled={createEvent.isPending}
                            className="w-full flex items-center gap-3 p-3 bg-muted/30 hover:bg-muted rounded-xl transition-colors text-left active:scale-[0.98]"
                            data-testid={`button-player-${player.id}`}
                          >
                            <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center font-bold font-mono text-sm shrink-0">
                              {player.number}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold truncate">{player.name}</div>
                              <div className="text-xs text-muted-foreground">{player.position}</div>
                            </div>
                          </button>
                        ))}

                      <button
                        onClick={() => handlePlayerSelect(undefined)}
                        disabled={createEvent.isPending}
                        className="w-full p-3 text-sm text-muted-foreground hover:text-foreground border border-dashed border-border rounded-xl transition-colors text-center"
                        data-testid="button-team-event"
                      >
                        Record as Team Event (no player)
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function StatsSummary({ events, homeTeam, awayTeam }: { events: any[]; homeTeam: Team; awayTeam: Team }) {
  const stats = ["goal", "shot", "save", "assist", "turnover", "block", "yellow_card", "2min", "red_card"];

  const count = (teamId: number, type: string) =>
    events.filter((e) => e.teamId === teamId && e.type === type).length;

  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50 bg-muted/20">
        <h3 className="font-bold text-sm">Stats</h3>
      </div>
      <div className="divide-y divide-border/20">
        {stats.map((stat) => {
          const homeCount = count(homeTeam.id, stat);
          const awayCount = count(awayTeam.id, stat);
          if (homeCount === 0 && awayCount === 0) return null;
          const label = EVENT_TYPES.find((e) => e.type === stat)?.label ?? stat;
          const total = homeCount + awayCount;

          return (
            <div key={stat} className="px-4 py-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-bold">{homeCount}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="text-sm font-bold">{awayCount}</span>
              </div>
              <div className="flex h-1.5 rounded-full overflow-hidden bg-muted gap-px">
                <div
                  className="rounded-full transition-all"
                  style={{ width: `${(homeCount / total) * 100}%`, backgroundColor: homeTeam.color }}
                />
                <div
                  className="rounded-full transition-all"
                  style={{ width: `${(awayCount / total) * 100}%`, backgroundColor: awayTeam.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
