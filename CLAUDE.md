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
| `ClientApp` | `src/components/ClientApp.tsx` | Client wrapper — holds itinerary state shared between chat and results panels |
| `ChatPanel` | `src/components/ChatPanel.tsx` | Left panel — chat UI; calls `/api/chat`, triggers `onItinerariesUpdate` |
| `ChatMessage` | `src/components/ChatMessage.tsx` | Individual message bubble (user/assistant) |
| `TripResultsPanel` | `src/components/TripResultsPanel.tsx` | Right panel — displays itinerary cards from props; shows empty state when none |
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
| `/api/chat` | POST | Main orchestration: save user msg → call Ollama (conversation only) → extract prefs → on first-time completion, generate itineraries server-side → save AI reply |
| `/api/session` | POST | Create session row in DB + set `ba_session` HttpOnly cookie |
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
1. User sends a message → ChatPanel POSTs to `/api/chat` with `X-Session-Id` header
2. Server loads conversation history + current preferences from DB
3. Calls `processMessage()` in `src/lib/ai.ts` → sends to Ollama with `format: "json"` (conversation only)
4. **Dual extraction**: Ollama's `preferencesUpdate` is merged with `extractPreferencesFromText()` (regex safety net). Ollama values take priority; regex fills gaps when Ollama returns null.
5. Combined preferences are upserted into the DB via COALESCE merge (preserves prior fields)
6. Server checks all 4 required fields server-side + checks if itineraries already exist in DB
7. If all fields present and no itineraries yet → `generateItinerariesFromData()` deterministically picks cheapest combos
8. Itineraries are returned directly in the API response JSON → `ChatPanel` passes them to `TripResultsPanel` via React state (no cookie/refresh needed)

### Why itineraries are generated server-side (not by Ollama)
Smaller LLMs like `llama3.2` reliably handle conversation but often fail to populate a complex nested JSON array (`itineraries`) in the same response. Generating itineraries deterministically from the pricing data is both faster and 100% reliable.

### Pricing data
- **Mock JSON** (default): `src/data/flights.json` (132 entries, 44 routes) and `src/data/hotels.json` (75 entries, 15 destinations). Filtered by `searchAllMock()` in `src/lib/apis/mockData.ts`.
- **Amadeus** (optional): Live data via Amadeus Self-Service API when `AMADEUS_CLIENT_ID` / `AMADEUS_CLIENT_SECRET` are set.

### Itinerary selection algorithm (`generateItinerariesFromData`)
- Cross-products all matching flights × hotels
- Calculates `totalCost = flight.price + (hotel.pricePerNight × nights) + (dailyBudget × nights)`
- Uses destination-specific daily budgets (e.g. $35/day Bangkok, $110/day Honolulu)
- Filters out combos that exceed the user's budget
- Returns up to 3 cheapest options, each with a different hotel for variety

### Preference extraction reliability
`extractPreferencesFromText()` in `src/lib/ai.ts` runs on every message regardless of Ollama's response. It catches `$1500`, `7 days`, `from Toronto`, `to Cancun` etc. via regex. This means itinerary generation works even if Ollama returns `preferencesUpdate: null`.

### Fallback
If Ollama is not running (connection refused), `generateStubResponse()` handles basic keyword extraction and returns canned follow-up questions. Itinerary generation still works (it's server-side, not Ollama-dependent).

### Required fields before generating itineraries
`budget`, `origin`, `destination`, `tripLengthDays`

### Per-session isolation
- `ChatPanel` generates a UUID on mount, stored in `sessionStorage` (cleared on tab close / refresh)
- POSTs UUID to `/api/session` → creates DB row + sets `ba_session` HttpOnly cookie
- All `/api/chat` requests carry `X-Session-Id` header
- Itineraries are returned in the `/api/chat` response JSON → `ClientApp` holds them in React state and passes to `TripResultsPanel` as a prop

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
