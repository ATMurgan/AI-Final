import type { Itinerary } from "@/types";

interface Props {
  itinerary: Itinerary;
}

// Per-destination day activity pools.
// Days are assigned by cycling through these arrays.
const ACTIVITY_POOLS: Record<string, string[]> = {
  "Cancun, Mexico": [
    "Arrive at Cancún International Airport. Check in to your hotel, freshen up, and take an evening stroll along the Hotel Zone beach.",
    "Full day at Playa Delfines — the best free public beach. Rent a lounger, swim in the turquoise water, and grab tacos at a nearby stand.",
    "Day trip to Isla Mujeres by ferry. Explore the colourful streets, rent a golf cart around the island, and snorkel at Garrafón Natural Reef Park.",
    "Visit the ancient Mayan ruins of El Rey within the Hotel Zone, then cool off at Laguna Nichupté on a boat tour.",
    "Cenote hopping near Tulum — swim in Dos Ojos and Gran Cenote, two of the clearest natural pools in the Yucatán.",
    "Relax on the beach in the morning. Afternoon shopping at Mercado 28 for handmade souvenirs and local street food.",
    "Xcaret eco-theme park: snorkel through underground rivers, watch the Mexico Espectacular show, and enjoy a buffet dinner.",
    "Snorkelling tour on the Mesoamerican Reef — the second-largest coral reef system in the world.",
    "Explore downtown Cancún (El Centro): visit the main plaza, try authentic Mexican food away from the tourist strip.",
    "Free morning on the beach. Pack up and transfer to the airport for your return flight.",
  ],
  "London, United Kingdom": [
    "Land at Heathrow and take the Tube into the city. Check in and walk along the South Bank for your first views of the Thames.",
    "Morning at the Tower of London and Tower Bridge. Afternoon exploring Borough Market for world-class street food.",
    "Westminster day: Westminster Abbey, the Houses of Parliament, Big Ben, and St. James's Park.",
    "Free museums: British Museum in the morning, National Gallery in the afternoon. Both are completely free.",
    "Day trip to Windsor Castle (45 min by train). Return via Notting Hill for dinner on Portobello Road.",
    "Explore Shoreditch and Brick Lane — street art, vintage markets, and some of London's best curry houses.",
    "Morning at Kew Gardens. Afternoon on the King's Road in Chelsea for window shopping and coffee.",
    "Greenwich: the Cutty Sark, Royal Observatory, and standing on the Prime Meridian line.",
    "Camden Market for lunch and browsing. Evening at a West End show (check TKTS for same-day discounts).",
    "Final morning in Hyde Park. Head to Heathrow for your departure flight.",
  ],
  "Paris, France": [
    "Arrive at Charles de Gaulle. Check in and take an evening walk to the Eiffel Tower — stunning at dusk.",
    "Louvre Museum in the morning (book tickets online). Afternoon along the Champs-Élysées to the Arc de Triomphe.",
    "Montmartre: explore the artists' quarter, visit Sacré-Cœur, and people-watch from the steps.",
    "Day trip to Versailles — the Palace of Versailles and its vast gardens are 40 minutes from Paris by RER.",
    "Île de la Cité: Notre-Dame Cathedral exterior, Sainte-Chapelle stained glass, and a crepe from a riverside stand.",
    "Le Marais district: medieval streets, the Place des Vosges, and the Picasso Museum.",
    "Musée d'Orsay for Impressionist masterpieces. Afternoon at the Rodin Museum garden.",
    "Canal Saint-Martin: a hip neighbourhood for brunch cafés, independent shops, and a canal-side picnic.",
    "Père Lachaise Cemetery, then an evening Seine river cruise for a final panorama of the city.",
    "Morning coffee and croissants at a local boulangerie. Transfer to CDG for your return flight.",
  ],
  "Tokyo, Japan": [
    "Land at Narita. Get your Suica card and take the N'EX to the city. Evening ramen in Shinjuku.",
    "Shibuya Crossing and Harajuku: Takeshita Street for street fashion, then Meiji Shrine for tranquility.",
    "Senso-ji Temple in Asakusa at dawn. Akihabara electronics and anime district in the afternoon.",
    "Day trip to Nikko — ornate shrines, waterfalls, and cedar forests, 2 hours from Tokyo by express train.",
    "Tsukiji outer market for breakfast.築地 then teamLab Borderless digital art museum.",
    "Shinjuku Gyoen National Garden. Evening in Golden Gai — tiny atmospheric bars packed into alleyways.",
    "Day trip to Kamakura: the Great Buddha, bamboo groves of Hokoku-ji, and hiking between temples.",
    "Odaiba: the teamLab Planets, waterfront shopping, and views of Rainbow Bridge.",
    "Yanaka neighbourhood — old Tokyo atmosphere, crafts shops, and a historic cemetery.",
    "Morning at Ueno Park and its free museums. Pack up and transfer to Narita for departure.",
  ],
  "Bali, Indonesia": [
    "Arrive in Denpasar. Transfer to Ubud — the cultural heart of Bali. Evening dinner overlooking the rice terraces.",
    "Tegallalang Rice Terraces at sunrise, then visit Tirta Empul holy water temple for a traditional purification ritual.",
    "Ubud Monkey Forest and the Ubud Palace, followed by a traditional Kecak fire dance performance at sunset.",
    "Cooking class in the morning — learn to make satay, nasi goreng, and lawar from scratch.",
    "Transfer to the south coast. Afternoon at Seminyak Beach, evening in the beach clubs.",
    "Uluwatu Temple perched on clifftops at sunset. Jimbaran Bay seafood dinner on the beach.",
    "Nusa Penida day trip: Kelingking Beach viewpoint, Angel's Billabong, and Crystal Bay for snorkelling.",
    "Tanah Lot temple at sunset — one of Bali's most iconic sea temples.",
    "Spa day: traditional Balinese massage, body scrub, and flower bath at a fraction of Western prices.",
    "Final morning shopping for batik fabric and silver jewellery in Seminyak. Transfer to Denpasar airport.",
  ],
  "Montego Bay, Jamaica": [
    "Arrive at Sangster International Airport. Transfer to your hotel and settle in with a cold Red Stripe.",
    "Doctor's Cave Beach — pristine white sand and the clearest water in Montego Bay.",
    "Dunn's River Falls day trip (1.5 hrs east): climb the cascading terraces with a guide.",
    "Luminous Lagoon night tour — watch the water glow bioluminescent blue as you swim.",
    "Rose Hall Great House tour and the Cinnamon Hill Golf Course for those who play.",
    "Day trip to Rick's Café in Negril: cliff diving, sunset cocktails, and the most famous bar in the Caribbean.",
    "Rafting on the Martha Brae River — a peaceful 1.5 hour float through tropical jungle.",
    "Local food tour: jerk chicken at Scotchies, bammy flatbread, and fresh patties in the town market.",
    "Snorkelling or scuba diving on the Montego Bay Marine Park coral reef.",
    "Beach morning, then transfer to the airport for your return flight.",
  ],
  "Punta Cana, Dominican Republic": [
    "Arrive at Punta Cana International Airport. Transfer to your resort and relax on Bávaro Beach.",
    "Full beach day — Bávaro Beach is consistently rated one of the best beaches in the world.",
    "Saona Island catamaran day trip: a natural pool stop, open bar, and lunch on a deserted island.",
    "Hoyo Azul: a stunning 40m-deep turquoise cenote within the Scape Park complex.",
    "Buggy adventure through local villages, banana plantations, and a cacao farm.",
    "Altos de Chavón: a replica 16th-century Mediterranean village overlooking the Chavón River.",
    "Snorkelling tour on Catalina Island reef.",
    "Whale watching in Samaná Bay (Jan–Mar season) or mangrove kayaking in Los Haitises.",
    "Shopping at the Palma Real mall and Blue Mall Punta Cana, then evening at a local merengueteca.",
    "Final morning in the resort pool. Transfer to the airport.",
  ],
  "Rome, Italy": [
    "Arrive at Fiumicino. Check in and make your first visit to the Trevi Fountain at night — far fewer crowds.",
    "Vatican day: Vatican Museums, Sistine Chapel, and St. Peter's Basilica. Book timed entry online in advance.",
    "The Colosseum, Roman Forum, and Palatine Hill — the heart of ancient Rome.",
    "Borghese Gallery (reservation required) then a long lunch in the Prati neighbourhood.",
    "Day trip to Pompeii (2.5 hrs by train): the perfectly preserved Roman city frozen in time by Vesuvius.",
    "Trastevere neighbourhood in the morning — charming cobbled streets. Afternoon at Campo de' Fiori market.",
    "Castel Sant'Angelo and the Prati market. Evening aperitivo in the Jewish Ghetto.",
    "Palatine Hill sunrise, then explore the Aventine Hill's Rose Garden and the Knights of Malta keyhole view.",
    "Day trip to Orvieto — a stunning hill town with a spectacular cathedral, 1 hr by train.",
    "Morning coffee at a local bar (standing, as Romans do). Transfer to Fiumicino for your flight.",
  ],
  "Barcelona, Spain": [
    "Arrive at El Prat. Check in and take an evening walk down La Rambla to the waterfront.",
    "Sagrada Família — book timed entry online. The interior is unlike anywhere else on Earth.",
    "Gothic Quarter: the Barcelona Cathedral, Plaça Reial, and the best tapas bars in the old city.",
    "Park Güell in the morning (timed entry required). Afternoon beach at Barceloneta.",
    "Day trip to Montserrat: jagged mountain monastery, 1 hour from the city by train and cable car.",
    "Picasso Museum in El Born, followed by exploring the boutiques of Carrer del Rec.",
    "Gràcia neighbourhood markets and Gaudí's Casa Vicens. Evening at a vermouth bar.",
    "Camp Nou stadium tour for football fans. Cable car up to Montjuïc castle for city panoramas.",
    "Tibidabo amusement park and its hilltop views over the entire city.",
    "Final morning at the Boqueria market. Transfer to El Prat for your flight.",
  ],
  "Havana, Cuba": [
    "Arrive at José Martí Airport. Take a classic 1950s American convertible taxi to your casa particular.",
    "Old Havana walking tour: Plaza de la Catedral, Plaza de Armas, and the colourful El Capitolio.",
    "Vintage car cruise along the Malecón seafront promenade at sunset.",
    "Museum of the Revolution and the Che Guevara Mausoleum in Santa Clara (day trip).",
    "Viñales Valley day trip — UNESCO tobacco farms, horseback riding, and limestone mogotes.",
    "Fábrica de Arte Cubano (FAC) — Cuba's most exciting art and music venue, open Thursday to Sunday nights.",
    "Salsa dancing lesson in the morning. Afternoon at Playa del Este, Havana's nearest beach.",
    "Ernest Hemingway trail: La Floridita (daiquiris) and El Bodeguito del Medio (mojitos), then Finca Vigía.",
    "Tropicana Cabaret — the greatest outdoor cabaret show in the Caribbean.",
    "Final morning in the markets at Callejón de Hamel. Transfer to the airport.",
  ],
  "Honolulu, Hawaii": [
    "Arrive at Honolulu International Airport. Check in and watch your first Hawaiian sunset from Waikiki Beach.",
    "Diamond Head State Monument hike at dawn — panoramic views over all of Oahu. Beach afternoon.",
    "Pearl Harbor: USS Arizona Memorial, Battleship Missouri, and the Pacific Aviation Museum.",
    "North Shore day trip: Waimea Bay, the Banzai Pipeline, and the shrimp trucks at Kahuku.",
    "Hanauma Bay Nature Preserve snorkelling — some of the best reef fish viewing in Hawaii.",
    "Kailua town: Lanikai Beach (voted most beautiful in the US), kayaking to the Mokulua Islands.",
    "Polynesian Cultural Center: experience Hawaiian, Samoan, Tongan, and Fijian cultures in one day.",
    "Manoa Falls hike through lush rainforest. Afternoon at Ala Moana Shopping Center.",
    "Luau night: traditional Hawaiian feast with imu-roasted kalua pig, poi, and hula dancing.",
    "Final morning at Waikiki. Breakfast at a local plate-lunch spot. Transfer to the airport.",
  ],
  "Bangkok, Thailand": [
    "Arrive at Suvarnabhumi. Take the Airport Rail Link to the city. Evening street food on Silom Road.",
    "The Grand Palace and Wat Phra Kaew (Temple of the Emerald Buddha) — the most sacred site in Thailand.",
    "Wat Arun (Temple of Dawn) at sunrise across the river, then the floating markets.",
    "Chatuchak Weekend Market — 15,000 stalls over 35 acres. The world's largest outdoor market.",
    "Day trip to Ayutthaya by train: the ancient capital's ruined temples and Buddha statues.",
    "Khao San Road area, then a long-tail boat tour through the Bangkok canals (khlongs).",
    "Jim Thompson House museum and the nearby Lumphini Park for a peaceful morning.",
    "Terminal 21 for shopping, then a rooftop bar on Sukhumvit for sunset cocktails.",
    "Elephant Nature Park day trip north of the city — ethical elephant sanctuary.",
    "Final morning Thai massage and street breakfast. Transfer to Suvarnabhumi.",
  ],
  "Nassau, Bahamas": [
    "Arrive at Lynden Pindling International Airport. Transfer to your hotel and hit the beach.",
    "Cable Beach — the most famous stretch of sand on New Providence. Crystal-clear water and powdery white sand.",
    "Blue Lagoon Island day trip: swimming with dolphins, snorkelling, and private beach access.",
    "Nassau Historic Tour: Queen's Staircase (66 hand-carved steps), Fort Fincastle, and the Parliament buildings.",
    "Atlantis Paradise Island: the water park, aquarium, and casino on neighbouring Paradise Island.",
    "Exuma Cays day trip by powerboat: swim with wild pigs at Big Major's Spot and snorkel with nurse sharks.",
    "Stuart Cove's shark diving — an adrenaline dive with Caribbean reef sharks.",
    "Fish Fry at Arawak Cay — the best local food in the Bahamas: conch salad, fried snapper, and Sands beer.",
    "Thunderball Grotto: snorkelling in the sea cave featured in two James Bond films.",
    "Final morning beach walk and duty-free shopping. Transfer to the airport.",
  ],
  "Mexico City, Mexico": [
    "Arrive at AICM. Take the Metrobús to your hotel. Evening in Condesa neighbourhood.",
    "Zócalo (main plaza), the Metropolitan Cathedral, and the Palacio Nacional's Diego Rivera murals.",
    "Teotihuacán pyramids day trip — climb the Pyramid of the Sun and the Pyramid of the Moon.",
    "Coyoacán: Frida Kahlo Museum (Museo Azul) and the colourful weekend markets.",
    "Chapultepec Park and the Museo Nacional de Antropología — world-class pre-Columbian artefacts.",
    "Xochimilco: colourful trajinera boats through the ancient Aztec canals, with food vendors and mariachis.",
    "Polanco neighbourhood for upscale dining and the Museo Jumex contemporary art collection.",
    "Lucha libre wrestling match at Arena México — authentic local entertainment.",
    "Mercado de Jamaica (flower market) and a mezcalería tasting in La Roma.",
    "Final morning tacos de canasta in a local market. Transfer to the airport.",
  ],
  "Amsterdam, Netherlands": [
    "Arrive at Schiphol Airport. Take the train to Centraal Station. Evening canal walk in the Jordaan.",
    "Rijksmuseum (Rembrandt, Vermeer) in the morning. Van Gogh Museum in the afternoon — book online.",
    "Anne Frank House (advance booking essential) and a canal boat tour at sunset.",
    "Day trip to Keukenhof Gardens (spring) or the Hoge Veluwe National Park (year-round).",
    "Vondelpark morning jog or picnic. Afternoon at the Albert Cuyp street market.",
    "Heineken Experience brewery tour, then the Pip neighbourhood for Indonesian rijsttafel dinner.",
    "Day trip to Zaanse Schans: windmills, wooden shoe workshops, and cheese farms.",
    "FOAM Photography Museum and an evening at a brown café (bruine kroeg) on the Prinsengracht.",
    "Stedelijk Museum of modern art, then a bike ride through the Amstelpark.",
    "Final morning stroopwafel and coffee at a local café. Transfer to Schiphol.",
  ],
};

