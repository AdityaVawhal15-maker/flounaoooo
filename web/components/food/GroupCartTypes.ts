export type GroupMember = {
  userId: string;
  name: string;
  subtotalPaise: number;
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

export type GroupCart = {
  id: string;
  code: string;
  platform: string;
  status: "open" | "locked" | "ordered" | "cancelled";
  orderId: string | null;
  isHost: boolean;
  totalPaise: number;
  equalSplitPaise: number;
  members: GroupMember[];
  items: GroupItem[];
};
