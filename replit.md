# Handball Stats Tracker

## Overview

A mobile-first handball statistics application for tracking live matches, managing teams and players, and recording match events. The app provides real-time scoring capabilities, event logging (goals, saves, turnovers, cards), and team roster management. Built as a full-stack TypeScript application with a React frontend and Express backend.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state caching and synchronization
- **Styling**: Tailwind CSS with CSS variables for theming
- **UI Components**: shadcn/ui component library (Radix UI primitives with custom styling)
- **Animations**: Framer Motion for page transitions and micro-interactions
- **Build Tool**: Vite with hot module replacement

The frontend follows a mobile-first design pattern with a bottom navigation bar. Pages are organized in `client/src/pages/` with reusable components in `client/src/components/`. Custom hooks in `client/src/hooks/` abstract API calls using React Query.

### Backend Architecture
- **Framework**: Express 5 on Node.js
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Schema Validation**: Zod with drizzle-zod integration
- **API Design**: REST endpoints defined in `shared/routes.ts` with type-safe request/response schemas

The server uses a storage abstraction layer (`server/storage.ts`) implementing the `IStorage` interface, making it easy to swap database implementations. Routes are registered in `server/routes.ts` with Zod validation for input parsing.

### Shared Code
The `shared/` directory contains code used by both frontend and backend:
- `schema.ts`: Drizzle table definitions and Zod insert schemas
- `routes.ts`: API endpoint definitions with path, method, input validation, and response schemas

### Data Model
- **Teams**: id, name, shortName (3 chars), color
- **Players**: id, teamId, name, number, position (GK/LW/LB/CB/RB/RW/P)
- **Matches**: id, homeTeamId, awayTeamId, date, location, scores, status (scheduled/in_progress/finished)
- **Match Events**: id, matchId, teamId, playerId, type (goal/miss/save/turnover/cards/timeout), time

### Development vs Production
- Development: Vite dev server with HMR proxied through Express
- Production: Static file serving from `dist/public` after Vite build, server bundled with esbuild

## External Dependencies

### Database
- **PostgreSQL**: Primary database via `DATABASE_URL` environment variable
- **Drizzle Kit**: Database migrations stored in `./migrations`

### Key NPM Packages
- `drizzle-orm` / `drizzle-zod`: Type-safe database queries and schema validation
- `@tanstack/react-query`: Async state management with caching
- `@radix-ui/*`: Accessible UI primitives for shadcn components
- `framer-motion`: Animation library
- `date-fns`: Date formatting
- `wouter`: Lightweight client-side routing
- `zod`: Runtime type validation

### Build & Development Tools
- `tsx`: TypeScript execution for development
- `vite`: Frontend build and dev server
- `esbuild`: Server bundling for production
- `tailwindcss`: Utility-first CSS framework