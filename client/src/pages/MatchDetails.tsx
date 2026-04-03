import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
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
  FileDown,
  ArrowLeftRight,
  CircleDot,
  MinusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Team, Player } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useT, useLanguage } from "@/lib/i18n";

const EVENT_TYPES = [
  { type: "goal",        labelKey: "event.goal",        icon: Trophy,        color: "bg-green-500 hover:bg-green-600 text-white" },
  { type: "shot",        labelKey: "event.shot",        icon: Target,        color: "bg-blue-500 hover:bg-blue-600 text-white" },
  { type: "save",        labelKey: "event.save",        icon: Shield,        color: "bg-cyan-500 hover:bg-cyan-600 text-white" },
  { type: "assist",      labelKey: "event.assist",      icon: Zap,           color: "bg-violet-500 hover:bg-violet-600 text-white" },
  { type: "turnover",    labelKey: "event.turnover",    icon: RotateCcw,     color: "bg-orange-500 hover:bg-orange-600 text-white" },
  { type: "block",       labelKey: "event.block",       icon: Shield,        color: "bg-teal-500 hover:bg-teal-600 text-white" },
  { type: "yellow_card", labelKey: "event.yellow_card", icon: Square,        color: "bg-yellow-400 hover:bg-yellow-500 text-black" },
  { type: "2min",        labelKey: "event.2min",        icon: Clock,         color: "bg-zinc-700 hover:bg-zinc-800 text-white" },
  { type: "red_card",    labelKey: "event.red_card",    icon: Square,        color: "bg-red-600 hover:bg-red-700 text-white" },
] as const;

type EventType = typeof EVENT_TYPES[number]["type"];

const SHOT_ZONES = [
  { id: "left_wing",   labelKey: "zone.left_wing",   abbr: "L.Krilo", a1: -90, a2: -63 },
  { id: "left_9m",     labelKey: "zone.left_9m",     abbr: "L 9m",    a1: -63, a2: -25 },
  { id: "center_9m",   labelKey: "zone.center_9m",   abbr: "C 9m",    a1: -25, a2:  25 },
  { id: "right_9m",    labelKey: "zone.right_9m",    abbr: "D 9m",    a1:  25, a2:  63 },
  { id: "right_wing",  labelKey: "zone.right_wing",  abbr: "D.Krilo", a1:  63, a2:  90 },
  { id: "pivot",       labelKey: "zone.pivot",       abbr: "Pivot",   a1: -40, a2:  40, inner: true },
  { id: "penalty_7m",  labelKey: "zone.penalty_7m",  abbr: "7m",      special: "circle" as const },
];

const ACTION_TYPES = [
  { id: "set_play",     labelKey: "action.set_play" },
  { id: "counter",      labelKey: "action.counter" },
  { id: "fast_break",   labelKey: "action.fast_break" },
  { id: "breakthrough", labelKey: "action.breakthrough" },
  { id: "free_throw",   labelKey: "action.free_throw" },
  { id: "penalty_7m",   labelKey: "action.penalty_7m" },
];

// --- SVG Court helpers ---
const CX = 150, CY = 200, R6 = 60, R9 = 90, R7 = 70, R_BIG = 230;

function toRad(deg: number) { return (deg - 90) * (Math.PI / 180); }
function ptX(r: number, deg: number) { return CX + r * Math.cos(toRad(deg)); }
function ptY(r: number, deg: number) { return CY + r * Math.sin(toRad(deg)); }

function makeSectorPath(r1: number, r2: number, a1: number, a2: number): string {
  const ix1 = ptX(r1, a1), iy1 = ptY(r1, a1);
  const ox1 = ptX(r2, a1), oy1 = ptY(r2, a1);
  const ox2 = ptX(r2, a2), oy2 = ptY(r2, a2);
  const ix2 = ptX(r1, a2), iy2 = ptY(r1, a2);
  const large = (a2 - a1) > 180 ? 1 : 0;
  return [
    `M ${ix1.toFixed(1)},${iy1.toFixed(1)}`,
    `L ${ox1.toFixed(1)},${oy1.toFixed(1)}`,
    `A ${r2},${r2} 0 ${large} 1 ${ox2.toFixed(1)},${oy2.toFixed(1)}`,
    `L ${ix2.toFixed(1)},${iy2.toFixed(1)}`,
    `A ${r1},${r1} 0 ${large} 0 ${ix1.toFixed(1)},${iy1.toFixed(1)} Z`,
  ].join(" ");
}

