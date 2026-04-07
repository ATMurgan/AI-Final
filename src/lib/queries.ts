import sql from "@/lib/db";
import type { ChatMessage, Itinerary } from "@/types";
import type { TravelPreferences, PreferencesUpdate, GeneratedItinerary } from "@/types/preferences";

const DEFAULT_SESSION_ID =
  process.env.DEFAULT_SESSION_ID ?? "00000000-0000-0000-0000-000000000001";

// ----------------------------------------------------------------
// ensureSession
// Creates the session row if it doesn't exist (idempotent).
// Called before the first query in any new session.
// ----------------------------------------------------------------
export async function ensureSession(sid: string): Promise<void> {
  await sql`
    INSERT INTO sessions (id) VALUES (${sid}::uuid) ON CONFLICT DO NOTHING
  `;
}

// ----------------------------------------------------------------
// getMessages
// ----------------------------------------------------------------
export async function getMessages(sid = DEFAULT_SESSION_ID): Promise<ChatMessage[]> {
  const rows = await sql<
    {
      id: string;
      role: "user" | "assistant";
      content: string;
      timestamp: string | null;
    }[]
  >`
    SELECT id::text, role, content, timestamp
    FROM messages
    WHERE session_id = ${sid}::uuid
    ORDER BY created_at ASC
  `;

  return rows.map((row) => ({
    id: row.id,
    role: row.role,
    content: row.content,
    timestamp: row.timestamp ?? undefined,
  }));
}

// ----------------------------------------------------------------
// addMessage
// ----------------------------------------------------------------
export async function addMessage(
  role: "user" | "assistant",
  content: string,
  timestamp?: string,
  sid = DEFAULT_SESSION_ID
): Promise<ChatMessage> {
  const [row] = await sql<
    {
      id: string;
      role: "user" | "assistant";
      content: string;
      timestamp: string | null;
    }[]
  >`
    INSERT INTO messages (session_id, role, content, timestamp)
    VALUES (${sid}::uuid, ${role}, ${content}, ${timestamp ?? null})
    RETURNING id::text, role, content, timestamp
  `;

  return {
    id: row.id,
    role: row.role,
    content: row.content,
    timestamp: row.timestamp ?? undefined,
  };
}

// ----------------------------------------------------------------
// getItineraries
// ----------------------------------------------------------------
export async function getItineraries(sid = DEFAULT_SESSION_ID): Promise<Itinerary[]> {
  const rows = await sql<
    {
      id: string;
      destination: string;
      country_flag: string;
      nights: number;
      total_cost: string;
      flight_airline: string;
      flight_origin: string;
      flight_destination: string;
      flight_price: string;
      hotel_name: string;
      hotel_stars: number;
      hotel_price_per_night: string;
      daily_budget: string;
    }[]
  >`
    SELECT
      id::text,
      destination,
      country_flag,
      nights,
      total_cost,
      flight_airline,
      flight_origin,
      flight_destination,
      flight_price,
      hotel_name,
      hotel_stars,
      hotel_price_per_night,
      daily_budget
    FROM itineraries
    WHERE session_id = ${sid}::uuid
    ORDER BY total_cost ASC
  `;

  return rows.map((row) => ({
    id: row.id,
    destination: row.destination,
    countryFlag: row.country_flag,
    nights: row.nights,
    totalCost: Number(row.total_cost),
    flight: {
      airline: row.flight_airline,
      origin: row.flight_origin,
      destination: row.flight_destination,
      price: Number(row.flight_price),
    },
    hotel: {
      name: row.hotel_name,
      stars: row.hotel_stars,
      pricePerNight: Number(row.hotel_price_per_night),
    },
    dailyBudget: Number(row.daily_budget),
  }));
}

// ----------------------------------------------------------------
// getPreferences
// ----------------------------------------------------------------
export async function getPreferences(sid = DEFAULT_SESSION_ID): Promise<TravelPreferences | null> {
  const rows = await sql<
    {
      budget: string | null;
      currency: string;
      origin: string | null;
      destination: string | null;
      trip_length_days: number | null;
      interests: string[] | null;
      hotel_min_stars: number | null;
      hotel_max_stars: number | null;
      max_layovers: number | null;
      departure_date: string | null;
      return_date: string | null;
      is_complete: boolean;
    }[]
  >`
    SELECT budget, currency, origin, destination, trip_length_days,
           interests, hotel_min_stars, hotel_max_stars, max_layovers,
           departure_date, return_date, is_complete
    FROM travel_preferences
    WHERE session_id = ${sid}::uuid
  `;

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    budget: row.budget ? Number(row.budget) : null,
    currency: row.currency,
    origin: row.origin,
    destination: row.destination,
    tripLengthDays: row.trip_length_days,
    interests: row.interests ?? [],
    hotelMinStars: row.hotel_min_stars,
    hotelMaxStars: row.hotel_max_stars,
    maxLayovers: row.max_layovers,
    departureDate: row.departure_date,
    returnDate: row.return_date,
    isComplete: row.is_complete,
  };
}

