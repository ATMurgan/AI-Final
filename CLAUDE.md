# BudgetAdvisor — AI Travel Planner

## Project Overview
An AI chatbot-based travel planner that recommends the cheapest feasible trip itinerary based on user constraints (budget, origin, destination, trip length, interests, hotel preferences, layover tolerance). Uses a local Ollama LLM to parse user input, extract preferences conversationally, and generate itineraries. Optionally integrates with Amadeus APIs for live flight and hotel pricing.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Runtime**: React 19
- **Database**: PostgreSQL via `postgres` (postgres.js)
- **AI**: Ollama (local LLM, default model: `llama3.2`)
- **Travel APIs**: Amadeus Self-Service (flights + hotels, optional)

---

## Design System

### Color Palette
| Token | Hex | Usage |
|---|---|---|
| `ocean-950` | `#020c1a` | Page background |
| `ocean-900` | `#041629` | Chat panel background |
| `ocean-800` | `#082032` | Cards, input backgrounds |
| `ocean-700` | `#0e2f48` | Borders, secondary elements |
| `gray-400` | `#9ca3af` | Secondary text |
| `gray-100` | `#f3f4f6` | Primary text |
| `coral-500` | `#f97316` | Brand accent, primary actions (send button, logo) |
| `coral-400` | `#fb923c` | Hover states |
| `coral-600` | `#ea580c` | User chat bubbles |
| `coral-200` | `#fed7aa` | User bubble timestamp text |
| `cyan-400` | built-in | Prices, data highlights |
| `amber-400` | built-in | Star ratings |

### Typography
- **Font**: Inter (Google Fonts)
- **Weights**: 400 (body), 500 (labels), 600 (headings), 700 (prices)
- **Base size**: 14px (`text-sm`) for UI elements, 16px for body

### Border Radius
- Cards: `rounded-2xl` (16px)
- Inputs/buttons: `rounded-xl` (12px)
- Avatars/badges: `rounded-full`

---

## Component Map

| Component | Path | Description |
|---|---|---|
| `Header` | `src/components/Header.tsx` | Top bar with logo, app name, tagline |
| `ChatPanel` | `src/components/ChatPanel.tsx` | Left panel — chat UI; client component, calls `/api/chat` |
| `ChatMessage` | `src/components/ChatMessage.tsx` | Individual message bubble (user/assistant) |
| `TripResultsPanel` | `src/components/TripResultsPanel.tsx` | Right panel — itinerary results grid; async server component |
| `ItineraryCard` | `src/components/ItineraryCard.tsx` | Single trip result card |

---

## Layout Structure

```
┌─────────────────────────────────────────────────┐
│                    HEADER                        │
│  [Logo] BudgetAdvisor     tagline           [ ]  │
├──────────────────────┬──────────────────────────┤
│  CHAT PANEL (40%)    │  TRIP RESULTS (60%)       │
│                      │                           │
│  [AI bubble]         │  [ItineraryCard]          │
│  [User bubble]       │  [ItineraryCard]          │
│  [AI bubble]         │  [ItineraryCard]          │
│                      │                           │
│  [input bar] [send]  │                           │
└──────────────────────┴──────────────────────────┘
```

- Desktop: side-by-side, chat fixed at 40% (max 480px), results fill remainder
- Mobile (`< md`): stacked vertically, each panel 50vh

---

## Data Models

### `ChatMessage` (`src/types/index.ts`)
```ts
{ id: string; role: "user" | "assistant"; content: string; timestamp?: string }
```

### `Itinerary` (`src/types/index.ts`)
```ts
{
  id: string;
  destination: string;
  countryFlag: string;
  nights: number;
  totalCost: number;       // flight + (hotel * nights) + (daily * nights)
  flight: { airline, origin, destination, price };
  hotel: { name, stars, pricePerNight };
  dailyBudget: number;
}
```

### `TravelPreferences` (`src/types/preferences.ts`)
```ts
{
  budget: number | null;
  currency: string;          // default "USD"
  origin: string | null;     // city or IATA code
  destination: string | null;
  tripLengthDays: number | null;
  interests: string[];
  hotelMinStars: number | null;
  hotelMaxStars: number | null;
  maxLayovers: number | null;
  departureDate: string | null;  // ISO "YYYY-MM-DD"
  returnDate: string | null;
  isComplete: boolean;
}
```

### `ChatResponse` (`src/types/index.ts`)
```ts
{ userMessage: ChatMessage; aiMessage: ChatMessage; itinerariesGenerated: boolean }
```

---

## API Routes

| Route | Method | Description |
|---|---|---|
| `/api/chat` | POST | Main orchestration: save user msg → call Ollama → extract prefs → optionally call Amadeus → generate itineraries → save AI reply |
| `/api/messages` | GET | Fetch all messages for the demo session |
| `/api/messages` | POST | Insert a single message (CRUD backup) |

---

## Database Schema

Three core tables + two AI/API tables. All keyed on `session_id` (fixed demo UUID).

| Table | Purpose |
|---|---|
| `sessions` | One row per session (demo: fixed UUID) |
| `messages` | Chat history |
| `itineraries` | Generated trip options (replaced on each new generation) |
| `travel_preferences` | Accumulated preferences extracted by Ollama |
| `api_responses` | Raw Amadeus API responses for future training data |

---

## AI Integration (Ollama)

### How it works
1. User sends a message → ChatPanel POSTs to `/api/chat`
2. Server loads conversation history + current preferences from DB
3. Calls `processMessage()` in `src/lib/ai.ts` → sends to Ollama with `format: "json"`
4. Ollama returns a structured JSON response:
   - `message` — natural language reply shown to user
   - `preferencesUpdate` — fields to upsert into `travel_preferences`
   - `isComplete` — true when all 4 required fields are collected
   - `missingFields` — which required fields still need to be asked
   - `itineraries` — populated only when asked to generate trip options
5. When `isComplete`, Ollama generates 3 mock itineraries (or uses Amadeus data if configured)
6. `router.refresh()` on the client causes `TripResultsPanel` to re-fetch and display new cards

### Fallback
If Ollama is not running (connection refused), `generateStubResponse()` handles basic keyword extraction and returns canned follow-up questions.

### Required fields before generating itineraries
`budget`, `origin`, `destination`, `tripLengthDays`

### Setup
```bash
# 1. Install Ollama
# Windows: download from https://ollama.com

# 2. Pull a model
ollama pull llama3.2

# 3. Ollama auto-starts on Windows, or run manually:
ollama serve
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `DEFAULT_SESSION_ID` | Yes | Fixed demo session UUID |
| `OLLAMA_BASE_URL` | No | Default: `http://localhost:11434` |
| `OLLAMA_MODEL` | No | Default: `llama3.2` |
| `AMADEUS_CLIENT_ID` | No | Amadeus API — enables real flight data |
| `AMADEUS_CLIENT_SECRET` | No | Amadeus API — enables real hotel data |

---

## Getting Started

```bash
# Prerequisites:
# - Node.js (https://nodejs.org)
# - PostgreSQL
# - Ollama (https://ollama.com) + ollama pull llama3.2

# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL

# 3. Set up database (first time)
createdb budgetadvisor
psql -d budgetadvisor -f src/db/schema.sql

# Or if DB already exists, run the migration only:
psql -d budgetadvisor -f src/db/migration-001-preferences.sql

# 4. Start dev server
npm run dev        # http://localhost:3000
npm run build      # production build
```
