// Real ONDC mobility adapter (live fulfilment).
//
// This is the production path. It is intentionally a thin mapping layer: ONDC
// mobility flows (select → init → confirm → status) already carry the driver,
// vehicle, fulfilment-state and live GPS we expose, so each method here just
// signs a request to the Buyer App gateway and maps the on_* callback into our
// universal RideAssignment.
//
// It activates only when PROVIDER_MODE=ondc AND the ONDC_* credentials are set
// (your registered Buyer App). Until then it fails loudly rather than pretending
// to work — the simulation adapter is the safe default for everyone else.

import { env } from "../../config/env.js";
import type { BookRideInput, RideAssignment, RideProvider } from "./types.js";

function ensureConfigured() {
  if (
    !env.ONDC_BASE_URL ||
    !env.ONDC_SUBSCRIBER_ID ||
    !env.ONDC_SIGNING_PRIVATE_KEY
  ) {
    throw new Error(
      "ONDC provider selected but not configured. Set ONDC_BASE_URL, " +
        "ONDC_SUBSCRIBER_ID and ONDC_SIGNING_PRIVATE_KEY (your registered " +
        "Buyer App credentials), or set PROVIDER_MODE=simulation.",
    );
  }
}

export class OndcProvider implements RideProvider {
  readonly mode = "ondc" as const;

  async book(_input: BookRideInput): Promise<RideAssignment> {
    ensureConfigured();
    // TODO(ondc): POST /confirm to ONDC_BASE_URL signed with the subscriber
    // key, then map on_confirm → RideAssignment. Same shape as the simulation
    // adapter returns, so nothing upstream changes.
    throw new Error("ONDC confirm not yet implemented — awaiting network onboarding.");
  }

  async track(_input: {
    orderId: string;
    providerRef: string;
    vehicle: "bike" | "auto" | "cab";
  }): Promise<RideAssignment> {
    ensureConfigured();
    // TODO(ondc): POST /status and map the on_status fulfilment block
    // (agent + vehicle + live GPS + state) into RideAssignment.
    throw new Error("ONDC status not yet implemented — awaiting network onboarding.");
  }

  async cancel(_input: { orderId: string; providerRef: string }): Promise<void> {
    ensureConfigured();
    throw new Error("ONDC cancel not yet implemented — awaiting network onboarding.");
  }
}
