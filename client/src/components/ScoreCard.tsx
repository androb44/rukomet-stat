import { format } from "date-fns";
import { Trophy, Clock } from "lucide-react";
import { Link } from "wouter";
import type { Match, Team } from "@shared/schema";
import { cn } from "@/lib/utils";

interface ScoreCardProps {
  match: Match & { homeTeam: Team; awayTeam: Team };
  variant?: "compact" | "detailed";
}

export function ScoreCard({ match, variant = "detailed" }: ScoreCardProps) {
  const isLive = match.status === "in_progress";
  const isFinished = match.status === "finished";

  return (
    <Link href={`/matches/${match.id}`} className="block">
      <div className={cn(
        "relative overflow-hidden bg-card rounded-2xl border border-border/50 shadow-sm",
        isLive && "border-accent/40 ring-1 ring-accent/20"
      )}>
        {/* Status Badge */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-muted rounded-b-lg px-3 py-1 border-x border-b border-border/50 z-10">
          <span className={cn(
            "text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5",
            isLive ? "text-accent" : "text-muted-foreground"
          )}>
            {isLive ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                Live
              </>
            ) : isFinished ? (
              "Final"
            ) : (
              format(new Date(match.date), "EEE, MMM d • HH:mm")
            )}
          </span>
        </div>

        <div className="p-5 pt-8">
          <div className="flex items-center justify-between gap-4">
            {/* Home Team */}
            <div className="flex-1 flex flex-col items-center gap-2 text-center">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-md"
                style={{ backgroundColor: match.homeTeam.color }}
              >
                {match.homeTeam.shortName}
              </div>
              <span className="text-sm font-semibold leading-tight line-clamp-2 h-10 flex items-center justify-center w-full">
                {match.homeTeam.name}
              </span>
            </div>

            {/* Score */}
            <div className="flex flex-col items-center shrink-0 min-w-[80px]">
              <div className="flex items-center gap-3 text-3xl font-display font-bold text-foreground">
                <span>{match.homeScore ?? 0}</span>
                <span className="text-muted-foreground/30 text-2xl">:</span>
                <span>{match.awayScore ?? 0}</span>
              </div>
            </div>

            {/* Away Team */}
            <div className="flex-1 flex flex-col items-center gap-2 text-center">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-md"
                style={{ backgroundColor: match.awayTeam.color }}
              >
                {match.awayTeam.shortName}
              </div>
              <span className="text-sm font-semibold leading-tight line-clamp-2 h-10 flex items-center justify-center w-full">
                {match.awayTeam.name}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
