import { Ollama } from "ollama";
import type { TravelPreferences, ClaudeStructuredResponse } from "@/types/preferences";
import { emptyPreferences, REQUIRED_PREFERENCE_FIELDS } from "@/types/preferences";
import type { AmadeusSearchResults } from "@/lib/apis/types";

// ----------------------------------------------------------------
// Ollama client singleton (HMR-safe)
// ----------------------------------------------------------------
declare global {
  // eslint-disable-next-line no-var
  var __ollama: Ollama | undefined;
}

function createOllamaClient(): Ollama {
  return new Ollama({
    host: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
  });
}

const ollama: Ollama =
  process.env.NODE_ENV === "development"
    ? (global.__ollama ?? (global.__ollama = createOllamaClient()))
    : createOllamaClient();

const MODEL = process.env.OLLAMA_MODEL ?? "llama3.2";

// isAIConfigured always returns true — Ollama needs no API key.
// Connection errors are caught at call time and fall back to stub.
export function isAIConfigured(): boolean {
  return true;
}

// ----------------------------------------------------------------
// System prompt
// ----------------------------------------------------------------
const SYSTEM_PROMPT = `You are BudgetAdvisor, an AI travel planning assistant. Your job is to help users find the cheapest feasible trip itinerary based on their constraints.

## Your Behavior
- Be friendly, concise, and helpful
- Extract travel preferences from what users say naturally
- When information is missing, ask for it conversationally (one or two questions at a time, not a big list)
- Never make up data the user hasn't provided — only update fields you're confident about
- If the user says something like "$1,500 CAD", set budget to 1500 and currency to "CAD"
- origin can be a city name or IATA airport code (e.g. "Toronto" or "YYZ")

## Required Information (must collect before searching):
- budget (number, in their stated currency)
- origin (city or airport code where they're flying from)
- destination (city, country, or region — if vague like "beach" or "Europe", suggest specific destinations and keep it in missingFields)
- tripLengthDays (number of days)

## Optional Information (ask naturally, don't force):
- currency (default USD)
- interests (e.g., snorkeling, food, nightlife, history)
- hotelMinStars / hotelMaxStars (1-5)
- maxLayovers (0 = nonstop only)
- departureDate / returnDate (ISO format YYYY-MM-DD)

## Response Format
You MUST respond with a single valid JSON object and nothing else.

{
  "message": "string — your natural-language reply to the user",
  "preferencesUpdate": { ... } | null,
  "isComplete": boolean,
  "missingFields": ["field1", "field2"],
  "itineraries": null
}

### preferencesUpdate
Only include fields the user explicitly mentioned or you can confidently infer. Use null if no new info was provided.
Field names: budget, currency, origin, destination, tripLengthDays, interests, hotelMinStars, hotelMaxStars, maxLayovers, departureDate, returnDate.
interests should be an array of strings.

### isComplete
Set to true ONLY when budget, origin, destination, and tripLengthDays are ALL known (from accumulated preferences combined with this update).

### missingFields
List required field names still not set. Empty array when isComplete is true.

### itineraries
Usually null. Only populate when explicitly told to generate itineraries. When generating, create exactly 3 itineraries sorted by totalCost ascending. Each must match this shape exactly:
{
  "destination": "City, Country",
  "countryFlag": "emoji flag",
  "nights": number,
  "totalCost": number,
  "flight": { "airline": "string", "origin": "IATA", "destination": "IATA", "price": number },
  "hotel": { "name": "string", "stars": number, "pricePerNight": number },
  "dailyBudget": number
}
Use real airline names, realistic hotel names, and ensure totalCost = flight.price + (hotel.pricePerNight * nights) + (dailyBudget * nights). All options must fit within the user's budget.`;

// ----------------------------------------------------------------
// processMessage
// Sends the conversation to Ollama and returns a structured response.
// Falls back to generateStubResponse if Ollama is unreachable.
// ----------------------------------------------------------------
export async function processMessage(
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  currentPreferences: TravelPreferences,
  userMessage: string,
  generateItineraries: boolean,
  apiData?: AmadeusSearchResults
): Promise<ClaudeStructuredResponse> {
  // Build message array: system prompt first, then history, then current message
  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  for (const msg of conversationHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }

  // Append context note to the user's message
  let contextNote = `\n\n[Context — accumulated preferences so far: ${JSON.stringify(currentPreferences)}]`;

  if (generateItineraries && apiData) {
    contextNote += `\n\n[Instruction: Preferences are complete. Use the real pricing data below to recommend the 3 cheapest feasible itineraries. Populate the itineraries array.\n\nFlights: ${JSON.stringify(apiData.flights.slice(0, 20))}\nHotels: ${JSON.stringify(apiData.hotels.slice(0, 20))}]`;
  } else if (generateItineraries) {
    contextNote += `\n\n[Instruction: Preferences are complete and no real API data is available. Generate 3 realistic mock itineraries that fit the user's preferences. Populate the itineraries array.]`;
  }

  messages.push({ role: "user", content: userMessage + contextNote });

  try {
    const response = await ollama.chat({
      model: MODEL,
      format: "json",
      messages,
      options: { temperature: 0.7 },
    });

    const parsed = JSON.parse(response.message.content) as ClaudeStructuredResponse;
    return validateResponse(parsed);
  } catch (error) {
    console.error("[ai.ts] Ollama error:", error);

    // Fall back to stub for any Ollama connectivity or model issue
    const shouldFallback =
      error instanceof Error &&
      (error.message.includes("ECONNREFUSED") ||
        error.message.includes("fetch failed") ||
        error.message.includes("connect") ||
        error.message.includes("model") ||
        error.message.includes("not found") ||
        error.message.includes("pull") ||
        error.message.toLowerCase().includes("404") ||
        error.message.toLowerCase().includes("500"));

    if (shouldFallback) {
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(`[ai.ts] Ollama unavailable (${reason}) — using stub fallback. Run: ollama pull ${MODEL}`);
      return generateStubResponse(currentPreferences, userMessage);
    }

    // JSON parse error — return a safe fallback
    if (error instanceof SyntaxError) {
      return {
        message: "I had trouble processing that. Could you rephrase your travel plans?",
        preferencesUpdate: null,
        isComplete: false,
        missingFields: getMissingFields(currentPreferences),
        itineraries: null,
      };
    }

    throw error;
  }
}

