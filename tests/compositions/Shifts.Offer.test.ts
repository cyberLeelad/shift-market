// tests/compositions/Shifts.Offer.test.ts
import { describe, expect, test } from "bun:test";
import { startShiftMarket } from "../support/app.ts";
import { ok } from "../support/reusable/results.ts";

const DATE = "2026-11-02";

type Market = Awaited<ReturnType<typeof startShiftMarket>>;

async function makeShift(api: Market["api"]) {
  return ok(await api.shifts.makeOne({ start: "09:00", end: "13:00", date: DATE })).shift;
}

/** A shift held by `user`, obtained the way the app does it: by claiming an unheld shift. */
async function shiftHeldBy(api: Market["api"], user: string) {
  const shift = await makeShift(api);
  ok(await api.shifts.claim({ resource: shift, user }));
  return shift;
}

describe("Shifts.Offer", () => {
  test("the holder can offer a shift they hold", async () => {
    const { api } = await startShiftMarket();
    const shift = await shiftHeldBy(api, "ana");

    const result = await api.shifts.offer({ resource: shift, user: "ana" });

    expect("error" in result).toBe(false);
  });

  test("refuses a shift that does not exist", async () => {
    const { api } = await startShiftMarket();

    const result = await api.shifts.offer({ resource: "no-such-shift", user: "ana" });

    expect(result).toEqual({ error: "UNKNOWN_SHIFT" });
  });

  test("refuses a shift this person does not hold", async () => {
    const { api } = await startShiftMarket();
    const shift = await shiftHeldBy(api, "ana");

    const result = await api.shifts.offer({ resource: shift, user: "ben" });

    expect(result).toEqual({ error: "NOT_HELD" });
  });

  test("refuses a shift nobody holds", async () => {
    const { api } = await startShiftMarket();
    const shift = await makeShift(api);

    const result = await api.shifts.offer({ resource: shift, user: "ana" });

    expect(result).toEqual({ error: "NOT_HELD" });
  });

  test("refuses a second offer of a shift already up for offer", async () => {
    const { api } = await startShiftMarket();
    const shift = await shiftHeldBy(api, "ana");
    ok(await api.shifts.offer({ resource: shift, user: "ana" }));

    const result = await api.shifts.offer({ resource: shift, user: "ana" });

    expect(result).toEqual({ error: "ALREADY_OFFERED" });
  });

  test("refuses an offer by anyone while the shift is already up for offer", async () => {
    const { api } = await startShiftMarket();
    const shift = await shiftHeldBy(api, "ana");
    ok(await api.shifts.offer({ resource: shift, user: "ana" }));

    const result = await api.shifts.offer({ resource: shift, user: "ben" });

    expect(result).toEqual({ error: "ALREADY_OFFERED" });
  });

  test("concurrent offers of one shift produce exactly one offer", async () => {
    const { api } = await startShiftMarket();
    const shift = await shiftHeldBy(api, "ana");

    const outcomes = await Promise.all(
      Array.from({ length: 8 }, () => api.shifts.offer({ resource: shift, user: "ana" })),
    );

    const accepted = outcomes.filter((outcome) => !("error" in outcome));
    const refused = outcomes.filter((outcome) => "error" in outcome);
    expect(accepted).toHaveLength(1);
    expect(refused).toHaveLength(7);
    for (const outcome of refused) {
      expect(outcome).toEqual({ error: "ALREADY_OFFERED" });
    }
  });
});