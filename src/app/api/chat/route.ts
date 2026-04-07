import { NextRequest, NextResponse } from "next/server";
import {
  addMessage,
  getConversationForAI,
  getPreferences,
  upsertPreferences,
  insertItineraries,
} from "@/lib/queries";
import { processMessage, isAIConfigured } from "@/lib/ai";
import { emptyPreferences } from "@/types/preferences";
import { isAmadeusConfigured, searchAll } from "@/lib/apis/amadeus";
import type { ChatResponse } from "@/types";

const DEFAULT_SESSION_ID =
  process.env.DEFAULT_SESSION_ID ?? "00000000-0000-0000-0000-000000000001";

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

    // 1. Load conversation history + preferences BEFORE saving the user
    //    message, so it doesn't appear twice in the Ollama context.
    const [conversationHistory, currentPreferences] = await Promise.all([
      getConversationForAI(sid),
      getPreferences(sid),
    ]);

    // 2. Save user message to DB
    const userMessage = await addMessage("user", content, timestamp, sid);

    const prefs = currentPreferences ?? emptyPreferences();

    // 3. Call Ollama (or stub fallback if Ollama is unreachable)
    const aiResponse = await processMessage(
      conversationHistory,
      prefs,
      content,
      false
    );

    // 4. Apply preference updates
    let updatedPrefs = prefs;
    if (aiResponse.preferencesUpdate) {
      updatedPrefs = await upsertPreferences(
        aiResponse.preferencesUpdate,
        aiResponse.isComplete,
        sid
      );
    }

    // 5. Generate itineraries when all required preferences are collected
    let itinerariesGenerated = false;
    let finalMessage = aiResponse.message;

    if (aiResponse.isComplete && updatedPrefs.isComplete) {
      if (isAmadeusConfigured() && isAIConfigured()) {
        // Real Amadeus data → Ollama picks cheapest combos
        const apiData = await searchAll(updatedPrefs);
        const itineraryResponse = await processMessage(
          conversationHistory,
          updatedPrefs,
          content,
          true,
          apiData
        );
        if (itineraryResponse.itineraries?.length) {
          await insertItineraries(itineraryResponse.itineraries, sid);
          itinerariesGenerated = true;
        }
        finalMessage = itineraryResponse.message;
      } else if (isAIConfigured()) {
        // No Amadeus — Ollama generates mock itineraries
        const mockResponse = await processMessage(
          conversationHistory,
          updatedPrefs,
          content,
          true
        );
        if (mockResponse.itineraries?.length) {
          await insertItineraries(mockResponse.itineraries, sid);
          itinerariesGenerated = true;
        }
        finalMessage = mockResponse.message;
      }
    }

    // 6. Save AI message to DB
    const aiMessage = await addMessage("assistant", finalMessage, timestamp, sid);

    const response: ChatResponse = {
      userMessage,
      aiMessage,
      itinerariesGenerated,
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
