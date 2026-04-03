import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { Plus, Trophy, Calendar, Activity, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

export default function Home() {
  const t = useT();
  const { data: matches, isLoading: matchesLoading } = useQuery<any[]>({ queryKey: ["/api/matches"] });
  const { data: teams, isLoading: teamsLoading } = useQuery<any[]>({ queryKey: ["/api/teams"] });

  const loading = matchesLoading || teamsLoading;

  const liveMatches = matches?.filter((m) => m.status === "in_progress") ?? [];
  const upcomingMatches = matches?.filter((m) => m.status === "scheduled").slice(0, 3) ?? [];
  const recentMatches = matches?.filter((m) => m.status === "finished").slice(0, 3) ?? [];

  return (
    <div className="min-h-screen bg-background pb-28">
      <PageHeader title={t("home.title")} subtitle={t("home.subtitle")} />

      <main className="max-w-lg mx-auto p-4 space-y-6">
        {loading ? (
          <div className="space-y-3">
            <div className="h-32 bg-muted/50 rounded-2xl animate-pulse" />
            <div className="h-20 bg-muted/50 rounded-2xl animate-pulse" />
            <div className="h-20 bg-muted/50 rounded-2xl animate-pulse" />
          </div>
        ) : (
          <>
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Link href="/matches">
                <div
                  className="bg-primary/10 border border-primary/20 rounded-2xl p-4 cursor-pointer hover:bg-primary/15 transition-colors"
                  data-testid="card-new-match"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-3">
                    <Plus className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm">{t("home.newMatch")}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("home.scheduleGame")}</p>
                </div>
              </Link>
              <Link href="/teams">
                <div
                  className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 cursor-pointer hover:bg-purple-500/15 transition-colors"
                  data-testid="card-manage-teams"
                >
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-600 mb-3">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm">{t("home.manageTeams")}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("home.rostersPlayers")}</p>
                </div>
              </Link>
            </div>

            {liveMatches.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <h2 className="font-bold">{t("home.liveNow")}</h2>
                </div>
                {liveMatches.map((match: any) => <MatchRow key={match.id} match={match} />)}
              </section>
            )}

            {upcomingMatches.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    {t("home.upcoming")}
                  </h2>
                  <Link href="/matches">
                    <span className="text-xs text-primary font-medium">{t("home.seeAll")}</span>
                  </Link>
                </div>
                {upcomingMatches.map((match: any) => <MatchRow key={match.id} match={match} />)}
              </section>
            )}

            {recentMatches.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-bold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                  {t("home.recentResults")}
                </h2>
                {recentMatches.map((match: any) => <MatchRow key={match.id} match={match} />)}
              </section>
            )}

            {matches?.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-bold">{t("home.welcome")}</h3>
                <p className="text-muted-foreground mt-1 text-sm">{t("home.welcomeDesc")}</p>
                <Link href="/teams">
                  <Button className="mt-4 rounded-full px-6" data-testid="button-create-team">
                    {t("home.createTeam")}
                  </Button>
                </Link>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function MatchRow({ match }: { match: any }) {
  const isLive = match.status === "in_progress";
  const isFinished = match.status === "finished";
  const t = useT();

  return (
    <Link href={`/matches/${match.id}`}>
      <div
        className={cn(
          "bg-card border rounded-2xl p-4 cursor-pointer hover:bg-muted/30 transition-colors",
          isLive ? "border-red-500/30 ring-1 ring-red-500/20" : "border-border/50"
        )}
        data-testid={`match-row-${match.id}`}
      >
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ backgroundColor: match.homeTeam?.color ?? "#888" }}
            >
              {match.homeTeam?.shortName ?? "?"}
            </div>
            <span className="font-semibold text-sm truncate">{match.homeTeam?.name ?? "Home"}</span>
          </div>

          <div className="flex flex-col items-center shrink-0 min-w-[64px] text-center">
            {isLive ? (
              <>
                <div className="text-lg font-bold font-mono">{match.homeScore ?? 0} — {match.awayScore ?? 0}</div>
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">{t("match.live")}</span>
              </>
            ) : isFinished ? (
              <>
                <div className="text-lg font-bold font-mono">{match.homeScore ?? 0} — {match.awayScore ?? 0}</div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("match.final")}</span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground font-medium">
                {format(new Date(match.date), "d MMM HH:mm")}
              </span>
            )}
          </div>

          <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
            <span className="font-semibold text-sm truncate text-right">{match.awayTeam?.name ?? "Away"}</span>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ backgroundColor: match.awayTeam?.color ?? "#888" }}
            >
              {match.awayTeam?.shortName ?? "?"}
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </div>
      </div>
    </Link>
  );
}
