// Simulation fulfilment adapter.
//
// Runs the COMPLETE booking + live-tracking flow with no third-party access:
// a captain "accepts" after a short search, gets an OTP, and the driver moves
// along the real route geometry over time. Everything is derived
// deterministically from the orderId + bookedAt, so repeated /track polls
// (stateless) always agree without storing per-tick state.

import crypto from "node:crypto";
import type {
  BookRideInput,
  DriverInfo,
  FulfilmentState,
  LatLng,
  RideAssignment,
  RideProvider,
} from "./types.js";

// Phases of the simulated trip, in seconds from booking.
const SEARCH_SECONDS = 12; // finding a captain
const ARRIVE_SECONDS = 150; // captain → pickup
const HANDOVER_SECONDS = 20; // at pickup, OTP exchange
// then the in-trip phase scales with the route's expected ride time.

const FIRST_NAMES = [
  "Ramesh", "Suresh", "Imran", "Vijay", "Anil", "Karthik", "Naveen",
  "Mahesh", "Srinivas", "Prakash", "Rahul", "Faisal", "Yadagiri", "Bhaskar",
];
const VEHICLE_MODELS: Record<DriverInfo["vehicle"]["type"], string[]> = {
  bike: ["Honda Activa", "TVS Jupiter", "Bajaj Pulsar"],
  auto: ["Bajaj RE Auto", "Piaggio Ape", "TVS King"],
  cab: ["Maruti Swift Dzire", "Hyundai Aura", "Toyota Etios"],
};
const COLORS = ["White", "Silver", "Yellow", "Black", "Blue"];

// Deterministic small integer from a seed string — keeps a given order's
// driver/plate/OTP stable across polls.
function hashInt(seed: string, mod: number): number {
  const h = crypto.createHash("sha256").update(seed).digest();
  return h.readUInt32BE(0) % mod;
}

function makeDriver(seed: string, vehicle: DriverInfo["vehicle"]["type"]): DriverInfo {
  const name = FIRST_NAMES[hashInt(seed + "n", FIRST_NAMES.length)]!;
  const models = VEHICLE_MODELS[vehicle];
  const model = models[hashInt(seed + "m", models.length)]!;
  const color = COLORS[hashInt(seed + "c", COLORS.length)]!;
  const plate = `TS ${10 + hashInt(seed + "p1", 30)} ${String.fromCharCode(
    65 + hashInt(seed + "p2", 26),
  )}${String.fromCharCode(65 + hashInt(seed + "p3", 26))} ${1000 + hashInt(seed + "p4", 9000)}`;
  // Two-digit visible suffix on an otherwise masked number.
  const tail = 10 + hashInt(seed + "ph", 90);
  return {
    name,
    phoneMasked: `+91 ●●●●● ●${Math.floor(tail / 10)} ${tail % 10}${hashInt(seed + "ph2", 10)}`,
    rating: 4.2 + hashInt(seed + "r", 8) / 10, // 4.2–4.9
    trips: 800 + hashInt(seed + "t", 6000),
    photoUrl: null, // real photos arrive with the real provider
    vehicle: { type: vehicle, model, plate, color },
  };
}

function otpFor(seed: string): string {
  return String(1000 + hashInt(seed + "otp", 9000));
}

// ---- geometry: point a fraction `t` (0→1) along a [lng,lat][] polyline ----
function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}
function pointAlong(geom: [number, number][], t: number): LatLng {
  if (geom.length === 0) return { lat: 0, lng: 0 };
  if (geom.length === 1 || t <= 0) return { lng: geom[0]![0], lat: geom[0]![1] } as LatLng;
  let total = 0;
  for (let i = 1; i < geom.length; i++) total += haversine(geom[i - 1]!, geom[i]!);
  const target = total * Math.min(1, t);
  let acc = 0;
  for (let i = 1; i < geom.length; i++) {
    const seg = haversine(geom[i - 1]!, geom[i]!);
    if (acc + seg >= target) {
      const f = seg === 0 ? 0 : (target - acc) / seg;
      const a = geom[i - 1]!;
      const b = geom[i]!;
      return { lng: a[0] + (b[0] - a[0]) * f, lat: a[1] + (b[1] - a[1]) * f };
    }
    acc += seg;
  }
  const last = geom[geom.length - 1]!;
  return { lng: last[0], lat: last[1] };
}

// A point a little "before" pickup so the driver visibly closes in during the
// approach phase (offset back along the bearing from pickup toward drop's
// opposite — simplest: nudge away from drop).
function approachPoint(pickup: LatLng, drop: LatLng, progress: number): LatLng {
  const back = 0.012 * (1 - progress); // ~1.3km out, shrinking to 0
  return {
    lat: pickup.lat + (pickup.lat - drop.lat) * back,
    lng: pickup.lng + (pickup.lng - drop.lng) * back,
  };
}

