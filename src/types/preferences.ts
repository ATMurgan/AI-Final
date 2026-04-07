export interface TravelPreferences {
  budget: number | null;
  currency: string;
  origin: string | null;
  destination: string | null;
  tripLengthDays: number | null;
  interests: string[];
  hotelMinStars: number | null;
  hotelMaxStars: number | null;
  maxLayovers: number | null;
  departureDate: string | null;
  returnDate: string | null;
  isComplete: boolean;
}

export function emptyPreferences(): TravelPreferences {
  return {
    budget: null,
    currency: "USD",
    origin: null,
    destination: null,
    tripLengthDays: null,
    interests: [],
    hotelMinStars: null,
    hotelMaxStars: null,
    maxLayovers: null,
    departureDate: null,
    returnDate: null,
    isComplete: false,
  };
}

export const REQUIRED_PREFERENCE_FIELDS = [
  "budget",
  "origin",
  "destination",
  "tripLengthDays",
] as const;

export interface PreferencesUpdate {
  budget?: number;
  currency?: string;
  origin?: string;
  destination?: string;
  tripLengthDays?: number;
  interests?: string[];
  hotelMinStars?: number;
  hotelMaxStars?: number;
  maxLayovers?: number;
  departureDate?: string;
  returnDate?: string;
}

export interface ClaudeStructuredResponse {
  message: string;
  preferencesUpdate: PreferencesUpdate | null;
  isComplete: boolean;
  missingFields: string[];
  itineraries: GeneratedItinerary[] | null;
}

export interface GeneratedItinerary {
  destination: string;
  countryFlag: string;
  nights: number;
  totalCost: number;
  flight: {
    airline: string;
    origin: string;
    destination: string;
    price: number;
  };
  hotel: {
    name: string;
    stars: number;
    pricePerNight: number;
  };
  dailyBudget: number;
}
