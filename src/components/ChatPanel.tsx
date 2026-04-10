"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage as ChatMessageType, ChatResponse, Itinerary } from "@/types";
import ChatMessage from "./ChatMessage";

interface Props {
  onItinerariesUpdate: (itineraries: Itinerary[]) => void;
}

export default function ChatPanel({ onItinerariesUpdate }: Props) {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Always create a fresh session on page load (including refresh).
    // This ensures old preferences/itineraries from a previous chat never
    // leak into the new conversation. The ba_session cookie (HttpOnly,
    // survives refresh) is overwritten by /api/session so route.ts can
    // never fall back to a stale session.
    const sid = crypto.randomUUID();
    sessionStorage.setItem("ba_session_id", sid);
    sessionIdRef.current = sid;

    fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sid }),
    })
      .then(() => setSessionReady(true))
      .catch((err) => {
        console.error("[ChatPanel] session init error:", err);
        // Allow sending anyway — X-Session-Id header will still carry the new ID
        setSessionReady(true);
      });
  }, []);

  function scrollToBottom() {
    setTimeout(
      () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      50
    );
  }

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isSending || !sessionReady) return;

    setIsSending(true);
    setInput("");

    const timestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const optimisticId = `optimistic-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: optimisticId, role: "user", content: trimmed, timestamp },
    ]);
    scrollToBottom();

    const typingId = `typing-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: typingId, role: "assistant", content: "Thinking..." },
    ]);
    scrollToBottom();

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (sessionIdRef.current) headers["X-Session-Id"] = sessionIdRef.current;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({ content: trimmed, timestamp }),
      });

      if (!res.ok) throw new Error("Chat request failed");
      const data: ChatResponse = await res.json();

      setMessages((prev) =>
        prev
          .map((m) => (m.id === optimisticId ? data.userMessage : m))
          .map((m) => (m.id === typingId ? data.aiMessage : m))
      );
      scrollToBottom();

      if (data.itinerariesGenerated && data.itineraries) {
        onItinerariesUpdate(data.itineraries);
      }
    } catch (err) {
      console.error("[ChatPanel] send error:", err);
      setMessages((prev) =>
        prev.filter((m) => m.id !== optimisticId && m.id !== typingId)
      );
      setInput(trimmed);
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full border-r border-dawn-700" style={{ background: "#251038" }}>
      {/* Panel header */}
      <div
        className="px-4 py-3 border-b border-dawn-700"
        style={{ background: "linear-gradient(180deg, #3d1650 0%, #251038 100%)" }}
      >
        <h2 className="text-white font-semibold text-sm">Trip Assistant</h2>
        <p className="text-sunrise-100/50 text-xs mt-0.5">
          Tell me your budget, origin, destination, and trip length
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center pb-8">
            <span className="text-4xl">🌅</span>
            <p className="text-gray-300 text-sm font-medium">
              Where do you want to go?
            </p>
            <p className="text-gray-600 text-xs max-w-[220px]">
              Tell me your budget, where you&apos;re flying from, your
              destination, and how many days.
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="px-4 py-3 border-t border-dawn-700" style={{ background: "#251038" }}>
        <div className="flex items-center gap-2 rounded-xl px-3 py-2 border border-dawn-700" style={{ background: "#3d1650" }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. $1500, flying from Toronto, Cancun, 7 days..."
            className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-600 outline-none"
            disabled={isSending || !sessionReady}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isSending || !sessionReady}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-opacity disabled:opacity-30"
            style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)" }}
          >
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
        <p className="text-gray-700 text-[10px] mt-1.5 text-center">
          {isSending ? "Searching for your trip..." : "Press Enter to send"}
        </p>
      </div>
    </div>
  );
}
