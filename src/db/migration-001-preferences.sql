-- Migration 001: Add travel_preferences and api_responses tables
-- Run with: psql -d budgetadvisor -f src/db/migration-001-preferences.sql

CREATE TABLE IF NOT EXISTS travel_preferences (
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

CREATE TABLE IF NOT EXISTS api_responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID REFERENCES sessions(id) ON DELETE SET NULL,
  api_source      TEXT NOT NULL,
  request_params  JSONB NOT NULL,
  response_data   JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_responses_session_id
  ON api_responses (session_id, created_at);
