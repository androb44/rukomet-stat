# Handball Stats Tracker

## Overview

A mobile-first handball statistics application for tracking live matches, managing teams and players, and recording match events. The app provides real-time scoring capabilities, event logging with player attribution (goals, saves, turnovers, cards), and team roster management. Built with a lightweight vanilla JavaScript frontend and Express backend for maximum mobile stability.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

- **v4.0+ Player Management**: Added team roster management and player attribution to game events
  - Teams view now shows clickable team cards that open Team Details
  - Team Details shows player roster with add/delete functionality
  - Match events now prompt for player selection via modal
  - Event log displays player names (#7 John Hansen format)
- **v4.0 Live Stats**: Match Details view with timer, event recording, event log, and stats summary
- **v3.0 Architecture Change**: Replaced React/Vite with vanilla HTML/CSS/JS for mobile stability

## System Architecture

### Frontend Architecture
- **Framework**: Vanilla JavaScript (no build process) - chosen for maximum mobile browser stability
- **Location**: Single file at `public/index.html` with inline CSS and JS
- **Styling**: Custom CSS with mobile-first design
- **Navigation**: Bottom navigation bar with Home, Matches, Teams tabs
- **Views**: Home, Teams, Add Team, Team Details, Matches, Add Match, Match Details

The frontend uses a simple view-based navigation pattern where views are shown/hidden with the `.hidden` class. All state is managed in global JavaScript variables.

### Backend Architecture
- **Framework**: Express 5 on Node.js
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Schema Validation**: Zod with drizzle-zod integration
- **API Design**: REST endpoints defined in `shared/routes.ts`

The server uses a storage abstraction layer (`server/storage.ts`) implementing the `IStorage` interface. Routes are registered in `server/routes.ts` with Zod validation.

### API Endpoints
- **Teams**: GET/POST `/api/teams`, GET `/api/teams/:id`
- **Players**: GET `/api/players?teamId=X`, POST `/api/players`, DELETE `/api/players/:id`
- **Matches**: GET/POST `/api/matches`, GET `/api/matches/:id`, PATCH `/api/matches/:id/status`
- **Match Events**: POST `/api/match-events`, DELETE `/api/match-events/:id`

### Data Model
- **Teams**: id, name, shortName (3 chars), color
- **Players**: id, teamId, name, number, position (GK/LW/LB/CB/RB/RW/P)
- **Matches**: id, homeTeamId, awayTeamId, date, location, homeScore, awayScore, status (scheduled/in_progress/finished)
- **Match Events**: id, matchId, teamId, playerId (optional), type (goal/shot/save/assist/turnover/block/yellow_card/2min/red_card), time

### Key Features
1. **Team Management**: Create teams with name, short name, and color
2. **Player Management**: Add players with name, jersey number, and position
3. **Match Scheduling**: Schedule matches between teams with date/location
4. **Live Stats Tracking**: 
   - Game timer (start/pause/reset)
   - Event recording with player attribution
   - Real-time score updates (goals auto-increment score)
   - Event log with timestamps and player names
   - Stats summary comparing both teams

## External Dependencies

### Database
- **PostgreSQL**: Primary database via `DATABASE_URL` environment variable
- **Drizzle Kit**: Database migrations stored in `./migrations`

### Key NPM Packages
- `drizzle-orm` / `drizzle-zod`: Type-safe database queries and schema validation
- `express`: Web server framework
- `zod`: Runtime type validation

### Build & Development Tools
- `tsx`: TypeScript execution for development
- `esbuild`: Server bundling for production
