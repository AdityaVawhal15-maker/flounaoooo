// Universal fulfilment-provider contract.
//
// Both the simulation adapter (default) and the real ONDC mobility adapter
// implement this exact shape. Everything above the provider — the order
// routes, the live-tracking endpoint, the web UI — only ever talks to this
// interface, so swapping simulation → real ONDC is a config flip with zero
// changes upstream. The data model mirrors what an ONDC on_status / on_select
// callback carries (driver, vehicle, fulfilment state, live location) so the
// real adapter is a thin mapping, not a rewrite.

export type LatLng = { lat: number; lng: number };

// The trip/fulfilment lifecycle, ordered. Both food and ride map onto a
// subset of these; the UI renders whichever the provider reports.
export type FulfilmentState =
  | "searching" // looking for a captain / restaurant accept
  | "assigned" // captain/partner accepted
  | "arriving" // heading to pickup
  | "arrived" // at pickup, waiting for OTP / handover
  | "in_progress" // ride underway / food out for delivery
  | "completed"
  | "cancelled";

export type DriverInfo = {
  name: string;
  phoneMasked: string; // e.g. "+91 ●●●●● ●12 34" — never the raw number to the client
  rating: number;
  trips: number;
  photoUrl: string | null;
  vehicle: {
    type: "bike" | "auto" | "cab";
    model: string; // "Maruti Swift", "Bajaj Auto"
    plate: string; // "TS 09 AB 1234"
    color: string;
  };
};

// What booking returns and what the tracking endpoint streams.
export type RideAssignment = {
  providerRef: string; // provider/ONDC order ref
  state: FulfilmentState;
  otp: string; // 4-digit start-ride / handover OTP
  driver: DriverInfo | null; // null while still "searching"
  driverLocation: LatLng | null; // live position; null until assigned
  pickupEtaMinutes: number; // ETA to pickup (pre-trip) …
  dropEtaMinutes: number; // … or to drop (in-trip)
  statusMessage: string;
};

export type BookRideInput = {
  orderId: string;
  provider: string; // the chosen quote's provider (uber/ola/ondc/…)
  vehicle: "bike" | "auto" | "cab";
  productName: string;
  pickup: LatLng & { label: string };
  drop: LatLng & { label: string };
  routeGeometry: [number, number][]; // [lng,lat][], drives the live marker
};

export interface RideProvider {
  readonly mode: "simulation" | "ondc";
  // Confirm a booking and (begin to) assign a captain.
  book(input: BookRideInput): Promise<RideAssignment>;
  // Current live state for an in-flight ride. `elapsedMs` lets the simulation
  // advance deterministically; the real adapter ignores it and reads ONDC state.
  track(input: {
    orderId: string;
    providerRef: string;
    vehicle: "bike" | "auto" | "cab";
    pickup: LatLng;
    drop: LatLng;
    routeGeometry: [number, number][];
    bookedAt: Date;
    now?: Date;
    // Food deliveries reuse the same fulfilment engine but must speak
    // "delivery partner / picking up your order", never "captain / trip".
    domain?: "ride" | "food";
  }): Promise<RideAssignment>;
  // Cancel a booking before/along the way.
  cancel(input: { orderId: string; providerRef: string }): Promise<void>;
}