function compute(
  seed: string,
  pickup: LatLng,
  drop: LatLng,
  geom: [number, number][],
  vehicle: DriverInfo["vehicle"]["type"],
  rideSeconds: number,
  elapsedS: number,
  domain: "ride" | "food" = "ride",
): RideAssignment {
  const isFood = domain === "food";
  const otp = otpFor(seed);
  const driver = makeDriver(seed, vehicle);

  let state: FulfilmentState;
  let driverLocation: LatLng | null;
  let pickupEtaMinutes = 0;
  let dropEtaMinutes = 0;
  let statusMessage: string;
  let driverOut: DriverInfo | null = driver;

  const arriveEnd = SEARCH_SECONDS + ARRIVE_SECONDS;
  const handoverEnd = arriveEnd + HANDOVER_SECONDS;
  const tripEnd = handoverEnd + rideSeconds;

  if (elapsedS < SEARCH_SECONDS) {
    state = "searching";
    driverOut = null;
    driverLocation = null;
    pickupEtaMinutes = Math.ceil(ARRIVE_SECONDS / 60);
    statusMessage = isFood
      ? "Restaurant is preparing your order…"
      : "Finding you the nearest captain…";
  } else if (elapsedS < arriveEnd) {
    state = "arriving";
    const p = (elapsedS - SEARCH_SECONDS) / ARRIVE_SECONDS;
    driverLocation = approachPoint(pickup, drop, p);
    pickupEtaMinutes = Math.max(1, Math.ceil((arriveEnd - elapsedS) / 60));
    statusMessage = isFood
      ? `${driver.name} is heading to the restaurant`
      : `${driver.name} is arriving in ${pickupEtaMinutes} min`;
  } else if (elapsedS < handoverEnd) {
    state = "arrived";
    driverLocation = pickup;
    statusMessage = isFood
      ? `${driver.name} is picking up your order`
      : `${driver.name} has arrived — share OTP ${otp}`;
  } else if (elapsedS < tripEnd) {
    state = "in_progress";
    const p = (elapsedS - handoverEnd) / rideSeconds;
    driverLocation = pointAlong(geom, p);
    dropEtaMinutes = Math.max(1, Math.ceil((tripEnd - elapsedS) / 60));
    statusMessage = isFood
      ? `Out for delivery — ${dropEtaMinutes} min to you`
      : `On the way — ${dropEtaMinutes} min to your drop`;
  } else {
    state = "completed";
    driverLocation = drop;
    statusMessage = isFood ? "Delivered — enjoy your meal!" : "Trip completed";
  }

  return {
    providerRef: `SIM-${seed.slice(0, 8).toUpperCase()}`,
    state,
    otp,
    driver: driverOut,
    driverLocation,
    pickupEtaMinutes,
    dropEtaMinutes,
    statusMessage,
  };
}

export class SimulationProvider implements RideProvider {
  readonly mode = "simulation" as const;

  async book(input: BookRideInput): Promise<RideAssignment> {
    // Booking returns the initial "searching" assignment; tracking advances it.
    return compute(
      input.orderId,
      input.pickup,
      input.drop,
      input.routeGeometry,
      input.vehicle,
      this.rideSeconds(input.routeGeometry),
      0,
    );
  }

  async track(input: {
    orderId: string;
    providerRef: string;
    vehicle: "bike" | "auto" | "cab";
    pickup: LatLng;
    drop: LatLng;
    routeGeometry: [number, number][];
    bookedAt: Date;
    now?: Date;
    domain?: "ride" | "food";
  }): Promise<RideAssignment> {
    const elapsedS = Math.max(
      0,
      ((input.now?.getTime() ?? Date.now()) - input.bookedAt.getTime()) / 1000,
    );
    return compute(
      input.orderId,
      input.pickup,
      input.drop,
      input.routeGeometry,
      input.vehicle,
      this.rideSeconds(input.routeGeometry),
      elapsedS,
      input.domain ?? "ride",
    );
  }

  async cancel(): Promise<void> {
    // Nothing persistent to undo in simulation.
  }

  // Expected in-trip duration from route length (≈25 km/h city average).
  private rideSeconds(geom: [number, number][]): number {
    let m = 0;
    for (let i = 1; i < geom.length; i++) m += haversine(geom[i - 1]!, geom[i]!);
    const km = m / 1000;
    return Math.max(90, Math.round((km / 25) * 3600));
  }
}
