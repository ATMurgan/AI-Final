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
| `dawn-950` | `#180a22` | Page background |
| `dawn-900` | `#251038` | Chat panel background |
| `dawn-800` | `#3d1650` | Cards, AI message bubbles |
| `dawn-700` | `#6d2860` | Borders, dividers |
| `sunrise-500` | `#f97316` | Brand accent, primary actions (send button, logo) |
| `sunrise-600` | `#ea580c` | User chat bubbles |
| `sunrise-100` | `#ffe4c4` | Timestamp text, muted labels |
| `gold-400` | `#fbbf24` | Star ratings, price highlights |

### Typography
- **Font**: Inter (Google Fonts)
- **Weights**: 400 (body), 500 (labels), 600 (headings), 700 (prices)
- **Base size**: 14px (`text-sm`) for UI elements

### Border Radius
- Cards: `rounded-2xl` (16px)
- Inputs/buttons: `rounded-xl` (12px)
- Avatars/badges: `rounded-full`

---

## Component Map

| Component | Path | Description |
|---|---|---|
| `Header` | `src/components/Header.tsx` | Top bar with airplane logo, app name, tagline |
| `ClientApp` | `src/components/ClientApp.tsx` | Client wrapper — holds itinerary state shared between chat and results panels |
| `ChatPanel` | `src/components/ChatPanel.tsx` | Left panel — chat UI; calls `/api/chat`, triggers `onItinerariesUpdate` |
| `ChatMessage` | `src/components/ChatMessage.tsx` | Individual message bubble (user/assistant) |
| `TripResultsPanel` | `src/components/TripResultsPanel.tsx` | Right panel — displays itinerary cards from props; shows empty state when none |
| `ItineraryCard` | `src/components/ItineraryCard.tsx` | Single trip result card with cost breakdown and day-by-day itinerary |

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
│  [User bubble]       │                           │
│  [AI bubble]         │                           │
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
  totalCost: number;       // flight + (hotel.pricePerNight × nights) + (dailyBudget × nights)
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
{
  userMessage: ChatMessage;
  aiMessage: ChatMessage;
  itinerariesGenerated: boolean;
  itineraries?: Itinerary[];  // present when itinerariesGenerated is true
}
```

---

## API Routes

| Route | Method | Description |
|---|---|---|
| `/api/chat` | POST | Main orchestration: save user msg → call Ollama (conversation only) → extract prefs → on first-time completion, generate itinerary server-side → save AI reply |
| `/api/session` | POST | Create session row in DB + set `ba_session` HttpOnly cookie |

---

## Database Schema

Three core tables + two AI/API tables. All keyed on `session_id` (UUID per browser session).

| Table | Purpose |
|---|---|
| `sessions` | One row per session |
| `messages` | Chat history |
| `itineraries` | Generated trip option (replaced on each new generation) |
| `travel_preferences` | Accumulated preferences extracted by Ollama |
| `api_responses` | Raw Amadeus API responses for future training data |

---

## AI Integration (Ollama)

### How it works
1. User sends a message → ChatPanel POSTs to `/api/chat` with `X-Session-Id` header
2. Server loads conversation history + current preferences from DB
3. Calls `processMessage()` in `src/lib/ai.ts` → sends to Ollama with `format: "json"` (conversation only)
4. **Dual extraction**: Ollama's `preferencesUpdate` is merged with `extractPreferencesFromText()` (regex safety net). Regex fills gaps when Ollama returns null. After merging, `normalizeLocationValue()` strips travel phrases from destination/origin (e.g. `"Go to Paris"` → `"Paris"`).
5. Combined preferences are upserted into the DB via COALESCE merge (preserves prior fields)
6. Server checks all 4 required fields server-side + checks if an itinerary already exists in DB
7. If all fields present and no itinerary yet → `generateItinerariesFromData()` picks the cheapest valid combo
8. Itinerary is returned directly in the API response JSON → `ChatPanel` passes it to `TripResultsPanel` via React state (no cookie/refresh needed)

### Why itineraries are generated server-side (not by Ollama)
Smaller LLMs like `llama3.2` reliably handle conversation but often fail to populate a complex nested JSON array in the same response. Generating itineraries deterministically from the pricing data is both faster and 100% reliable.

### Pricing data
- **Mock JSON** (default): `src/data/flights.json` (132 entries, 44 routes) and `src/data/hotels.json` (75 entries, 15 destinations). Filtered by `searchAllMock()` in `src/lib/apis/mockData.ts`.
- **Amadeus** (optional): Live data via Amadeus Self-Service API when `AMADEUS_CLIENT_ID` / `AMADEUS_CLIENT_SECRET` are set.

### Itinerary selection algorithm (`generateItinerariesFromData`)
- Cross-products all matching flights × hotels
- Calculates `totalCost = flight.price + (hotel.pricePerNight × nights) + (dailyBudget × nights)`
- Uses destination-specific daily budgets (e.g. $35/day Bangkok, $110/day Honolulu)
- Filters out combos that exceed the user's budget
- Returns the single cheapest valid option

### Preference extraction reliability
`extractPreferencesFromText()` in `src/lib/ai.ts` runs on every message regardless of Ollama's response. It catches `$1500`, `7 days`, `from Toronto`, `to Cancun` etc. via regex. This means itinerary generation works even if Ollama returns `preferencesUpdate: null`.

### Location normalisation
`normalizeLocationValue()` in `src/app/api/chat/route.ts` is applied to `destination` and `origin` after the merge. It strips phrases Ollama includes (e.g. `"Go to Paris"`, `"Paris, France"`) down to a bare city name before the value is stored in the DB and used for IATA lookup.

### Fallback
If Ollama is not running (connection refused), `generateStubResponse()` handles basic keyword extraction and returns canned follow-up questions. Itinerary generation still works (it's server-side, not Ollama-dependent).

### Required fields before generating itineraries
`budget`, `origin`, `destination`, `tripLengthDays`

### Per-session isolation
- `ChatPanel` generates a UUID on mount, stored in `sessionStorage` (cleared on tab close / refresh)
- POSTs UUID to `/api/session` → creates DB row + sets `ba_session` HttpOnly cookie
- All `/api/chat` requests carry `X-Session-Id` header
- Itinerary is returned in the `/api/chat` response JSON → `ClientApp` holds it in React state and passes to `TripResultsPanel` as a prop

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
| `DEFAULT_SESSION_ID` | Yes | Fallback session UUID used when no session header/cookie is present |
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
