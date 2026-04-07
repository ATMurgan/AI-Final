import type { Itinerary } from "@/types";

interface Props {
  itinerary: Itinerary;
  rank: number;
}

function StarRating({ stars }: { stars: number }) {
  return (
    <span className="text-amber-400 text-xs">
      {"★".repeat(stars)}
      {"☆".repeat(5 - stars)}
    </span>
  );
}

export default function ItineraryCard({ itinerary, rank }: Props) {
  const { destination, countryFlag, nights, totalCost, flight, hotel, dailyBudget } =
    itinerary;

  return (
    <div className="bg-ocean-800 border border-ocean-700 rounded-2xl p-5 flex flex-col gap-4 hover:border-coral-500 transition-colors">
      {/* Destination heading */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{countryFlag}</span>
            <div>
              <h3 className="text-white font-semibold text-base leading-tight">
                {destination}
              </h3>
              <p className="text-gray-400 text-xs mt-0.5">{nights} nights</p>
            </div>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-cyan-400 font-bold text-xl">
            ${totalCost.toLocaleString()}
          </p>
          <p className="text-gray-500 text-xs">total est. cost</p>
        </div>
      </div>

      {/* Rank badge */}
      <div className="flex items-center gap-1.5">
        {rank === 1 && (
          <span className="bg-coral-500/20 text-coral-400 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-coral-500/30">
            CHEAPEST
          </span>
        )}
        {rank === 2 && (
          <span className="bg-blue-500/20 text-blue-400 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-blue-500/30">
            2ND BEST VALUE
          </span>
        )}
        {rank >= 3 && (
          <span className="bg-gray-700 text-gray-400 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-gray-600">
            OPTION {rank}
          </span>
        )}
      </div>

      {/* Cost breakdown */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-ocean-950/60 rounded-xl py-2 px-1">
          <p className="text-gray-400 text-[10px] uppercase tracking-wide mb-0.5">Flight</p>
          <p className="text-white text-sm font-semibold">${flight.price}</p>
        </div>
        <div className="bg-ocean-950/60 rounded-xl py-2 px-1">
          <p className="text-gray-400 text-[10px] uppercase tracking-wide mb-0.5">Hotel</p>
          <p className="text-white text-sm font-semibold">${hotel.pricePerNight}/n</p>
        </div>
        <div className="bg-ocean-950/60 rounded-xl py-2 px-1">
          <p className="text-gray-400 text-[10px] uppercase tracking-wide mb-0.5">Daily</p>
          <p className="text-white text-sm font-semibold">${dailyBudget}</p>
        </div>
      </div>

      {/* Flight info */}
      <div className="flex items-center gap-2 text-sm">
        <svg
          className="w-4 h-4 text-gray-500 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
          />
        </svg>
        <span className="text-gray-300">
          {flight.origin} → {flight.destination}
        </span>
        <span className="text-gray-600">·</span>
        <span className="text-gray-400 text-xs">{flight.airline}</span>
      </div>

      {/* Hotel info */}
      <div className="flex items-center gap-2 text-sm">
        <svg
          className="w-4 h-4 text-gray-500 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        <span className="text-gray-300">{hotel.name}</span>
        <StarRating stars={hotel.stars} />
      </div>

      {/* CTA */}
      <button className="mt-1 w-full py-2 rounded-xl border border-coral-500 text-coral-400 text-sm font-medium hover:bg-coral-500 hover:text-white transition-colors">
        View Details
      </button>
    </div>
  );
}
