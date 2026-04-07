-- ============================================================
-- BudgetAdvisor — PostgreSQL Schema
-- Run with: psql -d budgetadvisor -f src/db/schema.sql
-- Requires PostgreSQL 13+ (uses gen_random_uuid())
-- ============================================================

-- Drop order respects foreign key constraints
DROP TABLE IF EXISTS api_responses CASCADE;
DROP TABLE IF EXISTS travel_preferences CASCADE;
DROP TABLE IF EXISTS itineraries CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;

-- --------------------------------------------------------
-- sessions
-- One row per user session. For now we use a single fixed
-- demo session so no auth is needed.
-- --------------------------------------------------------
CREATE TABLE sessions (
  id         UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------
-- messages
-- Stores the chat history for a session.
-- role is constrained to the two values from MessageRole.
-- timestamp stored as TEXT to match the "10:02 AM" display
-- format already used throughout the app.
-- --------------------------------------------------------
CREATE TABLE messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL,
  timestamp  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX messages_session_id_created_at
  ON messages (session_id, created_at);

-- --------------------------------------------------------
-- itineraries
-- Flight and hotel data are stored as flat prefixed columns
-- (denormalised) because they are always read together and
-- the TypeScript type reconstructs the nested objects in
-- the query layer.
-- --------------------------------------------------------
CREATE TABLE itineraries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  destination           TEXT NOT NULL,
  country_flag          TEXT NOT NULL,
  nights                INTEGER NOT NULL,
  total_cost            NUMERIC(10,2) NOT NULL,
  flight_airline        TEXT NOT NULL,
  flight_origin         TEXT NOT NULL,
  flight_destination    TEXT NOT NULL,
  flight_price          NUMERIC(10,2) NOT NULL,
  hotel_name            TEXT NOT NULL,
  hotel_stars           INTEGER NOT NULL CHECK (hotel_stars BETWEEN 1 AND 5),
  hotel_price_per_night NUMERIC(10,2) NOT NULL,
  daily_budget          NUMERIC(10,2) NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX itineraries_session_id_total_cost
  ON itineraries (session_id, total_cost);

-- --------------------------------------------------------
-- travel_preferences
-- Accumulated user preferences extracted by the AI layer.
-- One row per session, upserted as new info comes in.
-- --------------------------------------------------------
CREATE TABLE travel_preferences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  budget          NUMERIC(10,2),
  currency        TEXT DEFAULT 'USD',
  origin          TEXT,
  destination     TEXT,
  trip_length_days INTEGER,
  interests       TEXT[],
  hotel_min_stars INTEGER,
  hotel_max_stars INTEGER,
  max_layovers    INTEGER,
  departure_date  DATE,
  return_date     DATE,
  is_complete     BOOLEAN DEFAULT false,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id)
);

-- --------------------------------------------------------
-- api_responses
-- Raw responses from external travel APIs, stored for
-- debugging, analysis, and future training data.
-- --------------------------------------------------------
CREATE TABLE api_responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID REFERENCES sessions(id) ON DELETE SET NULL,
  api_source      TEXT NOT NULL,
  request_params  JSONB NOT NULL,
  response_data   JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX api_responses_session_id
  ON api_responses (session_id, created_at);


-- ============================================================
-- Seed data — mirrors src/data/mockData.ts exactly
-- ============================================================

-- Fixed demo session (matches DEFAULT_SESSION_ID in .env.local)
INSERT INTO sessions (id) VALUES
  ('00000000-0000-0000-0000-000000000001');

-- 4 chat messages
INSERT INTO messages (id, session_id, role, content, timestamp) VALUES
  (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000001',
    'user',
    'Hi! I have a budget of $1,500 CAD, flying from Toronto (YYZ), looking for a 7-day beach trip. I prefer warm weather and don''t mind a short layover.',
    '10:02 AM'
  ),
  (
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000001',
    'assistant',
    'Great choices! A 7-day beach getaway from Toronto under $1,500 is totally doable. Let me search for the best options — I''ll factor in flights, hotels, and daily spending.',
    '10:02 AM'
  ),
  (
    '00000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000001',
    'user',
    'I prefer 3-4 star hotels and I enjoy snorkeling and local food.',
    '10:03 AM'
  ),
  (
    '00000000-0000-0000-0000-000000000013',
    '00000000-0000-0000-0000-000000000001',
    'assistant',
    'Perfect. I found 3 itineraries that fit your budget, hotel preference, and interests. They''re ranked by total cost — cheapest first. Check them out on the right!',
    '10:03 AM'
  );

-- 3 itineraries (cheapest first by total_cost)
INSERT INTO itineraries (
  session_id,
  destination, country_flag, nights, total_cost,
  flight_airline, flight_origin, flight_destination, flight_price,
  hotel_name, hotel_stars, hotel_price_per_night,
  daily_budget
) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Cancún, Mexico', '🇲🇽', 7, 1240.00,
    'Air Transat', 'YYZ', 'CUN', 480.00,
    'Hotel Krystal Cancún', 3, 65.00,
    55.00
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Montego Bay, Jamaica', '🇯🇲', 7, 1380.00,
    'WestJet', 'YYZ', 'MBJ', 560.00,
    'Iberostar Rose Hall Beach', 4, 75.00,
    55.00
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Punta Cana, Dominican Republic', '🇩🇴', 7, 1490.00,
    'Sunwing', 'YYZ', 'PUJ', 620.00,
    'Riu Bambu', 4, 80.00,
    50.00
  );
