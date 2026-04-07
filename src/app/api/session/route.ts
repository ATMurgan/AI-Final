import { NextRequest, NextResponse } from "next/server";
import { ensureSession } from "@/lib/queries";

// POST /api/session
// Called by ChatPanel on mount with a freshly generated session UUID.
// Creates the session row in the DB and sets an HttpOnly cookie so
// server components (TripResultsPanel) can read the session ID after
// router.refresh() calls.
export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json() as { sessionId: string };

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    // Validate it looks like a UUID
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(sessionId)) {
      return NextResponse.json({ error: "Invalid sessionId format" }, { status: 400 });
    }

    await ensureSession(sessionId);

    const response = NextResponse.json({ sessionId }, { status: 201 });

    // Set a session cookie so server components can read the session ID.
    // No Max-Age / Expires = browser session cookie (cleared on tab/window close,
    // but NOT on page refresh). Combined with sessionStorage on the client
    // (which IS cleared on refresh), new sessions are created on every refresh.
    response.cookies.set("ba_session", sessionId, {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
    });

    return response;
  } catch (error) {
    console.error("[POST /api/session]", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
