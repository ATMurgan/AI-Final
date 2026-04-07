import { cookies } from "next/headers";
import { getItineraries } from "@/lib/queries";
import ItineraryCard from "./ItineraryCard";

export default async function TripResultsPanel() {
  const cookieStore = await cookies();
  const sid = cookieStore.get("ba_session")?.value;
  const itineraries = await getItineraries(sid);

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
            {itineraries.length} results
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 px-6 py-5 grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4 content-start">
        {itineraries.map((itinerary, index) => (
          <ItineraryCard
            key={itinerary.id}
            itinerary={itinerary}
            rank={index + 1}
          />
        ))}
      </div>
    </div>
  );
}
