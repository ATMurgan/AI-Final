import type { ChatMessage as ChatMessageType } from "@/types";

interface Props {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold mt-1 ${
          isUser ? "text-white" : "bg-dawn-700 text-gray-300"
        }`}
        style={isUser ? { background: "linear-gradient(135deg, #f59e0b, #ea580c)" } : {}}
      >
        {isUser ? "U" : "AI"}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "text-white rounded-tr-sm"
            : "bg-dawn-800 text-gray-100 rounded-tl-sm border border-dawn-700"
        }`}
        style={isUser ? { background: "linear-gradient(135deg, #ea580c, #c2410c)" } : {}}
      >
        {message.content}
        {message.timestamp && (
          <p
            className={`text-[10px] mt-1 ${
              isUser ? "text-sunrise-100/60" : "text-gray-500"
            }`}
          >
            {message.timestamp}
          </p>
        )}
      </div>
    </div>
  );
}
