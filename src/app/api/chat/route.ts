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
import { searchAllMock, generateItinerariesFromData } from "@/lib/apis/mockData";
import type { ChatResponse, Itinerary } from "@/types";

const DEFAULT_SESSION_ID =
  process.env.DEFAULT_SESSION_ID ?? "00000000-0000-0000-0000-000000000001";

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
      // Check if this session already has itineraries — don't regenerate
      const existing = await getItineraries(sid);
      if (existing.length === 0) {
        const apiData = isAmadeusConfigured()
          ? await searchAll(updatedPrefs)
          : searchAllMock(updatedPrefs);

        const itineraries = generateItinerariesFromData(updatedPrefs, apiData);

        if (itineraries.length > 0) {
          await insertItineraries(itineraries, sid);
          savedItineraries = await getItineraries(sid);
          itinerariesGenerated = true;
          finalMessage =
            `Great news! I found ${savedItineraries.length} trip option` +
            `${savedItineraries.length > 1 ? "s" : ""} from ${updatedPrefs.origin} to ` +
            `${updatedPrefs.destination} within your $${updatedPrefs.budget?.toLocaleString()} ` +
            `${updatedPrefs.currency} budget for ${updatedPrefs.tripLengthDays} nights — ` +
            `check them out on the right, sorted cheapest first! ` +
            `Let me know if you'd like to adjust anything.`;
        } else {
          finalMessage =
            `I searched but couldn't find trips from ${updatedPrefs.origin} to ` +
            `${updatedPrefs.destination} within your $${updatedPrefs.budget?.toLocaleString()} ` +
            `${updatedPrefs.currency} budget for ${updatedPrefs.tripLengthDays} nights. ` +
            `Try a higher budget, fewer nights, or a different destination.`;
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
