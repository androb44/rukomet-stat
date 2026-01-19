import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Teams
  app.get(api.teams.list.path, async (req, res) => {
    const teams = await storage.getTeams();
    res.json(teams);
  });

  app.post(api.teams.create.path, async (req, res) => {
    try {
      const input = api.teams.create.input.parse(req.body);
      const team = await storage.createTeam(input);
      res.status(201).json(team);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      } else {
        throw err;
      }
    }
  });

  app.get(api.teams.get.path, async (req, res) => {
    const team = await storage.getTeam(Number(req.params.id));
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    res.json(team);
  });

  // Players
  app.get(api.players.list.path, async (req, res) => {
    const teamId = req.query.teamId ? Number(req.query.teamId) : undefined;
    const players = await storage.getPlayers(teamId);
    res.json(players);
  });

  app.post(api.players.create.path, async (req, res) => {
    try {
      const input = api.players.create.input.parse(req.body);
      const player = await storage.createPlayer(input);
      res.status(201).json(player);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      } else {
        throw err;
      }
    }
  });

  app.delete(api.players.delete.path, async (req, res) => {
    await storage.deletePlayer(Number(req.params.id));
    res.status(204).send();
  });

  // Matches
  app.get(api.matches.list.path, async (req, res) => {
    const matches = await storage.getMatches();
    // In a real app we'd join with teams here, but for now client fetches teams separately
    // or we could enrich the response. Let's keep it simple for now.
    res.json(matches);
  });

  app.post(api.matches.create.path, async (req, res) => {
    try {
      // Coerce date string to Date object
      const body = {
        ...req.body,
        date: new Date(req.body.date),
      };
      const input = api.matches.create.input.parse(body);
      const match = await storage.createMatch(input);
      res.status(201).json(match);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      } else {
        throw err;
      }
    }
  });

  app.get(api.matches.get.path, async (req, res) => {
    const match = await storage.getMatch(Number(req.params.id));
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }
    
    // Get events for this match
    const events = await storage.getMatchEvents(match.id);
    res.json({ ...match, events });
  });

  app.patch(api.matches.updateStatus.path, async (req, res) => {
    try {
      const input = api.matches.updateStatus.input.parse(req.body);
      const match = await storage.updateMatchStatus(Number(req.params.id), input.status);
      res.json(match);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      } else {
        throw err;
      }
    }
  });

  // Match Events
  app.post(api.matchEvents.create.path, async (req, res) => {
    try {
      const input = api.matchEvents.create.input.parse(req.body);
      const event = await storage.createMatchEvent(input);
      res.status(201).json(event);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      } else {
        throw err;
      }
    }
  });

  app.delete(api.matchEvents.delete.path, async (req, res) => {
    await storage.deleteMatchEvent(Number(req.params.id));
    res.status(204).send();
  });

  // Seed Data
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const teams = await storage.getTeams();
  if (teams.length === 0) {
    const denmark = await storage.createTeam({
      name: "Denmark",
      shortName: "DEN",
      color: "#C60C30",
    });
    const france = await storage.createTeam({
      name: "France",
      shortName: "FRA",
      color: "#002395",
    });

    // Seed Players
    await storage.createPlayer({ teamId: denmark.id, name: "Niklas Landin", number: 1, position: "GK" });
    await storage.createPlayer({ teamId: denmark.id, name: "Mikkel Hansen", number: 24, position: "LB" });
    
    await storage.createPlayer({ teamId: france.id, name: "Nikola Karabatic", number: 13, position: "CB" });
    await storage.createPlayer({ teamId: france.id, name: "Dika Mem", number: 10, position: "RB" });

    // Seed Match
    await storage.createMatch({
      homeTeamId: denmark.id,
      awayTeamId: france.id,
      date: new Date(),
      location: "Jyske Bank Boxen",
      status: "scheduled",
    });
  }
}
