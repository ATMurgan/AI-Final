"use client";

import { useState } from "react";
import type { Itinerary } from "@/types";
import ChatPanel from "./ChatPanel";
import TripResultsPanel from "./TripResultsPanel";

export default function ClientApp() {
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);

  return (
    <>
      {/* Hero tagline — mobile only */}
      <div className="sm:hidden px-4 py-3 border-b border-ocean-700 bg-ocean-950">
        <p className="text-gray-400 text-sm text-center">
          Find the cheapest trip that fits your life.
        </p>
      </div>

      {/* Main two-panel layout */}
      <main className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Chat panel — 40% on desktop, full-width on mobile */}
        <div className="w-full md:w-[40%] md:min-w-[320px] md:max-w-[480px] flex-shrink-0 h-[50vh] md:h-full">
          <ChatPanel onItinerariesUpdate={setItineraries} />
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px bg-ocean-700" />

        {/* Trip results panel — remaining width */}
        <div className="flex-1 overflow-hidden h-[50vh] md:h-full overflow-y-auto">
          <TripResultsPanel itineraries={itineraries} />
        </div>
      </main>
    </>
  );
}
