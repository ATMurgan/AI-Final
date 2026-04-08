export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp?: string;
}

export interface FlightInfo {
  airline: string;
  origin: string;
  destination: string;
  price: number;
}

export interface HotelInfo {
  name: string;
  stars: number;
  pricePerNight: number;
}

export interface Itinerary {
  id: string;
  destination: string;
  countryFlag: string;
  nights: number;
  totalCost: number;
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

export interface ChatResponse {
  userMessage: ChatMessage;
  aiMessage: ChatMessage;
  itinerariesGenerated: boolean;
  itineraries?: Itinerary[];
}
