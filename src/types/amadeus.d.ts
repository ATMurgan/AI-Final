declare module "amadeus" {
  interface ResponseData<T> {
    data: T[];
    dictionaries?: Record<string, unknown>;
  }

  class Amadeus {
    constructor(config: { clientId: string; clientSecret: string });

    shopping: {
      flightOffersSearch: {
        get(params: {
          originLocationCode: string;
          destinationLocationCode: string;
          departureDate: string;
          returnDate?: string;
          adults: number;
          max?: number;
          currencyCode?: string;
          nonStop?: boolean;
        }): Promise<ResponseData<Record<string, unknown>>>;
      };
      hotelOffersSearch: {
        get(params: {
          cityCode: string;
          checkInDate: string;
          checkOutDate: string;
          adults?: number;
          roomQuantity?: number;
          ratings?: string;
          currency?: string;
          bestRateOnly?: boolean;
        }): Promise<ResponseData<Record<string, unknown>>>;
      };
    };
  }

  export default Amadeus;
}
