import { Suspense } from "react";
import Header from "@/components/Header";
import ChatPanel from "@/components/ChatPanel";
import TripResultsPanel from "@/components/TripResultsPanel";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <div className="flex flex-col h-full bg-ocean-950">
      <Header />

      {/* Hero tagline — visible on mobile only */}
      <div className="sm:hidden px-4 py-3 border-b border-ocean-700 bg-ocean-950">
        <p className="text-gray-400 text-sm text-center">
          Find the cheapest trip that fits your life.
        </p>
      </div>

      {/* Main two-panel layout */}
      <main className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Chat panel — 40% on desktop, full-width on mobile */}
        <div className="w-full md:w-[40%] md:min-w-[320px] md:max-w-[480px] flex-shrink-0 h-[50vh] md:h-full">
          <ChatPanel initialMessages={[]} />
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px bg-ocean-700" />

        {/* Trip results panel — remaining width */}
        <div className="flex-1 overflow-hidden h-[50vh] md:h-full">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full bg-ocean-950">
                <p className="text-gray-500 text-sm animate-pulse">
                  Loading itineraries...
                </p>
              </div>
            }
          >
            <TripResultsPanel />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
