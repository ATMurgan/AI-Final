import flightsData from "@/data/flights.json";
import hotelsData from "@/data/hotels.json";
import type { AmadeusSearchResults, FlightSearchResult, HotelSearchResult } from "./types";
import type { TravelPreferences } from "@/types/preferences";
import type { GeneratedItinerary } from "@/types/preferences";

// ----------------------------------------------------------------
// City name / alias → IATA airport/city code
// Covers common ways users might type origins and destinations.
// ----------------------------------------------------------------
const CITY_TO_IATA: Record<string, string> = {
  // Origins
  "new york":           "JFK",
  "new york city":      "JFK",
  "nyc":                "JFK",
  "jfk":                "JFK",
  "ewr":                "JFK",
  "toronto":            "YYZ",
  "yyz":                "YYZ",
  "los angeles":        "LAX",
  "la":                 "LAX",
  "lax":                "LAX",
  "chicago":            "ORD",
  "ord":                "ORD",
  "vancouver":          "YVR",
  "yvr":                "YVR",
  "miami":              "MIA",
  "mia":                "MIA",
  "montreal":           "YUL",
  "yul":                "YUL",
  // Destinations
  "cancun":             "CUN",
  "cancún":             "CUN",
  "cun":                "CUN",
  "london":             "LHR",
  "lhr":                "LHR",
  "lon":                "LHR",   // city code Ollama may use
  "heathrow":           "LHR",
  "paris":              "CDG",
  "cdg":                "CDG",
  "par":                "CDG",   // city code Ollama may use
  "charles de gaulle":  "CDG",
  "tokyo":              "NRT",
  "nrt":                "NRT",
  "tyo":                "NRT",   // city code Ollama may use
  "hnd":                "NRT",   // Haneda — redirect to NRT
  "narita":             "NRT",
  "bali":               "DPS",
  "dps":                "DPS",
  "denpasar":           "DPS",
  "jamaica":            "MBJ",
  "montego bay":        "MBJ",
  "mbj":                "MBJ",
  "punta cana":         "PUJ",
  "dominican":          "PUJ",
  "dominican republic": "PUJ",
  "puj":                "PUJ",
  "rome":               "FCO",
  "roma":               "FCO",
  "fco":                "FCO",
  "rom":                "FCO",   // city code Ollama may use
  "italy":              "FCO",
  "barcelona":          "BCN",
  "bcn":                "BCN",
  "spain":              "BCN",
  "cuba":               "HAV",
  "havana":             "HAV",
  "hav":                "HAV",
  "hawaii":             "HNL",
  "honolulu":           "HNL",
  "hnl":                "HNL",
  "oahu":               "HNL",
  "bangkok":            "BKK",
  "thailand":           "BKK",
  "bkk":                "BKK",
  "suvarnabhumi":       "BKK",
  "nassau":             "NAS",
  "bahamas":            "NAS",
  "nas":                "NAS",
  "mexico city":        "MEX",
  "mexico":             "MEX",
  "mex":                "MEX",
  "cdmx":               "MEX",
  "amsterdam":          "AMS",
  "ams":                "AMS",
  "netherlands":        "AMS",
  "holland":            "AMS",
};

// IATA → human-readable destination for display on itinerary cards
const IATA_TO_DESTINATION: Record<string, string> = {
  CUN: "Cancun, Mexico",
  LHR: "London, United Kingdom",
  CDG: "Paris, France",
  NRT: "Tokyo, Japan",
  DPS: "Bali, Indonesia",
  MBJ: "Montego Bay, Jamaica",
  PUJ: "Punta Cana, Dominican Republic",
  FCO: "Rome, Italy",
  BCN: "Barcelona, Spain",
  HAV: "Havana, Cuba",
  HNL: "Honolulu, Hawaii",
  BKK: "Bangkok, Thailand",
  NAS: "Nassau, Bahamas",
  MEX: "Mexico City, Mexico",
  AMS: "Amsterdam, Netherlands",
};

// IATA → country flag emoji
const IATA_TO_FLAG: Record<string, string> = {
  CUN: "🇲🇽",
  LHR: "🇬🇧",
  CDG: "🇫🇷",
  NRT: "🇯🇵",
  DPS: "🇮🇩",
  MBJ: "🇯🇲",
  PUJ: "🇩🇴",
  FCO: "🇮🇹",
  BCN: "🇪🇸",
  HAV: "🇨🇺",
  HNL: "🇺🇸",
  BKK: "🇹🇭",
  NAS: "🇧🇸",
  MEX: "🇲🇽",
  AMS: "🇳🇱",
};

