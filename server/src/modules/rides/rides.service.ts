// Simulated ride-provider quotes (Uber/Ola/Rapido/ONDC). Same adapter shape
// real provider/ONDC-mobility integrations will implement later.

export type VehicleType = "bike" | "auto" | "cab";

export type RideQuote = {
  provider: "uber" | "ola" | "rapido" | "ondc";
  vehicle: VehicleType;
  productName: string;
  farePaise: number;
  offers: { label: string; discountPaise: number }[];
  effectivePaise: number;
  pickupEtaMinutes: number;
  rideMinutes: number;
  driverRating: number;
  fulfillment: "in_app" | "redirect";
  badge?: string;
};

type ProviderConfig = {
  provider: RideQuote["provider"];
  products: Array<{
    vehicle: VehicleType;
    name: string;
    basePaise: number;
    perKmPaise: number;
    pickupEta: number;
    rating: number;
    offer?: { label: string; discountPaise: number };
  }>;
};

const providers: ProviderConfig[] = [
  {
    provider: "uber",
    products: [
      { vehicle: "bike", name: "Uber Moto", basePaise: 2000, perKmPaise: 600, pickupEta: 5, rating: 4.7 },
      { vehicle: "auto", name: "Uber Auto", basePaise: 3000, perKmPaise: 1100, pickupEta: 4, rating: 4.9 },
      { vehicle: "cab", name: "Uber Go", basePaise: 5000, perKmPaise: 1600, pickupEta: 6, rating: 4.8 },
    ],
  },
  {
    provider: "ola",
    products: [
      { vehicle: "bike", name: "Ola Bike", basePaise: 1800, perKmPaise: 580, pickupEta: 7, rating: 4.4 },
      { vehicle: "auto", name: "Ola Auto", basePaise: 2800, perKmPaise: 1050, pickupEta: 6, rating: 4.5, offer: { label: "Coupon OLA50", discountPaise: 5000 } },
      { vehicle: "cab", name: "Ola Mini", basePaise: 4800, perKmPaise: 1500, pickupEta: 8, rating: 4.4 },
    ],
  },
  {
    provider: "rapido",
    products: [
      { vehicle: "bike", name: "Rapido Bike", basePaise: 1500, perKmPaise: 520, pickupEta: 3, rating: 4.3, offer: { label: "First ride ₹25 off", discountPaise: 2500 } },
      { vehicle: "auto", name: "Rapido Auto", basePaise: 2600, perKmPaise: 1000, pickupEta: 7, rating: 4.2 },
    ],
  },
  {
    provider: "ondc",
    products: [
      { vehicle: "auto", name: "ONDC Auto", basePaise: 2400, perKmPaise: 950, pickupEta: 6, rating: 4.3, offer: { label: "Network pricing", discountPaise: 1500 } },
      { vehicle: "cab", name: "ONDC Cab", basePaise: 4200, perKmPaise: 1400, pickupEta: 9, rating: 4.2 },
    ],
  },
];

export function quoteRides(opts: {
  distanceKm: number;
  rideMinutes: number;
  vehicle?: VehicleType | "any";
}): RideQuote[] {
  const wanted = opts.vehicle && opts.vehicle !== "any" ? opts.vehicle : null;

  const quotes = providers.flatMap((p) =>
    p.products
      .filter((prod) => !wanted || prod.vehicle === wanted)
      .map((prod): RideQuote => {
        const fare = Math.round(prod.basePaise + prod.perKmPaise * opts.distanceKm);
        const offers = prod.offer ? [prod.offer] : [];
        const discount = offers.reduce((s, o) => s + o.discountPaise, 0);
        return {
          provider: p.provider,
          vehicle: prod.vehicle,
          productName: prod.name,
          farePaise: fare,
          offers,
          effectivePaise: Math.max(0, fare - discount),
          pickupEtaMinutes: prod.pickupEta,
          rideMinutes: opts.rideMinutes,
          driverRating: prod.rating,
          fulfillment: p.provider === "ondc" ? "in_app" : "redirect",
        };
      }),
  );

  quotes.sort((a, b) => a.effectivePaise - b.effectivePaise);
  if (quotes[0]) quotes[0].badge = "BEST PRICE";
  const fastest = quotes.reduce(
    (a, b) => (b.pickupEtaMinutes < a.pickupEtaMinutes ? b : a),
    quotes[0]!,
  );
  if (fastest && !fastest.badge) fastest.badge = "FASTEST";
  return quotes;
}
