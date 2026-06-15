// Selects the active fulfilment provider from config. Everything else imports
// `rideProvider` and never knows which one it is.

import { env } from "../../config/env.js";
import { SimulationProvider } from "./simulation.provider.js";
import { OndcProvider } from "./ondc.provider.js";
import type { RideProvider } from "./types.js";

export const rideProvider: RideProvider =
  env.PROVIDER_MODE === "ondc" ? new OndcProvider() : new SimulationProvider();

export * from "./types.js";