function getActivityPool(destination: string): string[] {
  return ACTIVITY_POOLS[destination] ?? [
    "Arrive and check into your hotel. Explore the immediate neighbourhood.",
    "Full day of sightseeing — visit the top landmarks and local markets.",
    "Day trip to a nearby attraction outside the city centre.",
    "Museum and cultural sites in the morning. Afternoon at leisure.",
    "Local food tour: breakfast spot, market lunch, and a recommended dinner restaurant.",
    "Outdoor activity day — hiking, beach, cycling, or a guided excursion.",
    "Shopping and souvenir hunting in the local markets.",
    "Relaxing day: spa, café hopping, or a scenic walk.",
    "Explore a neighbourhood you haven't visited yet.",
    "Final morning — revisit a favourite spot. Transfer to the airport.",
  ];
}

function StarRating({ stars }: { stars: number }) {
  return (
    <span className="text-gold-400 text-sm">
      {"★".repeat(stars)}
      <span style={{ color: "#6d2860" }}>{"★".repeat(5 - stars)}</span>
    </span>
  );
}

export default function ItineraryCard({ itinerary }: Props) {
  const { destination, countryFlag, nights, totalCost, flight, hotel, dailyBudget } = itinerary;

  const hotelTotal = Math.round(hotel.pricePerNight * nights);
  const dailyTotal = Math.round(dailyBudget * nights);

  const activities = getActivityPool(destination);
  const days: string[] = [];
  for (let i = 0; i < nights; i++) {
    days.push(activities[i % activities.length]);
  }

  return (
    <div
      className="rounded-2xl overflow-hidden border border-dawn-700"
      style={{ background: "#3d1650" }}
    >
      {/* ── Header — sunrise gradient strip ──────────────────────── */}
      <div
        className="px-6 pt-6 pb-5"
        style={{
          background:
            "linear-gradient(160deg, #4a1a60 0%, #8a2848 50%, #b03820 100%)",
          borderBottom: "1px solid rgba(249,115,22,0.2)",
        }}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <span className="text-4xl leading-none">{countryFlag}</span>
            <div>
              <h3 className="text-white font-bold text-xl leading-tight">{destination}</h3>
              <p className="text-sunrise-100/60 text-sm mt-0.5">{nights} nights · best price found</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p
              className="font-bold text-3xl leading-none"
              style={{ background: "linear-gradient(135deg, #fbbf24, #f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              ${totalCost.toLocaleString()}
            </p>
            <p className="text-gray-500 text-xs mt-1">total estimated cost</p>
          </div>
        </div>

        {/* Cost breakdown */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: "✈", label: "Flight",  value: `$${flight.price.toLocaleString()}`,  sub: "return" },
            { icon: "🏨", label: "Hotel",   value: `$${hotelTotal.toLocaleString()}`,    sub: `$${hotel.pricePerNight}/night` },
            { icon: "🍽", label: "Daily",   value: `$${dailyTotal.toLocaleString()}`,    sub: `$${dailyBudget}/day` },
          ].map(({ icon, label, value, sub }) => (
            <div
              key={label}
              className="rounded-xl py-3 px-2 text-center"
              style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(249,115,22,0.15)" }}
            >
              <p className="text-sunrise-100/40 text-[10px] uppercase tracking-widest mb-1">{icon} {label}</p>
              <p className="text-white font-bold text-base">{value}</p>
              <p className="text-gray-600 text-[10px] mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Flight & Hotel details ────────────────────────────────── */}
      <div
        className="px-6 py-4 flex flex-col gap-2.5"
        style={{ borderBottom: "1px solid rgba(249,115,22,0.12)" }}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-sunrise-500 text-sm">✈</span>
          <span className="text-gray-200 text-sm font-medium">
            {flight.origin} → {flight.destination}
          </span>
          <span className="text-gray-600 text-xs">· {flight.airline}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-sunrise-500 text-sm">🏨</span>
          <span className="text-gray-200 text-sm font-medium">{hotel.name}</span>
          <StarRating stars={hotel.stars} />
        </div>
      </div>

      {/* ── Day-by-day itinerary ──────────────────────────────────── */}
      <div className="px-6 py-5">
        <h4
          className="text-xs font-bold uppercase tracking-widest mb-5"
          style={{ color: "#f59e0b" }}
        >
          Day-by-Day Itinerary
        </h4>
        <ol className="relative space-y-0" style={{ borderLeft: "1px solid rgba(249,115,22,0.25)" }}>
          {days.map((activity, i) => (
            <li key={i} className="pl-5 pb-6 last:pb-0 relative">
              {/* Timeline dot — golden sunrise circle */}
              <span
                className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full"
                style={{ background: "linear-gradient(135deg, #fbbf24, #f97316)", border: "2px solid #3d1650" }}
              />
              <p
                className="text-[10px] font-bold uppercase tracking-widest mb-1"
                style={{ color: "#f97316" }}
              >
                Day {i + 1}
              </p>
              <p className="text-gray-300 text-sm leading-relaxed">{activity}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
