# BudgetAdvisor — AI Travel Planner

BudgetAdvisor is a web app that finds the cheapest feasible trip for you. Tell it your budget, where you're flying from, where you want to go, and how many days you have — and it returns a full itinerary with real-ish flight and hotel pricing and a day-by-day activity plan.

---

## What it does

You type naturally into the chat — either all at once or one detail at a time — and the assistant collects four pieces of information:

| Field | Example |
|---|---|
| Budget | `$3000` |
| Origin | `Toronto` |
| Destination | `Paris` |
| Trip length | `7 days` |

Once it has all four, it searches its flight and hotel database, finds the cheapest combination that fits your budget, and displays a trip card on the right side of the screen. The card shows the cost breakdown (flight / hotel / daily spending), the specific flight and hotel, and a day-by-day activity itinerary for the destination.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS + custom design tokens |
| AI | Ollama — runs a local LLM (`llama3.2` by default) |
| Database | PostgreSQL via `postgres.js` |
| Travel data | Static JSON files (default) or Amadeus API (optional) |

---

## How the chat works

The chat panel on the left is the main interface. Each time you send a message, this is what happens on the server:

```
User message
     │
     ▼
Load conversation history + current preferences from DB
     │
     ▼
Send to Ollama (local LLM) → structured JSON response
     │
     ▼
Extract preferences from message text (regex safety net)
     │
     ▼
Merge both extractions → normalise location values → save to DB
     │
     ├── All 4 fields present? ──No──► Return Ollama's conversational reply
     │
     Yes
     │
     ▼
Search flights + hotels → find cheapest combo within budget
     │
     ├── Found results? ──No──► Return helpful error message
     │
     Yes
     │
     ▼
Save itinerary to DB → return it to the client → display trip card
```

The AI is used **only for conversation** — understanding what you said and asking follow-up questions. The actual itinerary is generated deterministically from the pricing data, not by the AI. This means the results are consistent and always within budget.

---

## How preferences are extracted

Two methods run in parallel on every message and their results are merged:

**1. Ollama (LLM extraction)**
Ollama is asked to return a structured JSON object containing any preferences it detected in the message — for example `{ "destination": "Paris", "budget": 3000 }`. It handles natural language well and can infer context from the whole conversation.

**2. Regex extraction (safety net)**
A separate function in `src/lib/ai.ts` (`extractPreferencesFromText`) scans the message for common patterns regardless of what Ollama returned — things like `$1500`, `7 days`, `from Toronto`, `to Cancun`. This means the system keeps working even if Ollama misses something or is not running.

**Merging**
After both run, Ollama's values take priority. The result is then passed through `normalizeLocationValue()` which strips travel phrases that the LLM sometimes includes — for example `"Go to Paris"` becomes `"Paris"` before it is saved and used to look up flights. The cleaned values are merged into the session's accumulated preferences using `COALESCE` in SQL, so earlier messages are never overwritten by a `null`.

---

## How the itinerary is generated

Once all four required fields are collected, `generateItinerariesFromData()` in `src/lib/apis/mockData.ts` runs:

1. Converts origin and destination city names to IATA airport codes (e.g. `Toronto` → `YYZ`, `Paris` → `CDG`)
2. Filters the flight list to routes that match origin and destination
3. Filters the hotel list to properties at the destination
4. Cross-products every matching flight with every matching hotel
5. Calculates total cost: `flight price + (hotel nightly rate × nights) + (daily spending budget × nights)`
6. Discards any combo that exceeds the user's budget
7. Returns the single cheapest valid combination

Daily spending budgets are hardcoded per destination (e.g. $35/day for Bangkok, $95/day for Amsterdam) and reflect typical tourist spending on food, transport, and activities.

The day-by-day activity plan is pulled from a hardcoded pool of curated activities per destination, cycling through them if the trip is longer than the pool.

---

## The mock data

By default the app uses two static JSON files instead of calling a live API:

**`src/data/flights.json`** — 132 flight entries across 44 routes. Each entry looks like:
```json
{
  "airline": "Air Canada",
  "origin": "YYZ",
  "destination": "CDG",
  "price": 720,
  "currency": "USD",
  "stops": 0,
  "duration": "PT8H"
}
```

**`src/data/hotels.json`** — 75 hotel entries across 15 destinations. Each entry looks like:
```json
{
  "name": "Hôtel du Louvre",
  "stars": 4,
  "pricePerNight": 185,
  "currency": "USD",
  "destination": "CDG"
}
```

Origins and destinations are stored as IATA airport codes so they match directly without any conversion needed during filtering.

**Supported origins:** New York (JFK), Toronto (YYZ), Los Angeles (LAX), Chicago (ORD), Miami (MIA), Vancouver (YVR), Montreal (YUL)

**Supported destinations:** Cancun, London, Paris, Tokyo, Bali, Montego Bay, Punta Cana, Rome, Barcelona, Havana, Honolulu, Bangkok, Nassau, Mexico City, Amsterdam

---

## Database

PostgreSQL stores everything needed to resume or replay a session.

| Table | What it stores |
|---|---|
| `sessions` | One row per browser session (keyed on a UUID) |
| `messages` | Full chat history for each session |
| `travel_preferences` | Accumulated preferences for each session, merged via `COALESCE` |
| `itineraries` | The generated trip option for each session |
| `api_responses` | Raw Amadeus API payloads saved for future reference |

A new session is created each time the page loads. The session UUID is stored in `sessionStorage` on the client (so it clears on page refresh) and sent on every `/api/chat` request via an `X-Session-Id` header.

---

## Optional: live Amadeus data

If you add `AMADEUS_CLIENT_ID` and `AMADEUS_CLIENT_SECRET` to `.env.local`, the app will call the Amadeus Self-Service API instead of using the mock JSON files. The flight and hotel search functions live in `src/lib/apis/amadeus.ts`. Everything downstream (itinerary generation, the trip card) works the same way — the API data is just substituted in place of the mock data.

---

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org)
- [PostgreSQL](https://www.postgresql.org)
- [Ollama](https://ollama.com) — for AI conversation

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Copy the example environment file and fill in your DATABASE_URL
cp .env.example .env.local

# 3. Create the database and run the schema
createdb budgetadvisor
psql -d budgetadvisor -f src/db/schema.sql

# 4. Pull the AI model
ollama pull llama3.2

# 5. Start the dev server
npm run dev
# Open http://localhost:3000
```

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `DEFAULT_SESSION_ID` | Yes | Fallback UUID used when no session header is present |
| `OLLAMA_BASE_URL` | No | Defaults to `http://localhost:11434` |
| `OLLAMA_MODEL` | No | Defaults to `llama3.2` |
| `AMADEUS_CLIENT_ID` | No | Enables live flight and hotel data |
| `AMADEUS_CLIENT_SECRET` | No | Enables live flight and hotel data |

### Usage tips

The assistant accepts natural language — you don't need a specific format. All of these work:

```
Budget $3000, Origin Toronto, destination Paris, duration 7 days

I only have $3000 and I want to go to Paris from Toronto for a week

My budget is around three thousand dollars. I live in Toronto.
I'd love to visit Paris for about 7 days.
```
