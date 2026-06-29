export type FoodQuote = {
  dishId: string;
  name: string;
  restaurant: string;
  rating: number;
  tag: string;
  dietary: "veg" | "nonveg";
  reviewSummary: string;
  platform: string;
  fulfillment: "in_app";
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
  fulfillment: "in_app";
  badge?: string;
};

export type ProductQuote = {
  productId: string;
  name: string;
  brand: string;
  category: string;
  rating: number;
  reviews: number;
  tag: string;
  reviewSummary: string;
  platform: string;
  basePaise: number;
  offers: { label: string; discountPaise: number }[];
  effectivePaise: number;
  deliveryDays: number;
  inStock: boolean;
};

export type Advice = {
  action: "order_now" | "wait";
  message: string;
  expectedSavingPaise?: number;
  waitMinutes?: number;
};

export type PickReason = "top_rated" | "best_price" | "fastest" | "best_overall";

type FoodRec = {
  type: "food";
  best: FoodQuote;
  alternatives: FoodQuote[];
  why: string;
  advice?: Advice;
  budgetNote?: string;
  personalNote?: string;
  pickReason?: PickReason;
};

type RideRec = {
  type: "ride";
  drop: string;
  pickup: string | null;
  quotes: RideQuote[];
  why: string;
  advice?: Advice;
};

type ShopRec = {
  type: "shop";
  best: ProductQuote;
  alternatives: ProductQuote[];
  why: string;
  personalNote?: string;
  pickReason?: PickReason;
};

export type Recommendation =
  | FoodRec
  | RideRec
  | ShopRec
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
