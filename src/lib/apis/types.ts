export interface FlightSearchResult {
  airline: string;
  origin: string;
  destination: string;
  price: number;
  currency: string;
  stops: number;
  duration: string;
}

export interface HotelSearchResult {
  name: string;
  stars: number;
  pricePerNight: number;
  currency: string;
}

export interface AmadeusSearchResults {
  flights: FlightSearchResult[];
  hotels: HotelSearchResult[];
  errors: string[];
}
