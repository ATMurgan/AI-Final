import type { ChatMessage, Itinerary } from "@/types";

export const mockMessages: ChatMessage[] = [
  {
    id: "1",
    role: "user",
    content:
      "Hi! I have a budget of $1,500 CAD, flying from Toronto (YYZ), looking for a 7-day beach trip. I prefer warm weather and don't mind a short layover.",
    timestamp: "10:02 AM",
  },
  {
    id: "2",
    role: "assistant",
    content:
      "Great choices! A 7-day beach getaway from Toronto under $1,500 is totally doable. Let me search for the best options — I'll factor in flights, hotels, and daily spending.",
    timestamp: "10:02 AM",
  },
  {
    id: "3",
    role: "user",
    content: "I prefer 3-4 star hotels and I enjoy snorkeling and local food.",
    timestamp: "10:03 AM",
  },
  {
    id: "4",
    role: "assistant",
    content:
      "Perfect. I found 3 itineraries that fit your budget, hotel preference, and interests. They're ranked by total cost — cheapest first. Check them out on the right!",
    timestamp: "10:03 AM",
  },
];

export const mockItineraries: Itinerary[] = [
  {
    id: "1",
    destination: "Cancún, Mexico",
    countryFlag: "🇲🇽",
    nights: 7,
    totalCost: 1240,
    flight: {
      airline: "Air Transat",
      origin: "YYZ",
      destination: "CUN",
      price: 480,
    },
    hotel: {
      name: "Hotel Krystal Cancún",
      stars: 3,
      pricePerNight: 65,
    },
    dailyBudget: 55,
  },
  {
    id: "2",
    destination: "Montego Bay, Jamaica",
    countryFlag: "🇯🇲",
    nights: 7,
    totalCost: 1380,
    flight: {
      airline: "WestJet",
      origin: "YYZ",
      destination: "MBJ",
      price: 560,
    },
    hotel: {
      name: "Iberostar Rose Hall Beach",
      stars: 4,
      pricePerNight: 75,
    },
    dailyBudget: 55,
  },
  {
    id: "3",
    destination: "Punta Cana, Dominican Republic",
    countryFlag: "🇩🇴",
    nights: 7,
    totalCost: 1490,
    flight: {
      airline: "Sunwing",
      origin: "YYZ",
      destination: "PUJ",
      price: 620,
    },
    hotel: {
      name: "Riu Bambu",
      stars: 4,
      pricePerNight: 80,
    },
    dailyBudget: 50,
  },
];
