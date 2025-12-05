# KPL (Korea Pro League) - Project Context & Rules

## 1. Project Overview
This project is a League Management System for an NBA 2K Online League (KPL).
It mimics the structure of NBA.com but is tailored for eSports data management.

## 2. Tech Stack (Strict)
- **Framework:** Next.js 14+ (App Router). DO NOT use Pages Router.
- **Language:** TypeScript (Strict mode). Avoid `any` type.
- **Styling:** Tailwind CSS. Use semantic class names where possible.
- **Database:** Supabase (PostgreSQL).
- **Auth:** Supabase Auth (Google OAuth).
- **State:** Zustand (for global state), React Query (for server state).
- **Icons:** Lucide React.

## 3. Coding Standards
- **Component Structure:** Use Functional Components. Keep UI and Logic separated where possible.
- **Server Components:** Use React Server Components (RSC) by default. Use 'use client' only when interaction is needed.
- **Data Fetching:** Fetch data directly in Server Components using Supabase Server Client.
- **Naming Convention:**
  - Variables/Functions: camelCase
  - Components: PascalCase
  - Files: kebab-case (e.g., `match-card.tsx`)
  - Database Columns: snake_case (e.g., `team_id`, `fg_made`)

## 4. Domain Rules (Crucial)
### A. Season System
- The league operates on a "Season" basis (e.g., '2K26 Season 1').
- **Reset Rule:** When a new season starts, Teams and Rosters are reset. User data (profiles) persists.
- **Legacy Data:** Always query data based on `season_id` to separate current stats from history.

### B. Match Logic
- **Schedule:** Regular games are fixed on Tue/Thu/Sun at 22:40 and 23:20.
- **Roster:** A match consists of 5 players vs 5 players (Total 10 entries in `match_stats`).
- **Validation:**
  - FGM (Field Goals Made) <= FGA (Field Goals Attempted)
  - 3PM <= 3PA
  - FTM <= FTA
  - Points Calculation: (FGM - 3PM) * 2 + (3PM * 3) + FTM. *Wait, check logic: FGM usually includes 3PM in 2K stats. Verify if FGM is Total FG or just 2PT.* -> **Rule: FGM is Total Field Goals (2PT + 3PT). So Points = (FGM-3PM)*2 + 3PM*3 + FTM.**

### C. Standings Calculation
- **Win Rate:** Wins / (Wins + Losses) * 100
- **Margin:** (Total Points Scored - Total Points Against) / Games Played
- **Ranking Criteria:** Win Rate > Wins > Margin > Points Scored.

## 5. UI/UX Guidelines
- **Theme:** Dark Mode default (Sports/Gaming vibe).
- **Responsive:** Mobile-first approach. Tables must be scrollable on mobile.
- **Feedback:** Show toast notifications for all CRUD actions (Success/Error).