import { NextRequest, NextResponse } from "next/server";
import { getMessages, addMessage } from "@/lib/queries";

// GET /api/messages
// Returns the full message list for the demo session.
export async function GET() {
  try {
    const messages = await getMessages();
    return NextResponse.json(messages);
  } catch (error) {
    console.error("[GET /api/messages]", error);
    return NextResponse.json(
      { error: "Failed to load messages" },
      { status: 500 }
    );
  }
}

// POST /api/messages
// Body: { role: "user" | "assistant", content: string, timestamp?: string }
// Returns: the inserted ChatMessage with a server-generated UUID id.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { role, content, timestamp } = body as {
      role: "user" | "assistant";
      content: string;
      timestamp?: string;
    };

    if (!role || !content) {
      return NextResponse.json(
        { error: "role and content are required" },
        { status: 400 }
      );
    }

    if (role !== "user" && role !== "assistant") {
      return NextResponse.json(
        { error: "role must be 'user' or 'assistant'" },
        { status: 400 }
      );
    }

    const message = await addMessage(role, content, timestamp);
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("[POST /api/messages]", error);
    return NextResponse.json(
      { error: "Failed to save message" },
      { status: 500 }
    );
  }
}
