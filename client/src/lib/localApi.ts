// Client-side mock API used when the app is deployed without a backend
// (e.g. Cloudflare Pages with static assets only). Persists data in
// localStorage so reviewers can exercise the full UI on a preview URL.

import { z } from "zod";
import {
  insertTeamSchema,
  insertPlayerSchema,
  insertMatchSchema,
  insertMatchEventSchema,
  type Team,
  type Player,
  type Match,
  type MatchEvent,
} from "@shared/schema";

type Stored = {
  teams: Team[];
  players: Player[];
  matches: (Omit<Match, "date"> & { date: string })[];
  events: MatchEvent[];
  nextId: { team: number; player: number; match: number; event: number };
};

const STORAGE_KEY = "rukomet-stat-local-db-v1";

function emptyStore(): Stored {
  return {
    teams: [],
    players: [],
    matches: [],
    events: [],
    nextId: { team: 1, player: 1, match: 1, event: 1 },
  };
}

function load(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed(emptyStore());
    return JSON.parse(raw) as Stored;
  } catch {
    return seed(emptyStore());
  }
}

function save(s: Stored): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // quota exceeded or storage disabled — best effort
  }
}

function seed(s: Stored): Stored {
  const denmark: Team = { id: s.nextId.team++, name: "Denmark", shortName: "DEN", color: "#C60C30" };
  const france: Team = { id: s.nextId.team++, name: "France", shortName: "FRA", color: "#002395" };
  s.teams.push(denmark, france);

  s.players.push(
    { id: s.nextId.player++, teamId: denmark.id, name: "Niklas Landin", number: 1, position: "GK" },
    { id: s.nextId.player++, teamId: denmark.id, name: "Mikkel Hansen", number: 24, position: "LB" },
    { id: s.nextId.player++, teamId: france.id, name: "Nikola Karabatic", number: 13, position: "CB" },
    { id: s.nextId.player++, teamId: france.id, name: "Dika Mem", number: 10, position: "RB" },
  );

  s.matches.push({
    id: s.nextId.match++,
    homeTeamId: denmark.id,
    awayTeamId: france.id,
    date: new Date().toISOString(),
    location: "Jyske Bank Boxen",
    homeScore: 0,
    awayScore: 0,
    status: "scheduled",
  });

  save(s);
  return s;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function noContent(): Response {
  return new Response(null, { status: 204 });
}

function notFound(message = "Not found"): Response {
  return json({ message }, 404);
}

function fromZodError(err: z.ZodError): Response {
  return json({ message: err.errors[0].message, field: err.errors[0].path.join(".") }, 400);
}

function hydrateMatch(s: Stored, m: Stored["matches"][number]): Match & { homeTeam?: Team; awayTeam?: Team } {
  return {
    ...m,
    date: new Date(m.date),
    homeTeam: s.teams.find((t) => t.id === m.homeTeamId),
    awayTeam: s.teams.find((t) => t.id === m.awayTeamId),
  } as Match & { homeTeam?: Team; awayTeam?: Team };
}

export async function handleLocalRequest(
  method: string,
  url: URL,
  body: unknown,
): Promise<Response | null> {
  const path = url.pathname;
  const m = method.toUpperCase();

  // ---- Teams ----
  if (path === "/api/teams" && m === "GET") {
    return json(load().teams);
  }
  if (path === "/api/teams" && m === "POST") {
    const s = load();
    try {
      const input = insertTeamSchema.parse(body);
      const team: Team = { id: s.nextId.team++, color: "#000000", ...input };
      s.teams.push(team);
      save(s);
      return json(team, 201);
    } catch (err) {
      if (err instanceof z.ZodError) return fromZodError(err);
      throw err;
    }
  }
  const teamGet = path.match(/^\/api\/teams\/(\d+)$/);
  if (teamGet && m === "GET") {
    const s = load();
    const t = s.teams.find((t) => t.id === Number(teamGet[1]));
    return t ? json(t) : notFound("Team not found");
  }

  // ---- Players ----
  if (path === "/api/players" && m === "GET") {
    const s = load();
    const teamId = url.searchParams.get("teamId");
    const list = teamId ? s.players.filter((p) => p.teamId === Number(teamId)) : s.players;
    return json(list);
  }
  if (path === "/api/players" && m === "POST") {
    const s = load();
    try {
      const input = insertPlayerSchema.parse(body);
      const player: Player = { id: s.nextId.player++, ...input };
      s.players.push(player);
      save(s);
      return json(player, 201);
    } catch (err) {
      if (err instanceof z.ZodError) return fromZodError(err);
      throw err;
    }
  }
  const playerDel = path.match(/^\/api\/players\/(\d+)$/);
  if (playerDel && m === "DELETE") {
    const s = load();
    s.players = s.players.filter((p) => p.id !== Number(playerDel[1]));
    save(s);
    return noContent();
  }

  // ---- Matches ----
  if (path === "/api/matches" && m === "GET") {
    const s = load();
    const list = s.matches
      .slice()
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))
      .map((row) => hydrateMatch(s, row));
    return json(list);
  }
  if (path === "/api/matches" && m === "POST") {
    const s = load();
    try {
      const raw = body as Record<string, unknown> | null;
      const coerced = { ...(raw ?? {}), date: raw?.date ? new Date(raw.date as string) : undefined };
      const input = insertMatchSchema.parse(coerced);
      const match: Stored["matches"][number] = {
        id: s.nextId.match++,
        homeTeamId: input.homeTeamId,
        awayTeamId: input.awayTeamId,
        date: input.date.toISOString(),
        location: input.location,
        homeScore: 0,
        awayScore: 0,
        status: input.status ?? "scheduled",
      };
      s.matches.push(match);
      save(s);
      return json(hydrateMatch(s, match), 201);
    } catch (err) {
      if (err instanceof z.ZodError) return fromZodError(err);
      throw err;
    }
  }
  const matchGet = path.match(/^\/api\/matches\/(\d+)$/);
  if (matchGet && m === "GET") {
    const s = load();
    const id = Number(matchGet[1]);
    const row = s.matches.find((x) => x.id === id);
    if (!row) return notFound("Match not found");
    const events = s.events
      .filter((e) => e.matchId === id)
      .sort((a, b) => b.time - a.time);
    return json({ ...hydrateMatch(s, row), events });
  }
  const matchStatus = path.match(/^\/api\/matches\/(\d+)\/status$/);
  if (matchStatus && m === "PATCH") {
    const s = load();
    const id = Number(matchStatus[1]);
    const row = s.matches.find((x) => x.id === id);
    if (!row) return notFound("Match not found");
    try {
      const input = z.object({ status: z.enum(["scheduled", "in_progress", "finished"]) }).parse(body);
      row.status = input.status;
      save(s);
      return json(hydrateMatch(s, row));
    } catch (err) {
      if (err instanceof z.ZodError) return fromZodError(err);
      throw err;
    }
  }

  // ---- Match events ----
  if (path === "/api/match-events" && m === "POST") {
    const s = load();
    try {
      const input = insertMatchEventSchema.parse(body);
      const event: MatchEvent = {
        id: s.nextId.event++,
        matchId: input.matchId,
        teamId: input.teamId,
        playerId: input.playerId ?? null,
        type: input.type,
        time: input.time,
        shotZone: input.shotZone ?? null,
        actionType: input.actionType ?? null,
      };
      s.events.push(event);

      if (event.type === "goal") {
        const match = s.matches.find((x) => x.id === event.matchId);
        if (match) {
          if (match.homeTeamId === event.teamId) match.homeScore = (match.homeScore ?? 0) + 1;
          else if (match.awayTeamId === event.teamId) match.awayScore = (match.awayScore ?? 0) + 1;
        }
      }

      save(s);
      return json(event, 201);
    } catch (err) {
      if (err instanceof z.ZodError) return fromZodError(err);
      throw err;
    }
  }
  const eventDel = path.match(/^\/api\/match-events\/(\d+)$/);
  if (eventDel && m === "DELETE") {
    const s = load();
    s.events = s.events.filter((e) => e.id !== Number(eventDel[1]));
    save(s);
    return noContent();
  }

  return null;
}

export function isApiPath(path: string): boolean {
  return path.startsWith("/api/");
}
