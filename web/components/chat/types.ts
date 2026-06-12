export type FoodQuote = {
  dishId: string;
  name: string;
  restaurant: string;
  rating: number;
  tag: string;
  dietary: "veg" | "nonveg";
  reviewSummary: string;
  platform: string;
  fulfillment: "in_app" | "redirect";
  basePaise: number;
  deliveryFeePaise: number;
  offers: { label: string; discountPaise: number }[];
  effectivePaise: number;
  etaMinutes: number;
};

export type RideQuote = {
  provider: string;
  vehicle: string;
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

export type Advice = {
  action: "order_now" | "wait";
  message: string;
  expectedSavingPaise?: number;
  waitMinutes?: number;
};

type FoodRec = {
  type: "food";
  best: FoodQuote;
  alternatives: FoodQuote[];
  why: string;
  advice?: Advice;
};

type RideRec = {
  type: "ride";
  drop: string;
  pickup: string | null;
  quotes: RideQuote[];
  why: string;
  advice?: Advice;
};

export type Recommendation =
  | FoodRec
  | RideRec
  | {
      type: "combo";
      food: Omit<FoodRec, "type"> | null;
      ride: Omit<RideRec, "type">;
    };

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  domain?: string;
  recommendation?: Recommendation | null;
};
