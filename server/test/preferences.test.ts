import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, authedAgent } from "./helpers.js";

// Settings → notification preferences, plus the Privacy & Security flags that
// ride on the same endpoint. All default on, persist per user, and reject
// empty/invalid updates.

const DEFAULTS = {
  emailUpdates: true,
  smartSuggestions: true,
  emailMoneyUpdates: true,
  emailTips: true,
  // Privacy & Security → Share My Location. Gates the rides screen
  // auto-detecting the rider's position.
  shareLocation: true,
  // The rest of the Privacy & Security screen. Visibility and activity status
  // are writable here; two-factor has its own confirm/disable endpoints, so it
  // is read-only on this one.
  profileVisibility: "everyone",
  activityStatus: true,
  twoFactorEnabled: false,
};

// GET adds a derived flag the PUT response doesn't carry: whether any device
// has the biometric lock armed. It's a count of another table, not a column.
const GET_DEFAULTS = { ...DEFAULTS, biometricLock: false };

describe("user preferences", () => {
  it("defaults every preference to true", async () => {
    const { agent } = await authedAgent();
    const res = await agent.get("/api/users/preferences").expect(200);
    expect(res.body).toEqual(GET_DEFAULTS);
  });

  it("persists a partial update and leaves the other flags untouched", async () => {
    const { agent } = await authedAgent();
    const put = await agent
      .put("/api/users/preferences")
      .send({ emailUpdates: false })
      .expect(200);
    expect(put.body).toEqual({ ...DEFAULTS, emailUpdates: false });

    const res = await agent.get("/api/users/preferences").expect(200);
    expect(res.body).toEqual({ ...GET_DEFAULTS, emailUpdates: false });
  });

  it("updates several flags together", async () => {
    const { agent } = await authedAgent();
    const put = await agent
      .put("/api/users/preferences")
      .send({ emailUpdates: false, smartSuggestions: false, emailTips: false })
      .expect(200);
    expect(put.body).toEqual({
      ...DEFAULTS,
      emailUpdates: false,
      smartSuggestions: false,
      emailTips: false,
    });
  });

  it("rejects an empty update", async () => {
    const { agent } = await authedAgent();
    await agent.put("/api/users/preferences").send({}).expect(400);
  });

  it("rejects non-boolean values", async () => {
    const { agent } = await authedAgent();
    await agent
      .put("/api/users/preferences")
      .send({ emailUpdates: "yes" })
      .expect(400);
  });

  it("is per-user: one user's opt-out does not affect another", async () => {
    const { agent: a } = await authedAgent();
    const { agent: b } = await authedAgent();
    await a.put("/api/users/preferences").send({ smartSuggestions: false }).expect(200);
    const res = await b.get("/api/users/preferences").expect(200);
    expect(res.body.smartSuggestions).toBe(true);
  });

  it("requires auth", async () => {
    await request(app).get("/api/users/preferences").expect(401);
  });

  it("accepts the three profile-visibility values and rejects anything else", async () => {
    const { agent } = await authedAgent();
    for (const v of ["contacts", "nobody", "everyone"]) {
      const res = await agent
        .put("/api/users/preferences")
        .send({ profileVisibility: v })
        .expect(200);
      expect(res.body.profileVisibility).toBe(v);
    }
    await agent
      .put("/api/users/preferences")
      .send({ profileVisibility: "friends" })
      .expect(400);
  });

  it("does not let two-factor be switched on through the preferences endpoint", async () => {
    const { agent } = await authedAgent();
    // Arming a login factor has to prove control of the mailbox first, so the
    // flag is deliberately not writable here.
    await agent
      .put("/api/users/preferences")
      .send({ twoFactorEnabled: true })
      .expect(400);
  });
});

