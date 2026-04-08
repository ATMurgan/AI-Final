import type { Itinerary } from "@/types";
import ItineraryCard from "./ItineraryCard";

interface Props {
  itineraries: Itinerary[];
}

export default function TripResultsPanel({ itineraries }: Props) {
  return (
    <div className="flex flex-col h-full bg-ocean-950 overflow-y-auto">
      {/* Panel header */}
      <div className="px-6 py-4 border-b border-ocean-700 sticky top-0 bg-ocean-950 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-gray-100 font-semibold text-sm">
              Recommended Itineraries
            </h2>
            <p className="text-gray-500 text-xs mt-0.5">
              Sorted by total estimated cost · lowest first
            </p>
          </div>
          <span className="text-xs text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded-full">
            {itineraries.length} result{itineraries.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {itineraries.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center flex-1 gap-4 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-ocean-800 border border-ocean-700 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-ocean-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 16l4.553 2.276A1 1 0 0021 24.382V8.618a1 1 0 00-1.447-.894L15 10m0 13V10m0 0L9 7"
              />
            </svg>
          </div>
          <div>
            <p className="text-gray-300 font-medium text-sm">
              Your trip options will appear here
            </p>
            <p className="text-gray-600 text-xs mt-1 max-w-xs">
              Tell the assistant your budget, where you&apos;re flying from,
              destination, and how many days — then sit back.
            </p>
          </div>
          <div className="mt-2 flex flex-col gap-1.5 text-left w-full max-w-xs">
            {[
              { icon: "💰", text: 'Budget  (e.g. "$1500 USD")' },
              { icon: "🛫", text: 'Origin  (e.g. "Toronto" or "JFK")' },
              { icon: "📍", text: 'Destination  (e.g. "Cancun", "Paris")' },
              { icon: "📅", text: 'Duration  (e.g. "7 days")' },
            ].map(({ icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-2 bg-ocean-800/50 rounded-lg px-3 py-2"
              >
                <span className="text-base">{icon}</span>
                <span className="text-gray-400 text-xs">{text}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Cards grid */
        <div className="flex-1 px-6 py-5 grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4 content-start">
          {itineraries.map((itinerary, index) => (
            <ItineraryCard
              key={itinerary.id}
              itinerary={itinerary}
              rank={index + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
