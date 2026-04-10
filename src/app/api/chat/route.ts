import { NextRequest, NextResponse } from "next/server";
import {
  addMessage,
  getConversationForAI,
  getPreferences,
  getItineraries,
  upsertPreferences,
  insertItineraries,
} from "@/lib/queries";
import { processMessage, extractPreferencesFromText } from "@/lib/ai";
import { emptyPreferences } from "@/types/preferences";
import type { PreferencesUpdate } from "@/types/preferences";
import { isAmadeusConfigured, searchAll } from "@/lib/apis/amadeus";
import { searchAllMock, generateItinerariesFromData, toIATA, DAILY_BUDGET_BY_DEST } from "@/lib/apis/mockData";
import type { ChatResponse, Itinerary } from "@/types";

const DEFAULT_SESSION_ID =
  process.env.DEFAULT_SESSION_ID ?? "00000000-0000-0000-0000-000000000001";

// Strips travel-phrase prefixes Ollama tends to include (e.g. "Go to Paris" → "Paris")
// and trailing country suffixes (e.g. "Paris, France" → "Paris").
function normalizeLocationValue(input: string): string {
  const prefixes = [
    "want to go to ", "would like to go to ", "going to ", "go to ",
    "travelling to ", "traveling to ", "travel to ",
    "flying to ", "fly to ", "headed to ", "heading to ", "visit ",
    "flying from ", "departing from ", "leaving from ", "from ",
  ];
  let cleaned = input.trim().toLowerCase();
  for (const prefix of prefixes) {
    if (cleaned.startsWith(prefix)) {
      cleaned = cleaned.slice(prefix.length).trim();
      break;
    }
  }
  // Strip trailing ", Country" (e.g. "Paris, France" → "Paris")
  const commaIdx = cleaned.indexOf(",");
  if (commaIdx > 0) cleaned = cleaned.slice(0, commaIdx).trim();

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function allFieldsPresent(prefs: {
  budget: number | null;
  origin: string | null;
  destination: string | null;
  tripLengthDays: number | null;
}): boolean {
  return (
    prefs.budget !== null &&
    prefs.budget !== undefined &&
    prefs.origin !== null &&
    prefs.origin !== undefined &&
    prefs.destination !== null &&
    prefs.destination !== undefined &&
    prefs.tripLengthDays !== null &&
    prefs.tripLengthDays !== undefined
  );
}

export async function POST(request: NextRequest) {
  const sid =
    request.headers.get("X-Session-Id") ??
    request.cookies.get("ba_session")?.value ??
    DEFAULT_SESSION_ID;

  try {
    const body = await request.json();
    const { content, timestamp } = body as {
      content: string;
      timestamp?: string;
    };

    if (!content?.trim()) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }

    // 1. Load conversation history + preferences BEFORE saving the user message
    const [conversationHistory, currentPreferences] = await Promise.all([
      getConversationForAI(sid),
      getPreferences(sid),
    ]);

    // 2. Save user message to DB
    const userMessage = await addMessage("user", content, timestamp, sid);

    const prefs = currentPreferences ?? emptyPreferences();

    // 3. Call Ollama for conversation + preference extraction.
    const aiResponse = await processMessage(
      conversationHistory,
      prefs,
      content,
      false
    );

    // 4. Safety-net: also run regex keyword extraction on the user message.
    //    Ollama sometimes returns preferencesUpdate: null even when the user
    //    clearly stated their budget, destination, etc.
    const regexExtracted = extractPreferencesFromText(content, prefs);

    // Merge: Ollama's extraction takes priority; regex fills in any gaps.
    const merged: Record<string, unknown> = { ...regexExtracted };
    if (aiResponse.preferencesUpdate) {
      for (const [key, value] of Object.entries(aiResponse.preferencesUpdate)) {
        if (value !== null && value !== undefined) {
          merged[key] = value;
        }
      }
    }

    // Normalize destination/origin: strip phrases Ollama includes (e.g. "Go to Paris" → "Paris")
    if (typeof merged.destination === "string") {
      merged.destination = normalizeLocationValue(merged.destination);
    }
    if (typeof merged.origin === "string") {
      merged.origin = normalizeLocationValue(merged.origin);
    }

    const hasUpdate = Object.keys(merged).length > 0;

    // 5. Upsert the combined preferences
    let updatedPrefs = prefs;
    if (hasUpdate) {
      updatedPrefs = await upsertPreferences(
        merged as PreferencesUpdate,
        aiResponse.isComplete || allFieldsPresent({ ...prefs, ...merged } as typeof prefs),
        sid
      );
    }

    // 6. Generate itineraries if all 4 fields are present AND we haven't
    //    already generated itineraries for this session.
    let itinerariesGenerated = false;
    let finalMessage = aiResponse.message;
    let savedItineraries: Itinerary[] = [];

    const nowComplete = allFieldsPresent(updatedPrefs);

    if (nowComplete) {
      const existing = await getItineraries(sid);

      if (existing.length > 0) {
        // Already have results. Re-deliver them so the right panel stays populated
        // if the user refreshed or React state was cleared.
        savedItineraries = existing;
        itinerariesGenerated = true;
        // Keep Ollama's conversational reply as the message (it's a follow-up chat).
      } else {
        // No results yet — always run the search when all fields are present.
        // Ollama's message is intentionally overridden here: it may say "Here's your
        // plan!" prematurely, but the server is the authoritative source of results.
        const apiData = isAmadeusConfigured()
          ? await searchAll(updatedPrefs)
          : searchAllMock(updatedPrefs);

        const itineraries = generateItinerariesFromData(updatedPrefs, apiData);

        if (itineraries.length > 0) {
          await insertItineraries(itineraries, sid);
          savedItineraries = await getItineraries(sid);
          itinerariesGenerated = true;
          finalMessage =
            `I found the cheapest trip from ${updatedPrefs.origin} to ` +
            `${updatedPrefs.destination} within your $${updatedPrefs.budget?.toLocaleString()} ` +
            `${updatedPrefs.currency} budget for ${updatedPrefs.tripLengthDays} nights — ` +
            `check out the full day-by-day plan on the right! ` +
            `Let me know if you'd like to adjust anything.`;
        } else {
          // Diagnose the specific reason no results were found.
          const destCode = toIATA(updatedPrefs.destination!);
          const nights = updatedPrefs.tripLengthDays!;
          const budget = updatedPrefs.budget!;

          if (apiData.flights.length === 0 && apiData.hotels.length === 0) {
            finalMessage =
              `I couldn't find flights or hotels for a trip from ${updatedPrefs.origin} to ${updatedPrefs.destination}. ` +
              `My database covers routes from New York, Toronto, Los Angeles, Chicago, Miami, Vancouver, and Montreal ` +
              `to destinations like Cancun, London, Paris, Tokyo, Bali, Barcelona, Rome, Bangkok, and more. ` +
              `Would you like to try a different origin or destination?`;
          } else if (apiData.flights.length === 0) {
            finalMessage =
              `I couldn't find any flights from ${updatedPrefs.origin}. ` +
              `Supported origins are: New York, Toronto, Los Angeles, Chicago, Miami, Vancouver, and Montreal. ` +
              `Which of these would you like to fly from?`;
          } else if (apiData.hotels.length === 0) {
            finalMessage =
              `I found flights to that area but no hotels in my database for ${updatedPrefs.destination}. ` +
              `Supported destinations include: Cancun, London, Paris, Tokyo, Bali, Rome, Barcelona, Havana, Honolulu, Bangkok, Nassau, Mexico City, and Amsterdam. ` +
              `Would you like to pick one of these?`;
          } else {
            // Flights and hotels exist — budget is the constraint.
            const cheapestFlight = Math.min(...apiData.flights.map((f) => f.price));
            const cheapestHotel = Math.min(...apiData.hotels.map((h) => h.pricePerNight));
            const dailyBudget = DAILY_BUDGET_BY_DEST[destCode] ?? 70;
            const minCost = Math.round(cheapestFlight + cheapestHotel * nights + dailyBudget * nights);

            finalMessage =
              `The cheapest ${nights}-night trip from ${updatedPrefs.origin} to ${updatedPrefs.destination} I can find ` +
              `costs $${minCost.toLocaleString()} ${updatedPrefs.currency} — ` +
              `$${cheapestFlight.toLocaleString()} for flights, ` +
              `$${cheapestHotel}/night for the most affordable hotel, ` +
              `and ~$${dailyBudget}/day for food and activities. ` +
              `Your budget of $${budget.toLocaleString()} ${updatedPrefs.currency} is a bit short. ` +
              `Would you like to increase your budget, shorten the trip, or try a more affordable destination?`;
          }
        }
      }
    }

    // 7. Save AI message to DB
    const aiMessage = await addMessage("assistant", finalMessage, timestamp, sid);

    const response: ChatResponse = {
      userMessage,
      aiMessage,
      itinerariesGenerated,
      itineraries: itinerariesGenerated ? savedItineraries : undefined,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("[POST /api/chat]", error);

    try {
      const errorMsg = await addMessage(
        "assistant",
        "Sorry, something went wrong. Please try again.",
        undefined,
        sid
      );
      const response: ChatResponse = {
        userMessage: { id: "error", role: "user", content: "" },
        aiMessage: errorMsg,
        itinerariesGenerated: false,
      };
      return NextResponse.json(response, { status: 500 });
    } catch {
      return NextResponse.json(
        { error: "Failed to process chat message" },
        { status: 500 }
      );
    }
  }
}
