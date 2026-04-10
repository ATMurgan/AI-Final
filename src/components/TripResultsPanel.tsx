import type { Itinerary } from "@/types";
import ItineraryCard from "./ItineraryCard";

interface Props {
  itineraries: Itinerary[];
}

export default function TripResultsPanel({ itineraries }: Props) {
  const hasResults = itineraries.length > 0;

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: "#180a22" }}>
      {/* Panel header */}
      <div
        className="px-6 py-4 border-b border-dawn-700 sticky top-0 z-10"
        style={{ background: "#180a22" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-sm">Your Trip Plan</h2>
            <p className="text-gray-600 text-xs mt-0.5">
              {hasResults
                ? `${itineraries.length} option${itineraries.length > 1 ? "s" : ""} matching your budget`
                : "Complete the chat to generate your plan"}
            </p>
          </div>
          {hasResults && (
            <span
              className="text-xs text-white px-2.5 py-1 rounded-full font-semibold"
              style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)" }}
            >
              Best Price
            </span>
          )}
        </div>
      </div>

      {!hasResults ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center flex-1 gap-4 px-6 text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #3d1650, #6d2860)" }}
          >
            <span className="text-4xl">🌅</span>
          </div>
          <div>
            <p className="text-gray-300 font-semibold text-base">
              Your trip plan will appear here
            </p>
            <p className="text-gray-600 text-xs mt-1.5 max-w-xs">
              Give the assistant your 4 key details and we&apos;ll find the
              cheapest trip with a full day-by-day itinerary.
            </p>
          </div>
          <div className="mt-2 flex flex-col gap-2 text-left w-full max-w-xs">
            {[
              { icon: "💰", text: 'Budget  (e.g. "$1500 USD")' },
              { icon: "🛫", text: 'Origin  (e.g. "Toronto" or "JFK")' },
              { icon: "📍", text: 'Destination  (e.g. "Cancun", "Paris")' },
              { icon: "📅", text: 'Duration  (e.g. "7 days")' },
            ].map(({ icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 border border-dawn-700"
                style={{ background: "#3d1650" }}
              >
                <span className="text-base">{icon}</span>
                <span className="text-gray-400 text-xs">{text}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-6 py-5 flex flex-col gap-4">
          {itineraries.map((it) => (
            <ItineraryCard key={it.id} itinerary={it} />
          ))}
        </div>
      )}
    </div>
  );
}
