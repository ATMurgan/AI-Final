// Role of a message in the conversation
export type MessageRole = "user" | "assistant";

// A single chat message stored in DB and sent to the client
export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp?: string;
}

// Subset of flight details shown on an itinerary card
export interface FlightInfo {
  airline: string;
  origin: string;
  destination: string;
  price: number;
}

// Subset of hotel details shown on an itinerary card
export interface HotelInfo {
  name: string;
  stars: number;
  pricePerNight: number;
}

// A generated trip option stored in DB and displayed in TripResultsPanel
export interface Itinerary {
  id: string;
  destination: string;
  countryFlag: string;
  nights: number;
  totalCost: number;    // flight + (hotel.pricePerNight × nights) + (dailyBudget × nights)
  flight: FlightInfo;
  hotel: HotelInfo;
  dailyBudget: number;
}

export type {
  TravelPreferences,
  ClaudeStructuredResponse,
  GeneratedItinerary,
  PreferencesUpdate,
} from "./preferences";

// Shape of the /api/chat POST response
export interface ChatResponse {
  userMessage: ChatMessage;
  aiMessage: ChatMessage;
  itinerariesGenerated: boolean;
  itineraries?: Itinerary[];  // present when itinerariesGenerated is true
}
