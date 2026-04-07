import Amadeus from "amadeus";
import type { TravelPreferences } from "@/types/preferences";
import type { AmadeusSearchResults, FlightSearchResult, HotelSearchResult } from "./types";
import { saveApiResponse } from "@/lib/queries";

// ----------------------------------------------------------------
// Amadeus client singleton (HMR-safe)
// ----------------------------------------------------------------
declare global {
  // eslint-disable-next-line no-var
  var __amadeus: Amadeus | undefined;
}

function createAmadeusClient(): Amadeus | null {
  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return new Amadeus({ clientId, clientSecret });
}

const amadeusClient: Amadeus | null =
  process.env.NODE_ENV === "development"
    ? (global.__amadeus ?? (global.__amadeus = createAmadeusClient()!))
    : createAmadeusClient();

export function isAmadeusConfigured(): boolean {
  return amadeusClient !== null;
}

// ----------------------------------------------------------------
// searchFlights
// ----------------------------------------------------------------
export async function searchFlights(
  origin: string,
  destination: string,
  departureDate: string,
  returnDate?: string
): Promise<FlightSearchResult[]> {
  if (!amadeusClient) return [];

  try {
    const params: Record<string, unknown> = {
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate,
      adults: 1,
      max: 10,
      currencyCode: "USD",
    };
    if (returnDate) params.returnDate = returnDate;

    const response = await amadeusClient.shopping.flightOffersSearch.get(
      params as Parameters<typeof amadeusClient.shopping.flightOffersSearch.get>[0]
    );

    // Store raw response for training data
    await saveApiResponse("amadeus_flights", params, {
      count: response.data.length,
      data: response.data,
    });

    return response.data.map((offer: Record<string, unknown>) => {
      const itineraries = offer.itineraries as Array<Record<string, unknown>>;
      const firstItinerary = itineraries?.[0];
      const segments = firstItinerary?.segments as Array<Record<string, unknown>>;
      const price = offer.price as Record<string, unknown>;

      return {
        airline: (segments?.[0]?.carrierCode as string) ?? "Unknown",
        origin,
        destination,
        price: Number(price?.total ?? 0),
        currency: (price?.currency as string) ?? "USD",
        stops: segments ? segments.length - 1 : 0,
        duration: (firstItinerary?.duration as string) ?? "Unknown",
      };
    });
  } catch (error) {
    console.error("[amadeus] Flight search error:", error);
    return [];
  }
}

// ----------------------------------------------------------------
// searchHotels
// ----------------------------------------------------------------
export async function searchHotels(
  cityCode: string,
  checkInDate: string,
  checkOutDate: string,
  ratings?: string,
  currency?: string
): Promise<HotelSearchResult[]> {
  if (!amadeusClient) return [];

  try {
    const params: Record<string, unknown> = {
      cityCode,
      checkInDate,
      checkOutDate,
      adults: 1,
      roomQuantity: 1,
      bestRateOnly: true,
      currency: currency ?? "USD",
    };
    if (ratings) params.ratings = ratings;

    const response = await amadeusClient.shopping.hotelOffersSearch.get(
      params as Parameters<typeof amadeusClient.shopping.hotelOffersSearch.get>[0]
    );

    // Store raw response for training data
    await saveApiResponse("amadeus_hotels", params, {
      count: response.data.length,
      data: response.data,
    });

    return response.data.map((hotel: Record<string, unknown>) => {
      const hotelData = hotel.hotel as Record<string, unknown>;
      const offers = hotel.offers as Array<Record<string, unknown>>;
      const firstOffer = offers?.[0];
      const price = firstOffer?.price as Record<string, unknown>;
      const rating = hotelData?.rating as string;

      return {
        name: (hotelData?.name as string) ?? "Unknown Hotel",
        stars: rating ? Number(rating) : 3,
        pricePerNight: Number(price?.total ?? 0),
        currency: (price?.currency as string) ?? "USD",
      };
    });
  } catch (error) {
    console.error("[amadeus] Hotel search error:", error);
    return [];
  }
}

// ----------------------------------------------------------------
// searchAll
// Runs flight and hotel searches in parallel. Returns partial
// results if one fails.
// ----------------------------------------------------------------
export async function searchAll(
  prefs: TravelPreferences
): Promise<AmadeusSearchResults> {
  if (!amadeusClient || !prefs.origin || !prefs.destination || !prefs.tripLengthDays) {
    return { flights: [], hotels: [], errors: ["Amadeus not configured or preferences incomplete"] };
  }

  // Compute dates: default to 30 days from now if not specified
  const now = new Date();
  const departureDate =
    prefs.departureDate ??
    new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const returnDate =
    prefs.returnDate ??
    new Date(new Date(departureDate).getTime() + prefs.tripLengthDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

  // Build hotel star filter
  const ratings =
    prefs.hotelMinStars && prefs.hotelMaxStars
      ? Array.from(
          { length: prefs.hotelMaxStars - prefs.hotelMinStars + 1 },
          (_, i) => prefs.hotelMinStars! + i
        ).join(",")
      : undefined;

  const errors: string[] = [];

  const [flightsResult, hotelsResult] = await Promise.allSettled([
    searchFlights(prefs.origin, prefs.destination, departureDate, returnDate),
    searchHotels(prefs.destination, departureDate, returnDate, ratings, prefs.currency),
  ]);

  const flights = flightsResult.status === "fulfilled" ? flightsResult.value : [];
  if (flightsResult.status === "rejected") {
    errors.push(`Flight search failed: ${flightsResult.reason}`);
  }

  const hotels = hotelsResult.status === "fulfilled" ? hotelsResult.value : [];
  if (hotelsResult.status === "rejected") {
    errors.push(`Hotel search failed: ${hotelsResult.reason}`);
  }

  return { flights, hotels, errors };
}
