// tests/shifts/offer.test.ts
import { describe, expect, test } from "bun:test";
import { startShiftMarket } from "../support/app.ts";
import { ok } from "../support/reusable/results.ts";

const DATE = "2026-11-02";

async function makeShift(api: Awaited<ReturnType<typeof startShiftMarket>>["api"], date = DATE) {
  return ok(await api.shifts.makeOne({ start: "09:00", end: "13:00", date })).shift;
}

/** Assumed: an endpoint that gives a shift to a staff member. Adjust to the real assignment path. */
async function shiftHeldBy(
  api: Awaited<ReturnType<typeof startShiftMarket>>["api"],
  staff: string,
) {
  const shift = await makeShift(api);
  ok(await api.shifts.assign({ shift, staff }));
  return shift;
}

describe("Shifts.Offer", () => {
  test("the holder can offer a shift they hold", async () => {
    const { api } = await startShiftMarket();
    const shift = await shiftHeldBy(api, "ana");

    const result = await api.shifts.offer({ shift, staff: "ana" });

    expect("error" in result).toBe(false);
  });

  test("refuses a shift that does not exist", async () => {
    const { api } = await startShiftMarket();

    const result = await api.shifts.offer({ shift: "no-such-shift", staff: "ana" });

    expect(result).toEqual({ error: "NO_SUCH_SHIFT" });
  });

  test("refuses a shift this person does not hold", async () => {
    const { api } = await startShiftMarket();
    const shift = await shiftHeldBy(api, "ana");

    const result = await api.shifts.offer({ shift, staff: "ben" });

    expect(result).toEqual({ error: "NOT_HELD_BY_STAFF" });
  });

  test("refuses a second offer of a shift already up for offer", async () => {
    const { api } = await startShiftMarket();
    const shift = await shiftHeldBy(api, "ana");
    ok(await api.shifts.offer({ shift, staff: "ana" }));

    const result = await api.shifts.offer({ shift, staff: "ana" });

    expect(result).toEqual({ error: "ALREADY_OFFERED" });
  });

  test("refuses an offer by anyone while the shift is already up for offer", async () => {
    const { api } = await startShiftMarket();
    const shift = await shiftHeldBy(api, "ana");
    ok(await api.shifts.offer({ shift, staff: "ana" }));

    // "By any owner": another staff member's attempt is also refused, and it
    // reports the existing offer rather than the holder check.
    const result = await api.shifts.offer({ shift, staff: "ben" });

    expect(result).toEqual({ error: "ALREADY_OFFERED" });
  });

  test("concurrent offers of one shift produce exactly one offer", async () => {
    const { api } = await startShiftMarket();
    const shift = await shiftHeldBy(api, "ana");

    const outcomes = await Promise.all(
      Array.from({ length: 8 }, () => api.shifts.offer({ shift, staff: "ana" })),
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