// Typical daily spending budget per destination (food, transport, activities)
export const DAILY_BUDGET_BY_DEST: Record<string, number> = {
  CUN: 60,
  LHR: 100,
  CDG: 95,
  NRT: 80,
  DPS: 45,
  MBJ: 70,
  PUJ: 65,
  FCO: 90,
  BCN: 85,
  HAV: 40,
  HNL: 110,
  BKK: 35,
  NAS: 80,
  MEX: 50,
  AMS: 95,
};

export function toIATA(input: string): string {
  const key = input.toLowerCase().trim();
  return CITY_TO_IATA[key] ?? input.toUpperCase().trim();
}

// ----------------------------------------------------------------
// Types that match the JSON file shapes (hotels have a `destination`
// field that is not part of HotelSearchResult — stripped on return)
// ----------------------------------------------------------------
type RawHotel = HotelSearchResult & { destination: string };

// ----------------------------------------------------------------
// searchAllMock
// Filters the static JSON data to match the user's preferences.
// ----------------------------------------------------------------
export function searchAllMock(prefs: TravelPreferences): AmadeusSearchResults {
  const originCode = prefs.origin ? toIATA(prefs.origin) : null;
  const destCode   = prefs.destination ? toIATA(prefs.destination) : null;

  const flights: FlightSearchResult[] = (flightsData as FlightSearchResult[]).filter((f) => {
    if (originCode && f.origin !== originCode) return false;
    if (destCode   && f.destination !== destCode) return false;
    if (prefs.maxLayovers !== null && prefs.maxLayovers !== undefined && f.stops > prefs.maxLayovers) return false;
    return true;
  });

  const hotels: HotelSearchResult[] = (hotelsData as RawHotel[])
    .filter((h) => {
      if (destCode && h.destination !== destCode) return false;
      if (prefs.hotelMinStars !== null && prefs.hotelMinStars !== undefined && h.stars < prefs.hotelMinStars) return false;
      if (prefs.hotelMaxStars !== null && prefs.hotelMaxStars !== undefined && h.stars > prefs.hotelMaxStars) return false;
      return true;
    })
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .map(({ destination: _dest, ...rest }) => rest as HotelSearchResult);

  return { flights, hotels, errors: [] };
}

// ----------------------------------------------------------------
// generateItinerariesFromData
// Cross-products the filtered flights × hotels, calculates total cost
// for each combo, and returns the single cheapest option within budget.
// No Ollama call needed — pure math from the pre-filtered API data.
// ----------------------------------------------------------------
export function generateItinerariesFromData(
  prefs: TravelPreferences,
  apiData: AmadeusSearchResults
): GeneratedItinerary[] {
  const nights     = prefs.tripLengthDays ?? 7;
  const budget     = prefs.budget ?? Infinity;
  const destCode   = prefs.destination ? toIATA(prefs.destination) : null;
  const flightDest = apiData.flights[0]?.destination ?? destCode ?? "???";

  // Resolve daily spending budget, destination label, and flag from IATA code
  const dailyBudget =
    DAILY_BUDGET_BY_DEST[destCode ?? ""] ??
    DAILY_BUDGET_BY_DEST[flightDest] ??
    70;

  const destination =
    IATA_TO_DESTINATION[destCode ?? ""] ??
    IATA_TO_DESTINATION[flightDest] ??
    prefs.destination ??
    flightDest;

  const countryFlag =
    IATA_TO_FLAG[destCode ?? ""] ??
    IATA_TO_FLAG[flightDest] ??
    "🌍";

  // Build all valid flight+hotel combos within budget
  const candidates: GeneratedItinerary[] = [];

  for (const flight of apiData.flights) {
    for (const hotel of apiData.hotels) {
      const totalCost = Math.round(
        flight.price + hotel.pricePerNight * nights + dailyBudget * nights
      );
      if (totalCost > budget) continue;

      candidates.push({
        destination,
        countryFlag,
        nights,
        totalCost,
        flight: {
          airline:     flight.airline,
          origin:      flight.origin,
          destination: flight.destination,
          price:       flight.price,
        },
        hotel: {
          name:          hotel.name,
          stars:         hotel.stars,
          pricePerNight: hotel.pricePerNight,
        },
        dailyBudget,
      });
    }
  }

  // Sort cheapest first and return the single best option
  candidates.sort((a, b) => a.totalCost - b.totalCost);
  return candidates.length > 0 ? [candidates[0]] : [];
}