function labelPos(r1: number, r2: number, a1: number, a2: number) {
  const midA = (a1 + a2) / 2;
  const midR = Math.min((r1 + r2) / 2, r1 + 28);
  return { x: ptX(midR, midA), y: ptY(midR, midA) };
}

const ZONE_PATHS = SHOT_ZONES.filter((z) => !z.special).map((z) => ({
  id: z.id,
  abbr: z.abbr,
  path: z.inner
    ? makeSectorPath(R6, R9, z.a1!, z.a2!)
    : makeSectorPath(R9, R_BIG, z.a1!, z.a2!),
  label: labelPos(
    z.inner ? R6 : R9,
    z.inner ? R9 : R9 + 28,
    z.a1!, z.a2!
  ),
  fill: z.inner ? "#fbbf24" : z.id.includes("wing") ? "#f97316" : "#60a5fa",
  fillSelected: z.inner ? "#d97706" : z.id.includes("wing") ? "#ea580c" : "#2563eb",
}));

const PENALTY_POS = { x: CX, y: CY - R7 };

function HandballCourt({ selected, onSelect }: { selected: string | null; onSelect: (id: string) => void }) {
  return (
    <svg
      viewBox="0 0 300 220"
      className="w-full touch-manipulation"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <rect x="0" y="0" width="300" height="220" fill="#1e293b" rx="12" />
      <rect x="20" y="20" width="260" height="195" fill="#166534" rx="8" />
      <rect x="122" y="190" width="56" height="14" fill="#dc2626" rx="2" />
      <rect x="122" y="184" width="4" height="20" fill="#f87171" />
      <rect x="174" y="184" width="4" height="20" fill="#f87171" />
      <rect x="122" y="184" width="56" height="3" fill="#f87171" />
      <path
        d={`M ${ptX(R6, -90).toFixed(1)},${ptY(R6, -90).toFixed(1)} A ${R6},${R6} 0 0 1 ${ptX(R6, 90).toFixed(1)},${ptY(R6, 90).toFixed(1)}`}
        fill="none" stroke="#4ade80" strokeWidth="1.5"
      />
      <path
        d={`M ${ptX(R9, -90).toFixed(1)},${ptY(R9, -90).toFixed(1)} A ${R9},${R9} 0 0 1 ${ptX(R9, 90).toFixed(1)},${ptY(R9, 90).toFixed(1)}`}
        fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="6,4"
      />
      <line x1={PENALTY_POS.x - 6} y1={PENALTY_POS.y} x2={PENALTY_POS.x + 6} y2={PENALTY_POS.y} stroke="#94a3b8" strokeWidth="1.5" />

      {ZONE_PATHS.map((z) => {
        const isSelected = selected === z.id;
        return (
          <g key={z.id} onClick={() => onSelect(z.id)} style={{ cursor: "pointer" }}>
            <path
              d={z.path}
              fill={isSelected ? z.fillSelected : z.fill}
              fillOpacity={isSelected ? 0.85 : 0.45}
              stroke={isSelected ? "#fff" : "rgba(255,255,255,0.2)"}
              strokeWidth={isSelected ? 1.5 : 0.8}
            />
            <text
              x={z.label.x}
              y={z.label.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="8.5"
              fontWeight={isSelected ? "700" : "600"}
              fill={isSelected ? "#fff" : "rgba(255,255,255,0.85)"}
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              {z.abbr}
            </text>
          </g>
        );
      })}

      <g onClick={() => onSelect("penalty_7m")} style={{ cursor: "pointer" }}>
        <circle
          cx={PENALTY_POS.x} cy={PENALTY_POS.y} r="18"
          fill={selected === "penalty_7m" ? "#dc2626" : "#ef4444"}
          fillOpacity={selected === "penalty_7m" ? 0.9 : 0.5}
          stroke={selected === "penalty_7m" ? "#fff" : "rgba(255,255,255,0.3)"}
          strokeWidth={selected === "penalty_7m" ? 1.5 : 0.8}
        />
        <text
          x={PENALTY_POS.x} y={PENALTY_POS.y}
          textAnchor="middle" dominantBaseline="central"
          fontSize="8" fontWeight="700"
          fill="white"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          7m
        </text>
      </g>

      {selected && (
        <text x="150" y="12" textAnchor="middle" fontSize="9" fill="#4ade80" fontWeight="600">
          ✓ {selected.replace(/_/g, " ")}
        </text>
      )}
    </svg>
  );
}

type ShotOutcome = "saved" | "post" | "missed" | "blocked";

type IconComponent = (props: { className?: string }) => JSX.Element;

const SHOT_OUTCOMES: { id: ShotOutcome; labelKey: string; descKey: string; icon: IconComponent; color: string }[] = [
  { id: "saved",   labelKey: "outcome.saved",   descKey: "outcome.saved.desc",   icon: Shield,        color: "bg-cyan-500 hover:bg-cyan-600 text-white" },
  { id: "post",    labelKey: "outcome.post",     descKey: "outcome.post.desc",    icon: CircleDot,     color: "bg-amber-500 hover:bg-amber-600 text-white" },
  { id: "missed",  labelKey: "outcome.missed",   descKey: "outcome.missed.desc",  icon: MinusCircle,   color: "bg-zinc-500 hover:bg-zinc-600 text-white" },
  { id: "blocked", labelKey: "outcome.blocked",  descKey: "outcome.blocked.desc", icon: ArrowLeftRight, color: "bg-teal-600 hover:bg-teal-700 text-white" },
];

const NEEDS_ZONE = new Set<EventType>(["goal", "shot"]);

export default function MatchDetails() {
  const t = useT();
  const { lang } = useLanguage();
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
    mutationFn: async (data: {
      teamId: number;
      playerId?: number;
      type: EventType;
      time: number;
      shotZone?: string;
      actionType?: string;
    }) => {
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
      toast({ title: t("match.eventRecorded") });
    },
    onError: () => toast({ title: t("match.failEvent"), variant: "destructive" }),
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

  // Sheet state
  const [scorerOpen, setScorerOpen] = useState(false);
  const [scorerTeam, setScorerTeam] = useState<"home" | "away" | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [customAction, setCustomAction] = useState<string>("");
  const [step, setStep] = useState<"event" | "zone_action" | "player" | "outcome" | "second_player">("event");
  const [pendingShooterId, setPendingShooterId] = useState<number | undefined>(undefined);
  const [shotOutcome, setShotOutcome] = useState<ShotOutcome | null>(null);

  const resetSheet = () => {
    setScorerTeam(null);
    setSelectedEvent(null);
    setSelectedZone(null);
    setSelectedAction(null);
    setCustomAction("");
    setPendingShooterId(undefined);
    setShotOutcome(null);
    setStep("event");
  };

  const openScorer = (side: "home" | "away") => {
    resetSheet();
    setScorerTeam(side);
    setScorerOpen(true);
  };

  const closeScorer = () => {
    setScorerOpen(false);
    resetSheet();
  };

  const handleEventType = (type: EventType) => {
    setSelectedEvent(type);
    if (NEEDS_ZONE.has(type)) {
      setStep("zone_action");
    } else {
      setStep("player");
    }
  };

  const handleBack = () => {
    if (step === "second_player") {
      setStep("outcome");
      setShotOutcome(null);
    } else if (step === "outcome") {
      setStep("player");
      setPendingShooterId(undefined);
    } else if (step === "player" && NEEDS_ZONE.has(selectedEvent!)) {
      setStep("zone_action");
    } else if (step === "zone_action" || step === "player") {
      setStep("event");
      setSelectedEvent(null);
      setSelectedZone(null);
      setSelectedAction(null);
    }
  };

  const handlePlayerSelect = (playerId?: number) => {
    if (!scorerTeam || !selectedEvent || !match) return;

    // For shots: go to outcome step first
    if (selectedEvent === "shot") {
      setPendingShooterId(playerId);
      setStep("outcome");
      return;
    }

    // All other events: submit immediately
    const teamId = scorerTeam === "home" ? match.homeTeamId : match.awayTeamId;
    createEvent.mutate(
      { teamId, playerId, type: selectedEvent, time: timerSeconds, shotZone: selectedZone ?? undefined, actionType: selectedAction || customAction || undefined },
      { onSuccess: () => closeScorer() }
    );
  };

  const handleOutcomeSelect = (outcome: ShotOutcome) => {
    if (!scorerTeam || !match) return;
    setShotOutcome(outcome);

    if (outcome === "saved" || outcome === "blocked") {
      // First create the shot event, then pick the defending player
      const attackingTeamId = scorerTeam === "home" ? match.homeTeamId : match.awayTeamId;
      createEvent.mutate({
        teamId: attackingTeamId,
        playerId: pendingShooterId,
        type: "shot",
        time: timerSeconds,
        shotZone: selectedZone ?? undefined,
        actionType: selectedAction || customAction || undefined,
      });
      setStep("second_player");
    } else {
      // post/missed — just record the shot
      const teamId = scorerTeam === "home" ? match.homeTeamId : match.awayTeamId;
      createEvent.mutate(
        { teamId, playerId: pendingShooterId, type: "shot", time: timerSeconds, shotZone: selectedZone ?? undefined, actionType: selectedAction || customAction || undefined },
        { onSuccess: () => closeScorer() }
      );
    }
  };

  const handleSecondPlayerSelect = (secondPlayerId?: number) => {
    if (!scorerTeam || !match || !shotOutcome) return;
    const defendingTeamId = scorerTeam === "home" ? match.awayTeamId : match.homeTeamId;
    const eventType = shotOutcome === "saved" ? "save" : "block";
    createEvent.mutate(
      { teamId: defendingTeamId, playerId: secondPlayerId, type: eventType as EventType, time: timerSeconds },
      { onSuccess: () => closeScorer() }
    );
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  if (isLoading || !match) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  const homeTeam: Team = match.homeTeam;
  const awayTeam: Team = match.awayTeam;
  const isLive = match.status === "in_progress";
  const isFinished = match.status === "finished";

  const scorerPlayers = scorerTeam === "home" ? (homePlayers ?? []) : (awayPlayers ?? []);
  const scorerTeamData = scorerTeam === "home" ? homeTeam : awayTeam;
  // Opposing team's data (for saves/blocks)
  const opposingPlayers = scorerTeam === "home" ? (awayPlayers ?? []) : (homePlayers ?? []);
  const opposingTeamData = scorerTeam === "home" ? awayTeam : homeTeam;

  const selectedEventDef = EVENT_TYPES.find((e) => e.type === selectedEvent);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={t("match.title")}
        backTo="/matches"
        action={
          <a
            href={`/api/matches/${matchId}/pdf?lang=${lang}`}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="button-export-pdf"
            className="inline-flex items-center gap-1.5 rounded-full border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <FileDown className="w-4 h-4" />
            PDF
          </a>
        }
      />

      {/* Scoreboard */}
      <div className="bg-zinc-900 text-white px-4 py-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between gap-2">
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

            <div className="flex flex-col items-center gap-2 shrink-0">
              <span className="text-2xl font-bold opacity-30">:</span>
              {isLive && (
                <span className="text-xs font-bold text-red-400 uppercase tracking-widest animate-pulse">{t("match.live")}</span>
              )}
              {isFinished && (
                <span className="text-xs text-zinc-400 uppercase tracking-wider">{t("match.final")}</span>
              )}
              {match.status === "scheduled" && (
                <span className="text-xs text-zinc-400 uppercase tracking-wider">{t("match.soon")}</span>
              )}
            </div>

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
                  {timerRunning ? t("match.pause") : t("match.resume")}
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
                onClick={() => { updateStatus.mutate("in_progress"); setTimerRunning(true); }}
                disabled={updateStatus.isPending}
                data-testid="button-start-match"
              >
                <Play className="w-4 h-4 mr-2" /> {t("match.startMatch")}
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
                {t("match.endMatch")}
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
              {homeTeam.shortName} {t("match.action")}
            </Button>
            <Button
              variant="outline"
              className="h-16 rounded-2xl border-2 flex flex-col gap-1 text-sm font-bold"
              style={{ borderColor: awayTeam.color + "60" }}
              onClick={() => openScorer("away")}
              data-testid="button-away-action"
            >
              <div className="w-5 h-5 rounded-full" style={{ backgroundColor: awayTeam.color }} />
              {awayTeam.shortName} {t("match.action")}
            </Button>
          </div>
        )}

        {/* Event Log */}
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50 bg-muted/20">
            <h3 className="font-bold text-sm">{t("match.events")}</h3>
          </div>
          <div className="divide-y divide-border/30 max-h-96 overflow-y-auto">
            {(!match.events || match.events.length === 0) && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                {t("match.noEvents")}
              </div>
            )}
            {match.events?.map((event: any) => {
              const isHome = event.teamId === homeTeam.id;
              const players = isHome ? homePlayers : awayPlayers;
              const player = players?.find((p) => p.id === event.playerId);
              const evtDef = EVENT_TYPES.find((e) => e.type === event.type);
              const zoneLabel = SHOT_ZONES.find((z) => z.id === event.shotZone);
              const actionLabel = ACTION_TYPES.find((a) => a.id === event.actionType);

              return (
                <div
                  key={event.id}
                  className={cn("px-4 py-3 flex items-center gap-3", isHome ? "" : "flex-row-reverse")}
                  data-testid={`event-row-${event.id}`}
                >
                  <div
                    className="w-1 h-8 rounded-full shrink-0"
                    style={{ backgroundColor: isHome ? homeTeam.color : awayTeam.color }}
                  />
                  <div className={cn("flex-1 min-w-0", !isHome && "text-right")}>
                    <div className="font-semibold text-sm">
                      {evtDef ? t(evtDef.labelKey) : event.type}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {player ? `#${player.number} ${player.name}` : isHome ? homeTeam.name : awayTeam.name}
                    </div>
                    {(event.shotZone || event.actionType) && (
                      <div className="text-xs text-muted-foreground/70 mt-0.5">
                        {[
                          zoneLabel ? t(zoneLabel.labelKey) : null,
                          actionLabel ? t(actionLabel.labelKey) : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    )}
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

        {/* Export PDF */}
        <a
          href={`/api/matches/${matchId}/pdf?lang=${lang}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border-2 border-dashed border-primary/30 text-primary font-semibold text-sm hover:bg-primary/5 transition-colors active:scale-[0.98]"
          data-testid="button-export-pdf-bottom"
        >
          <FileDown className="w-5 h-5" />
          {t("match.exportPdf")}
        </a>
      </main>

      {/* Action Sheet */}
      <Sheet open={scorerOpen} onOpenChange={(o) => { if (!o) closeScorer(); }}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[92vh] overflow-y-auto p-0">
          {/* Header */}
          <div className="sticky top-0 bg-card border-b border-border px-4 py-3.5 flex items-center justify-between z-10">
            <SheetTitle className="flex items-center gap-2">
              {step !== "event" ? (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-back-event"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span className="font-normal text-sm">{t("match.back")}</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full" style={{ backgroundColor: scorerTeamData?.color }} />
                  <span className="font-semibold">{scorerTeamData?.name}</span>
                </div>
              )}
            </SheetTitle>

            {selectedEventDef && (
              <span className={cn("px-2.5 py-1 rounded-lg text-xs font-bold", selectedEventDef.color)}>
                {t(selectedEventDef.labelKey)}
              </span>
            )}

            <button
              onClick={closeScorer}
              className="p-1 rounded-full hover:bg-muted transition-colors"
              data-testid="button-close-scorer"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Step 1: Event Type */}
            {step === "event" && (
              <>
                <p className="text-sm text-muted-foreground font-medium">{t("match.selectEvent")}</p>
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
                      {t(evt.labelKey)}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Step 2: Zone + Action */}
            {step === "zone_action" && (
              <>
                <div>
                  <p className="text-sm text-muted-foreground font-medium mb-2">
                    {t("match.selectZone")}
                  </p>
                  <HandballCourt selected={selectedZone} onSelect={(id) => setSelectedZone(id === selectedZone ? null : id)} />
                  {!selectedZone && (
                    <p className="text-xs text-center text-muted-foreground mt-1">{t("match.tapZone")}</p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground font-medium mb-2">{t("match.selectAction")}</p>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {ACTION_TYPES.map((act) => (
                      <button
                        key={act.id}
                        onClick={() => {
                          if (selectedAction === act.id) { setSelectedAction(null); }
                          else { setSelectedAction(act.id); setCustomAction(""); }
                        }}
                        className={cn(
                          "p-2.5 rounded-xl text-xs font-semibold text-left border transition-all",
                          selectedAction === act.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/30 border-border hover:bg-muted text-foreground"
                        )}
                        data-testid={`button-action-${act.id}`}
                      >
                        {t(act.labelKey)}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={customAction}
                    onChange={(e) => { setCustomAction(e.target.value); setSelectedAction(null); }}
                    placeholder={t("match.customAction")}
                    className="w-full px-3 py-2 rounded-xl text-sm border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    data-testid="input-custom-action"
                  />
                </div>

                {/* Next button — always enabled: zone is optional */}
                <Button
                  className="w-full rounded-xl"
                  onClick={() => setStep("player")}
                  data-testid="button-next-to-player"
                >
                  {t("match.selectPlayer")}
                </Button>
              </>
            )}

            {/* Step 3: Player (shooter) */}
            {step === "player" && (
              <>
                {scorerPlayers.length === 0 ? (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    {t("match.noPlayers")}
                    <br />
                    <button
                      onClick={() => handlePlayerSelect(undefined)}
                      className="text-primary font-medium mt-2 hover:underline"
                      data-testid="button-no-player"
                    >
                      {t("match.recordNoPlayer")}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
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
                      {t("match.teamEvent")}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Step 4: Shot Outcome */}
            {step === "outcome" && (
              <>
                <p className="text-sm text-muted-foreground font-medium">{t("outcome.title")}:</p>
                <div className="grid grid-cols-2 gap-3">
                  {SHOT_OUTCOMES.map((oc) => (
                    <button
                      key={oc.id}
                      onClick={() => handleOutcomeSelect(oc.id)}
                      disabled={createEvent.isPending}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl font-bold text-sm transition-all active:scale-95",
                        oc.color
                      )}
                      data-testid={`button-outcome-${oc.id}`}
                    >
                      <oc.icon className="w-6 h-6" />
                      <span className="text-center leading-tight">{t(oc.labelKey)}</span>
                      <span className="text-[10px] font-normal opacity-80 text-center leading-tight">{t(oc.descKey)}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Step 5: Pick defending player (GK save or blocker) */}
            {step === "second_player" && (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-4 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: opposingTeamData?.color }}
                  />
                  <p className="text-sm font-semibold text-foreground">
                    {opposingTeamData?.name}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {shotOutcome === "saved" ? t("outcome.selectGk") : t("outcome.selectBlocker")}
                </p>

                <div className="space-y-2 mt-2">
                  {opposingPlayers
                    .slice()
                    .sort((a, b) => {
                      // GK sort first when picking saves
                      if (shotOutcome === "saved") {
                        if (a.position === "GK" && b.position !== "GK") return -1;
                        if (b.position === "GK" && a.position !== "GK") return 1;
                      }
                      return a.number - b.number;
                    })
                    .map((player) => (
                      <button
                        key={player.id}
                        onClick={() => handleSecondPlayerSelect(player.id)}
                        disabled={createEvent.isPending}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left active:scale-[0.98]",
                          player.position === "GK" && shotOutcome === "saved"
                            ? "bg-cyan-500/15 border border-cyan-500/40 hover:bg-cyan-500/25"
                            : "bg-muted/30 hover:bg-muted"
                        )}
                        data-testid={`button-defender-${player.id}`}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center font-bold font-mono text-sm shrink-0 border",
                          player.position === "GK" && shotOutcome === "saved"
                            ? "bg-cyan-500 text-white border-cyan-400"
                            : "bg-card border-border"
                        )}>
                          {player.number}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{player.name}</div>
                          <div className="text-xs text-muted-foreground">{player.position}</div>
                        </div>
                        {player.position === "GK" && shotOutcome === "saved" && (
                          <Shield className="w-4 h-4 text-cyan-500 shrink-0" />
                        )}
                      </button>
                    ))}

                  <button
                    onClick={() => handleSecondPlayerSelect(undefined)}
                    disabled={createEvent.isPending}
                    className="w-full p-3 text-sm text-muted-foreground hover:text-foreground border border-dashed border-border rounded-xl transition-colors text-center"
                    data-testid="button-skip-defender"
                  >
                    {t("outcome.skipDefender")}
                  </button>
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
  const t = useT();
  const stats = ["goal", "shot", "save", "assist", "turnover", "block", "yellow_card", "2min", "red_card"];
  const count = (teamId: number, type: string) =>
    events.filter((e) => e.teamId === teamId && e.type === type).length;

  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50 bg-muted/20">
        <h3 className="font-bold text-sm">{t("match.stats")}</h3>
      </div>
      <div className="divide-y divide-border/20">
        {stats.map((stat) => {
          const homeCount = count(homeTeam.id, stat);
          const awayCount = count(awayTeam.id, stat);
          if (homeCount === 0 && awayCount === 0) return null;
          const evtDef = EVENT_TYPES.find((e) => e.type === stat);
          const label = evtDef ? t(evtDef.labelKey) : stat;
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