// ----------------------------------------------------------------
// generateStubResponse
// Fallback when Ollama is not running. Does basic keyword extraction.
// ----------------------------------------------------------------
export function generateStubResponse(
  currentPreferences: TravelPreferences,
  userMessage: string
): ClaudeStructuredResponse {
  const prefs = currentPreferences ?? emptyPreferences();
  const update: Record<string, unknown> = {};
  const lower = userMessage.toLowerCase();

  // Budget extraction
  const budgetMatch = userMessage.match(/\$\s?([\d,]+)/);
  if (budgetMatch) {
    update.budget = Number(budgetMatch[1].replace(/,/g, ""));
  }

  // Currency detection
  if (lower.includes("cad") || lower.includes("canadian")) {
    update.currency = "CAD";
  } else if (lower.includes("eur") || lower.includes("euro")) {
    update.currency = "EUR";
  } else if (lower.includes("gbp") || lower.includes("pound")) {
    update.currency = "GBP";
  }

  // Trip length
  const daysMatch = lower.match(/(\d+)\s*(?:day|night)/);
  if (daysMatch) update.tripLengthDays = Number(daysMatch[1]);

  // IATA code (3 uppercase letters)
  const iataMatch = userMessage.match(/\b([A-Z]{3})\b/);
  if (iataMatch && !prefs.origin) update.origin = iataMatch[1];

  // Common origin cities
  for (const city of ["toronto", "new york", "nyc", "los angeles", "chicago", "vancouver", "montreal"]) {
    if (lower.includes(city) && !prefs.origin) {
      update.origin = city.charAt(0).toUpperCase() + city.slice(1);
      break;
    }
  }

  // Common destinations
  for (const dest of ["cancun", "cancún", "mexico", "jamaica", "punta cana", "dominican", "bahamas", "cuba", "hawaii", "bali", "thailand", "paris", "london", "tokyo"]) {
    if (lower.includes(dest) && !prefs.destination) {
      update.destination = dest.charAt(0).toUpperCase() + dest.slice(1);
      break;
    }
  }

  const hasUpdate = Object.keys(update).length > 0;
  const merged = { ...prefs, ...(hasUpdate ? update : {}) };
  const missing = getMissingFields(merged as TravelPreferences);
  const isComplete = missing.length === 0;

  let message: string;
  const fieldLabels: Record<string, string> = {
    budget: "your budget",
    origin: "where you're flying from",
    destination: "where you'd like to go",
    tripLengthDays: "how many days you'd like to travel",
  };

  if (isComplete) {
    message = "I have all the details I need! Let me search for the best deals for you. (Ollama is not running — start it with `ollama serve` for full AI responses.)";
  } else if (missing.length === 1) {
    message = `Thanks! Just one more thing — ${fieldLabels[missing[0]] ?? missing[0]}?`;
  } else {
    message = `Thanks! To find you the best deals, I still need: ${missing.map((f) => fieldLabels[f] ?? f).join(", ")}. (Ollama is not running — start it with \`ollama serve\` for full AI responses.)`;
  }

  return {
    message,
    preferencesUpdate: hasUpdate ? (update as ClaudeStructuredResponse["preferencesUpdate"]) : null,
    isComplete,
    missingFields: missing,
    itineraries: null,
  };
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
function getMissingFields(prefs: TravelPreferences | Record<string, unknown>): string[] {
  return REQUIRED_PREFERENCE_FIELDS.filter((field) => {
    const value = (prefs as Record<string, unknown>)[field];
    return value === null || value === undefined;
  });
}

function validateResponse(raw: ClaudeStructuredResponse): ClaudeStructuredResponse {
  return {
    message: typeof raw.message === "string" ? raw.message : "I'm here to help with your trip planning!",
    preferencesUpdate: raw.preferencesUpdate ?? null,
    isComplete: typeof raw.isComplete === "boolean" ? raw.isComplete : false,
    missingFields: Array.isArray(raw.missingFields) ? raw.missingFields : [],
    itineraries: Array.isArray(raw.itineraries) ? raw.itineraries : null,
  };
}
