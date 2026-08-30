export type GroupMember = {
  userId: string;
  name: string;
  subtotalPaise: number;
  /** In the room. Distinct from having ordered — the status screen shows
   *  someone who joined but is still reading the menu as Waiting. */
  hasOrdered: boolean;
  isHost: boolean;
  active: boolean;
  isYou: boolean;
};

export type GroupItem = {
  id: string;
  userId: string;
  memberName: string;
  dishId: string;
  name: string;
  pricePaise: number;
  qty: number;
  isYou: boolean;
};

export type GroupRide = {
  pickup: string;
  drop: string;
  displayName: string;
  vehicle: string;
  seats: number;
};

export type GroupCart = {
  id: string;
  code: string;
  domain: "food" | "ride";
  platform: string;
  status: "open" | "locked" | "ordered" | "cancelled";
  name: string | null;
  emoji: string | null;
  crewId: string | null;
  orderId: string | null;
  hostId: string;
  isHost: boolean;
  ride: GroupRide | null;
  totalPaise: number;
  equalSplitPaise: number;
  members: GroupMember[];
  items: GroupItem[];
};

export type GroupShare = {
  userId: string;
  name: string;
  sharePaise: number;
  isHost: boolean;
  upiLink: string | null;
};

/** A cheaper party-size item that covers what the group already chose. */
export type GroupSuggestion = {
  dishId: string;
  name: string;
  restaurant: string;
  serves: number;
  includes: string[];
  packPaise: number;
  currentPaise: number;
  savingPaise: number;
  theme: string;
  replacesItemIds: string[];
  peopleAgreeing: number;
};

/** People you order with again and again. */
export type Crew = {
  id: string;
  name: string;
  emoji: string | null;
  domain: "food" | "ride";
  platform: string;
  lastCartId: string | null;
  updatedAt: string;
  members: { userId: string; name: string; isYou: boolean }[];
  usual?: { dishId: string; name: string; qty: number; memberName: string }[];
};