describe("blocked users", () => {
  it("blocks by email, lists the block, and removes it", async () => {
    const { agent } = await authedAgent();
    const other = await authedAgent();

    const created = await agent
      .post("/api/users/blocked")
      .send({ email: other.email })
      .expect(201);
    expect(created.body.blocked.user.email).toBe(other.email);

    const list = await agent.get("/api/users/blocked").expect(200);
    expect(list.body.blocked).toHaveLength(1);

    await agent.delete(`/api/users/blocked/${created.body.blocked.id}`).expect(200);
    const after = await agent.get("/api/users/blocked").expect(200);
    expect(after.body.blocked).toHaveLength(0);
  });

  it("blocking the same person twice does not create a duplicate", async () => {
    const { agent } = await authedAgent();
    const other = await authedAgent();
    await agent.post("/api/users/blocked").send({ email: other.email }).expect(201);
    await agent.post("/api/users/blocked").send({ email: other.email }).expect(201);
    const list = await agent.get("/api/users/blocked").expect(200);
    expect(list.body.blocked).toHaveLength(1);
  });

  it("refuses to block yourself or an address with no account", async () => {
    const { agent, email } = await authedAgent();
    await agent.post("/api/users/blocked").send({ email }).expect(404);
    await agent
      .post("/api/users/blocked")
      .send({ email: "nobody-here@example.com" })
      .expect(404);
  });

  it("one user's block list is not visible to another", async () => {
    const { agent: a } = await authedAgent();
    const { agent: b } = await authedAgent();
    const target = await authedAgent();
    const created = await a
      .post("/api/users/blocked")
      .send({ email: target.email })
      .expect(201);
    // B can neither see nor delete A's block.
    expect((await b.get("/api/users/blocked").expect(200)).body.blocked).toHaveLength(0);
    await b.delete(`/api/users/blocked/${created.body.blocked.id}`).expect(404);
  });

  it("requires auth", async () => {
    await request(app).get("/api/users/blocked").expect(401);
  });
});

describe("device locks (biometric)", () => {
  it("registers a credential, reports the lock as on, and clears it", async () => {
    const { agent } = await authedAgent();
    expect((await agent.get("/api/users/preferences").expect(200)).body.biometricLock)
      .toBe(false);

    await agent
      .post("/api/users/device-locks")
      .send({ credentialId: "credential-abcdefgh", label: "Chrome on Windows" })
      .expect(201);

    expect((await agent.get("/api/users/preferences").expect(200)).body.biometricLock)
      .toBe(true);
    expect((await agent.get("/api/users/device-locks").expect(200)).body.locks)
      .toHaveLength(1);

    await agent.delete("/api/users/device-locks").expect(200);
    expect((await agent.get("/api/users/preferences").expect(200)).body.biometricLock)
      .toBe(false);
  });

  it("rejects a credential id that is too short", async () => {
    const { agent } = await authedAgent();
    await agent.post("/api/users/device-locks").send({ credentialId: "abc" }).expect(400);
  });
});

describe("addresses (edit screen)", () => {
  it("creates with receiver contact + landmark and edits via PATCH", async () => {
    const { agent } = await authedAgent();
    const created = await agent
      .post("/api/users/addresses")
      .send({
        label: "Home",
        line1: "Flat 402",
        line2: "Sunrise Apartments, MG Road",
        landmark: "Near metro",
        contactName: "Ravi Kumar",
        contactPhone: "9876543210",
        city: "Hyderabad",
        state: "Telangana",
        pincode: "500081",
        lat: 17.44,
        lng: 78.35,
        isDefault: true,
      })
      .expect(201);
    const id = created.body.address.id as string;
    expect(created.body.address.contactName).toBe("Ravi Kumar");

    const updated = await agent
      .patch(`/api/users/addresses/${id}`)
      .send({
        label: "Work",
        line1: "Flat 402",
        line2: "RMZ Infinity",
        city: "Hyderabad",
        state: "Telangana",
        pincode: "500032",
      })
      .expect(200);
    expect(updated.body.address.label).toBe("Work");
    expect(updated.body.address.line2).toBe("RMZ Infinity");
    expect(updated.body.address.landmark).toBeNull(); // full replace semantics
  });

  it("rejects a bad receiver phone and editing someone else's address", async () => {
    const { agent } = await authedAgent();
    await agent
      .post("/api/users/addresses")
      .send({
        label: "Home",
        line1: "1",
        city: "Hyd",
        state: "TG",
        pincode: "500001",
        contactPhone: "12345",
      })
      .expect(400);

    const owner = await authedAgent();
    const created = await owner.agent
      .post("/api/users/addresses")
      .send({ label: "Home", line1: "1A", city: "Hyd", state: "TG", pincode: "500001" })
      .expect(201);
    await agent
      .patch(`/api/users/addresses/${created.body.address.id}`)
      .send({ label: "Hacked", line1: "x", city: "Hyd", state: "TG", pincode: "500001" })
      .expect(404);
  });
});
