import { db } from "./db";
import {
  teams, players, matches, matchEvents,
  type Team, type InsertTeam,
  type Player, type InsertPlayer,
  type Match, type InsertMatch,
  type MatchEvent, type InsertMatchEvent
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Teams
  getTeams(): Promise<Team[]>;
  getTeam(id: number): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;

  // Players
  getPlayers(teamId?: number): Promise<Player[]>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  deletePlayer(id: number): Promise<void>;

  // Matches
  getMatches(): Promise<Match[]>;
  getMatch(id: number): Promise<Match | undefined>;
  createMatch(match: InsertMatch): Promise<Match>;
  updateMatchStatus(id: number, status: string): Promise<Match>;
  updateMatchScore(id: number, homeScore: number, awayScore: number): Promise<void>;

  // Match Events
  createMatchEvent(event: InsertMatchEvent): Promise<MatchEvent>;
  getMatchEvents(matchId: number): Promise<MatchEvent[]>;
  deleteMatchEvent(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getTeams(): Promise<Team[]> {
    return await db.select().from(teams);
  }

  async getTeam(id: number): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const [team] = await db.insert(teams).values(insertTeam).returning();
    return team;
  }

  async getPlayers(teamId?: number): Promise<Player[]> {
    if (teamId) {
      return await db.select().from(players).where(eq(players.teamId, teamId));
    }
    return await db.select().from(players);
  }

  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const [player] = await db.insert(players).values(insertPlayer).returning();
    return player;
  }

  async deletePlayer(id: number): Promise<void> {
    await db.delete(players).where(eq(players.id, id));
  }

  async getMatches(): Promise<Match[]> {
    return await db.query.matches.findMany({
      with: {
        homeTeam: true,
        awayTeam: true,
      },
      orderBy: desc(matches.date),
    });
  }

  async getMatch(id: number): Promise<Match | undefined> {
    return await db.query.matches.findFirst({
      where: eq(matches.id, id),
      with: {
        homeTeam: true,
        awayTeam: true,
      },
    });
  }

  async createMatch(insertMatch: InsertMatch): Promise<Match> {
    const [match] = await db.insert(matches).values(insertMatch).returning();
    return match;
  }

  async updateMatchStatus(id: number, status: string): Promise<Match> {
    const [match] = await db
      .update(matches)
      .set({ status })
      .where(eq(matches.id, id))
      .returning();
    return match;
  }

  async updateMatchScore(id: number, homeScore: number, awayScore: number): Promise<void> {
    await db
      .update(matches)
      .set({ homeScore, awayScore })
      .where(eq(matches.id, id));
  }

  async createMatchEvent(insertEvent: InsertMatchEvent): Promise<MatchEvent> {
    const [event] = await db.insert(matchEvents).values(insertEvent).returning();
    
    // Auto-update score if it's a goal
    if (insertEvent.type === 'goal') {
      const match = await this.getMatch(insertEvent.matchId);
      if (match) {
        if (match.homeTeamId === insertEvent.teamId) {
          await this.updateMatchScore(match.id, (match.homeScore || 0) + 1, match.awayScore || 0);
        } else if (match.awayTeamId === insertEvent.teamId) {
          await this.updateMatchScore(match.id, match.homeScore || 0, (match.awayScore || 0) + 1);
        }
      }
    }

    return event;
  }

  async getMatchEvents(matchId: number): Promise<MatchEvent[]> {
    return await db
      .select()
      .from(matchEvents)
      .where(eq(matchEvents.matchId, matchId))
      .orderBy(desc(matchEvents.time));
  }

  async deleteMatchEvent(id: number): Promise<void> {
    // Note: Deleting a goal event won't auto-decrement score in this simple implementation
    // Ideally we should transactionally check and decrement
    await db.delete(matchEvents).where(eq(matchEvents.id, id));
  }
}

export const storage = new DatabaseStorage();
