# Handball Stats Tracker

## Overview

A mobile-first handball statistics application for tracking live matches, managing teams and players, and recording real-time game events. The app provides live scoring, event logging with player attribution (goals, saves, assists, etc.), team roster management, and a stats summary.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React + Vite with TypeScript
- **Location**: `client/src/` — pages in `pages/`, components in `components/`
- **Styling**: Tailwind CSS with shadcn/ui components
- **Routing**: Wouter (client-side routing)
- **State/Data**: TanStack Query v5 for all server state
- **Forms**: react-hook-form + zod resolvers
- **Navigation**: Bottom nav bar (Home, Matches, Teams) — hidden on Match Details page

### Backend Architecture
- **Framework**: Express 5 on Node.js
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Schema Validation**: Zod with drizzle-zod integration
- **API Design**: REST endpoints

### Pages
- **Home** (`/`) — Dashboard with live/upcoming/recent match rows, quick action cards
- **Teams** (`/teams`) — Team list; click "+" to create a team
- **Team Details** (`/teams/:id`) — Roster management; add/delete players with name, jersey number, position
- **Matches** (`/matches`) — Match list grouped by Live/Upcoming/Results; click "+" to schedule
- **Match Details** (`/matches/:id`) — Live scoreboard, timer, event recording (sheet UI), event log, stats summary

### API Endpoints
- **Teams**: GET/POST `/api/teams`, GET `/api/teams/:id`
- **Players**: GET `/api/players?teamId=X`, POST `/api/players`, DELETE `/api/players/:id`
- **Matches**: GET/POST `/api/matches`, GET `/api/matches/:id` (includes events), PATCH `/api/matches/:id/status`
- **Match Events**: POST `/api/match-events`, DELETE `/api/match-events/:id`

### Data Model
- **Teams**: id, name, shortName (3 chars), color
- **Players**: id, teamId, name, number, position (GK/LW/LB/CB/RB/RW/P)
- **Matches**: id, homeTeamId, awayTeamId, date, location, homeScore, awayScore, status (scheduled/in_progress/finished)
- **Match Events**: id, matchId, teamId, playerId (optional), type (goal/shot/save/assist/turnover/block/yellow_card/2min/red_card), time

### Event Recording Flow (Match Details)
1. Start the match → timer starts, action buttons appear
2. Tap "HOME Action" or "AWAY Action"
3. Bottom sheet shows event type grid (Goal, Shot, Save, Assist, Turnover, Block, Yellow, 2min, Red Card)
4. Select event type → player list appears
5. Select player → event recorded, score auto-updated for goals

### Key Features
1. **Team Management**: Create teams with name, short name (3 chars), and color
2. **Player Roster**: Add players with name, jersey number (1–99), and position
3. **Match Scheduling**: Schedule matches between teams with date/location
4. **Live Stats Tracking**:
   - Scoreboard with both teams
   - Game timer (start/pause/reset)
   - Event recording via bottom sheet (step-by-step: event type → player)
   - Event log showing player attribution (#7 John Hansen)
   - Stats summary with bar charts comparing both teams

## PDF Export

Match details page includes an "Export Match Report as PDF" button at the bottom. It generates a PDF report containing:
- Match header with team colors, short names, and final score
- Team statistics table (goals, shots, saves, assists, turnovers, blocks, cards)
- Player statistics tables for both teams
- Complete event log (chronological, with player names and minute)
- Generated client-side using `jspdf` + `jspdf-autotable` (no server needed)
- Filename format: `Match_DEN_vs_FRA_20260101.pdf`

## External Dependencies

### Database
- **PostgreSQL**: Primary database via `DATABASE_URL` environment variable
- **Drizzle Kit**: Database schema in `shared/schema.ts`, migrations in `./migrations`

### Key NPM Packages
- `drizzle-orm` / `drizzle-zod`: Type-safe database queries and schema validation
- `express`: Web server framework
- `zod`: Runtime type validation
- `@tanstack/react-query`: Data fetching and caching
- `react-hook-form` + `@hookform/resolvers`: Form handling
- `wouter`: Lightweight client-side routing
- `shadcn/ui` components: UI primitives (Dialog, Sheet, Select, Form, etc.)
- `lucide-react`: Icons

### Build & Development Tools
- `tsx`: TypeScript execution for development
- `vite`: Frontend dev server and bundler
- `esbuild`: Server bundling for production
