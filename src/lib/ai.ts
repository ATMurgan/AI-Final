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
- destination (the city or country name ONLY — e.g. "Paris", "Tokyo", "Cancun". NEVER include a phrase like "go to Paris" or "Paris, France". If vague like "beach" or "Europe", suggest specific destinations and keep it in missingFields)
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
function generateStubResponse(
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
// extractPreferencesFromText
// Regex-based keyword extraction. Used as a safety net alongside
// Ollama's extraction — catches fields Ollama may fail to populate.
// Returns only the fields it found (caller merges with Ollama's).
// ----------------------------------------------------------------
export function extractPreferencesFromText(
  userMessage: string,
  existingPrefs: TravelPreferences
): Record<string, unknown> {
  const update: Record<string, unknown> = {};
  const lower = userMessage.toLowerCase();

  // Budget: "$1500", "$ 2,000", "1500 dollars", "budget of 1500", "budget is 1500"
  const budgetMatch = userMessage.match(/\$\s?([\d,]+)/) ??
    lower.match(/(\d[\d,]*)\s*(?:dollar|usd|cad|eur|gbp)/) ??
    lower.match(/budget\s*(?:of|is|:)?\s*(\d[\d,]*)/);
  if (budgetMatch) {
    update.budget = Number(budgetMatch[1].replace(/,/g, ""));
  }

  // Currency
  if (lower.includes("cad") || lower.includes("canadian")) update.currency = "CAD";
  else if (lower.includes("eur") || lower.includes("euro")) update.currency = "EUR";
  else if (lower.includes("gbp") || lower.includes("pound")) update.currency = "GBP";

  // Trip length: "7 days", "10 nights", "5 day"
  const daysMatch = lower.match(/(\d+)\s*(?:day|night)/);
  if (daysMatch) update.tripLengthDays = Number(daysMatch[1]);

  // Origins (check these BEFORE destinations, so "from Toronto to Cancun" sets both correctly)
  const fromMatch = lower.match(/(?:from|leaving|departing|flying from)\s+([a-z ]+?)(?:\s+to\s|\s*,|\s*\.|$)/);
  const originCities: Record<string, string> = {
    "toronto": "Toronto", "new york": "New York", "nyc": "New York",
    "los angeles": "Los Angeles", "la": "Los Angeles", "chicago": "Chicago",
    "vancouver": "Vancouver", "miami": "Miami", "montreal": "Montreal",
  };
  if (fromMatch && !existingPrefs.origin) {
    const raw = fromMatch[1].trim();
    update.origin = originCities[raw] ?? raw.charAt(0).toUpperCase() + raw.slice(1);
  }
  if (!update.origin && !existingPrefs.origin) {
    for (const [key, label] of Object.entries(originCities)) {
      if (lower.includes(key)) { update.origin = label; break; }
    }
  }
  // IATA code fallback (3 uppercase letters like JFK, YYZ)
  if (!update.origin && !existingPrefs.origin) {
    const iataMatch = userMessage.match(/\b([A-Z]{3})\b/);
    if (iataMatch) update.origin = iataMatch[1];
  }

  // Destinations — include IATA city codes Ollama might output
  const destCities: Record<string, string> = {
    "cancun": "Cancun", "cancún": "Cancun", "cun": "Cancun",
    "london": "London", "lon": "London", "lhr": "London",
    "paris": "Paris", "par": "Paris", "cdg": "Paris",
    "tokyo": "Tokyo", "tyo": "Tokyo", "nrt": "Tokyo", "hnd": "Tokyo",
    "bali": "Bali", "dps": "Bali", "denpasar": "Bali",
    "jamaica": "Jamaica", "montego bay": "Montego Bay", "mbj": "Montego Bay",
    "punta cana": "Punta Cana", "dominican": "Punta Cana", "puj": "Punta Cana",
    "rome": "Rome", "roma": "Rome", "rom": "Rome", "fco": "Rome", "italy": "Rome",
    "barcelona": "Barcelona", "bcn": "Barcelona", "spain": "Barcelona",
    "cuba": "Havana", "havana": "Havana", "hav": "Havana",
    "hawaii": "Honolulu", "honolulu": "Honolulu", "hnl": "Honolulu", "oahu": "Honolulu",
    "bangkok": "Bangkok", "thailand": "Bangkok", "bkk": "Bangkok",
    "nassau": "Nassau", "bahamas": "Nassau", "nas": "Nassau",
    "mexico city": "Mexico City", "mexico": "Mexico City", "mex": "Mexico City", "cdmx": "Mexico City",
    "amsterdam": "Amsterdam", "ams": "Amsterdam", "netherlands": "Amsterdam", "holland": "Amsterdam",
  };
  const toMatch = lower.match(/(?:to|visit|going to|go to|destination)\s+([a-z ]+?)(?:\s+for\s|\s+from\s|\s*,|\s*\.|$)/);
  if (toMatch && !existingPrefs.destination && !update.destination) {
    const raw = toMatch[1].trim();
    update.destination = destCities[raw] ?? raw.charAt(0).toUpperCase() + raw.slice(1);
  }
  if (!update.destination && !existingPrefs.destination) {
    for (const [key, label] of Object.entries(destCities)) {
      if (lower.includes(key)) { update.destination = label; break; }
    }
  }

  return update;
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