// ----------------------------------------------------------------
// upsertPreferences
// ----------------------------------------------------------------
export async function upsertPreferences(
  update: PreferencesUpdate,
  isComplete: boolean,
  sid = DEFAULT_SESSION_ID
): Promise<TravelPreferences> {
  const rows = await sql<
    {
      budget: string | null;
      currency: string;
      origin: string | null;
      destination: string | null;
      trip_length_days: number | null;
      interests: string[] | null;
      hotel_min_stars: number | null;
      hotel_max_stars: number | null;
      max_layovers: number | null;
      departure_date: string | null;
      return_date: string | null;
      is_complete: boolean;
    }[]
  >`
    INSERT INTO travel_preferences (
      session_id, budget, currency, origin, destination, trip_length_days,
      interests, hotel_min_stars, hotel_max_stars, max_layovers,
      departure_date, return_date, is_complete
    ) VALUES (
      ${sid}::uuid,
      ${update.budget ?? null},
      ${update.currency ?? "USD"},
      ${update.origin ?? null},
      ${update.destination ?? null},
      ${update.tripLengthDays ?? null},
      ${update.interests ?? []},
      ${update.hotelMinStars ?? null},
      ${update.hotelMaxStars ?? null},
      ${update.maxLayovers ?? null},
      ${update.departureDate ?? null},
      ${update.returnDate ?? null},
      ${isComplete}
    )
    ON CONFLICT (session_id) DO UPDATE SET
      budget = COALESCE(EXCLUDED.budget, travel_preferences.budget),
      currency = COALESCE(EXCLUDED.currency, travel_preferences.currency),
      origin = COALESCE(EXCLUDED.origin, travel_preferences.origin),
      destination = COALESCE(EXCLUDED.destination, travel_preferences.destination),
      trip_length_days = COALESCE(EXCLUDED.trip_length_days, travel_preferences.trip_length_days),
      interests = (
        SELECT ARRAY(SELECT DISTINCT unnest(
          COALESCE(travel_preferences.interests, '{}') || COALESCE(EXCLUDED.interests, '{}')
        ))
      ),
      hotel_min_stars = COALESCE(EXCLUDED.hotel_min_stars, travel_preferences.hotel_min_stars),
      hotel_max_stars = COALESCE(EXCLUDED.hotel_max_stars, travel_preferences.hotel_max_stars),
      max_layovers = COALESCE(EXCLUDED.max_layovers, travel_preferences.max_layovers),
      departure_date = COALESCE(EXCLUDED.departure_date, travel_preferences.departure_date),
      return_date = COALESCE(EXCLUDED.return_date, travel_preferences.return_date),
      is_complete = EXCLUDED.is_complete,
      updated_at = now()
    RETURNING budget, currency, origin, destination, trip_length_days,
              interests, hotel_min_stars, hotel_max_stars, max_layovers,
              departure_date, return_date, is_complete
  `;

  const row = rows[0];
  return {
    budget: row.budget ? Number(row.budget) : null,
    currency: row.currency,
    origin: row.origin,
    destination: row.destination,
    tripLengthDays: row.trip_length_days,
    interests: row.interests ?? [],
    hotelMinStars: row.hotel_min_stars,
    hotelMaxStars: row.hotel_max_stars,
    maxLayovers: row.max_layovers,
    departureDate: row.departure_date,
    returnDate: row.return_date,
    isComplete: row.is_complete,
  };
}

// ----------------------------------------------------------------
// insertItineraries
// ----------------------------------------------------------------
export async function insertItineraries(
  itineraries: GeneratedItinerary[],
  sid = DEFAULT_SESSION_ID
): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`DELETE FROM itineraries WHERE session_id = ${sid}::uuid`;

    for (const it of itineraries) {
      await tx`
        INSERT INTO itineraries (
          session_id, destination, country_flag, nights, total_cost,
          flight_airline, flight_origin, flight_destination, flight_price,
          hotel_name, hotel_stars, hotel_price_per_night, daily_budget
        ) VALUES (
          ${sid}::uuid,
          ${it.destination}, ${it.countryFlag}, ${it.nights}, ${it.totalCost},
          ${it.flight.airline}, ${it.flight.origin}, ${it.flight.destination}, ${it.flight.price},
          ${it.hotel.name}, ${it.hotel.stars}, ${it.hotel.pricePerNight}, ${it.dailyBudget}
        )
      `;
    }
  });
}

// ----------------------------------------------------------------
// saveApiResponse
// ----------------------------------------------------------------
export async function saveApiResponse(
  apiSource: string,
  requestParams: Record<string, unknown>,
  responseData: Record<string, unknown>,
  sid = DEFAULT_SESSION_ID
): Promise<void> {
  await sql`
    INSERT INTO api_responses (session_id, api_source, request_params, response_data)
    VALUES (
      ${sid}::uuid,
      ${apiSource},
      ${JSON.stringify(requestParams)}::jsonb,
      ${JSON.stringify(responseData)}::jsonb
    )
  `;
}

// ----------------------------------------------------------------
// getConversationForAI
// ----------------------------------------------------------------
export async function getConversationForAI(
  sid = DEFAULT_SESSION_ID
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const rows = await sql<
    { role: "user" | "assistant"; content: string }[]
  >`
    SELECT role, content
    FROM messages
    WHERE session_id = ${sid}::uuid
    ORDER BY created_at ASC
  `;

  return rows.map((r) => ({ role: r.role, content: r.content }));
}
