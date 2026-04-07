"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChatMessage as ChatMessageType, ChatResponse } from "@/types";
import ChatMessage from "./ChatMessage";

interface Props {
  initialMessages: ChatMessageType[];
}

export default function ChatPanel({ initialMessages }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessageType[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string | null>(null);

  // On mount: generate a fresh session UUID (stored in sessionStorage so it
  // survives in-page navigation but clears on refresh/tab close), then register
  // it server-side so the DB row and HttpOnly cookie are created.
  useEffect(() => {
    let sid = sessionStorage.getItem("ba_session_id");
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem("ba_session_id", sid);
    }
    sessionIdRef.current = sid;

    fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sid }),
    }).catch((err) => console.error("[ChatPanel] session init error:", err));
  }, []);

  function scrollToBottom() {
    setTimeout(
      () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      50
    );
  }

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setInput("");

    const timestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Optimistic update — show the message immediately with a temp id
    const optimisticId = `optimistic-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: optimisticId, role: "user", content: trimmed, timestamp },
    ]);
    scrollToBottom();

    // Show typing indicator
    const typingId = `typing-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: typingId, role: "assistant", content: "Thinking..." },
    ]);
    scrollToBottom();

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (sessionIdRef.current) headers["X-Session-Id"] = sessionIdRef.current;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({ content: trimmed, timestamp }),
      });

      if (!res.ok) throw new Error("Chat request failed");
      const data: ChatResponse = await res.json();

      // Replace optimistic message with server-saved user message,
      // replace typing indicator with AI response
      setMessages((prev) =>
        prev
          .map((m) => (m.id === optimisticId ? data.userMessage : m))
          .map((m) => (m.id === typingId ? data.aiMessage : m))
      );
      scrollToBottom();

      // If itineraries were generated, refresh server components
      if (data.itinerariesGenerated) {
        router.refresh();
      }
    } catch (err) {
      console.error("[ChatPanel] send error:", err);
      // Remove optimistic message and typing indicator, restore input
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
    <div className="flex flex-col h-full bg-ocean-900 border-r border-ocean-700">
      {/* Panel header */}
      <div className="px-4 py-3 border-b border-ocean-700">
        <h2 className="text-gray-100 font-medium text-sm">Trip Assistant</h2>
        <p className="text-gray-500 text-xs mt-0.5">
          Tell me your budget, origin, and travel preferences
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="px-4 py-3 border-t border-ocean-700 bg-ocean-900">
        <div className="flex items-center gap-2 bg-ocean-800 rounded-xl px-3 py-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. $1500 budget, flying from NYC, 7 days..."
            className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-500 outline-none"
            disabled={isSending}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className="w-8 h-8 rounded-lg bg-coral-500 hover:bg-coral-400 disabled:bg-ocean-700 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
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
        <p className="text-gray-600 text-[10px] mt-1.5 text-center">
          {isSending ? "Thinking..." : "Press Enter to send"}
        </p>
      </div>
    </div>
  );
}
