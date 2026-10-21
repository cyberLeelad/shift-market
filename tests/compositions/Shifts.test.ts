import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { startShiftMarket } from "../support/app.ts";
import { ok } from "../support/reusable/results.ts";

type Market = Awaited<ReturnType<typeof startShiftMarket>>;

let stopCurrent: (() => Promise<void>) | undefined;

async function start(): Promise<Market> {
  const market = await startShiftMarket();
  stopCurrent = async () => {
    await market.application.beginDrain();
    await market.application.whenIdle();
  };
  return market;
}

afterEach(async () => {
  await stopCurrent?.();
  stopCurrent = undefined;
});

async function listedShifts(api: Market["api"]) {
  return ok(await api.shifts.list()).organizer.shifts;
}

describe("Shifts.MakeOne", () => {
  test("creates a shift that the list reports", async () => {
    const { api } = await start();

    const made = ok(await api.shifts.makeOne({ start: "09:00", end: "17:00", date: "2026-10-20" }));

    expect(await listedShifts(api)).toEqual([
      {
        shift: made.shift,
        start: "09:00",
        end: "17:00",
        date: "2026-10-20",
        holder: null,
        offer: null,
      },
    ]);
  });

  test("moves an end before 06:00 into the following morning", async () => {
    const { api } = await start();

    ok(await api.shifts.makeOne({ start: "22:00", end: "02:00", date: "2026-10-20" }));

    expect((await listedShifts(api))[0]).toMatchObject({ start: "22:00", end: "26:00" });
  });

  test("refuses a shift that does not end after it starts", async () => {
    const { api } = await start();

    const refused = await api.shifts.makeOne({ start: "09:00", end: "09:00", date: "2026-10-20" });

    expect(refused).toHaveProperty("error");
    expect(await listedShifts(api)).toEqual([]);
  });

  test("rejects input missing a required field", async () => {
    const { api } = await start();

    // Cast because the typed client requires `date`; the boundary must still reject it at runtime.
    const refused = await api.shifts.makeOne({ start: "09:00", end: "17:00" } as never);

    expect(refused).toEqual({ error: "INVALID_INPUT" });
    expect(await listedShifts(api)).toEqual([]);
  });
});

describe("Shifts.MakeWeekly", () => {
  test("creates one shift per matching weekday in the window", async () => {
    const { api } = await start();

    // Mondays between Sunday 2026-10-18 and Sunday 2026-11-08.
    const made = ok(
      await api.shifts.makeWeekly({
        start: "09:00",
        end: "17:00",
        day: "MONDAY",
        first: "2026-10-18",
        last: "2026-11-08",
      }),
    );

    const shifts = await listedShifts(api);
    expect(shifts.map((s) => s.date)).toEqual(["2026-10-19", "2026-10-26", "2026-11-02"]);
    expect(made.shift).toBe(shifts[0].shift);
  });

  test("includes the window's first and last date when they match", async () => {
    const { api } = await start();

    ok(
      await api.shifts.makeWeekly({
        start: "09:00",
        end: "17:00",
        day: "MONDAY",
        first: "2026-10-19",
        last: "2026-10-19",
      }),
    );

    expect((await listedShifts(api)).map((s) => s.date)).toEqual(["2026-10-19"]);
  });

  test("refuses a window whose first date is after its last date", async () => {
    const { api } = await start();

    const refused = await api.shifts.makeWeekly({
      start: "09:00",
      end: "17:00",
      day: "MONDAY",
      first: "2026-11-08",
      last: "2026-10-18",
    });

    expect(refused).toHaveProperty("error");
    expect(await listedShifts(api)).toEqual([]);
  });

  test("refuses a window with no date on the requested weekday", async () => {
    const { api } = await start();

    const refused = await api.shifts.makeWeekly({
      start: "09:00",
      end: "17:00",
      day: "WEDNESDAY",
      first: "2026-10-19",
      last: "2026-10-20",
    });

    expect(refused).toHaveProperty("error");
    expect(await listedShifts(api)).toEqual([]);
  });

  test("rejects input missing a required field", async () => {
    const { api } = await start();

    const refused = await api.shifts.makeWeekly({
      start: "09:00",
      end: "17:00",
      first: "2026-10-18",
      last: "2026-11-08",
    } as never);

    expect(refused).toEqual({ error: "INVALID_INPUT" });
  });
});

describe("Shifts.List basics", () => {
  test("returns an empty organizer when no shifts exist", async () => {
    const { api } = await start();

    expect(ok(await api.shifts.list())).toEqual({ organizer: { shifts: [] } });
  });

  test("orders shifts by date, then by start time", async () => {
    const { api } = await start();

    ok(await api.shifts.makeOne({ start: "13:00", end: "15:00", date: "2026-10-21" }));
    ok(await api.shifts.makeOne({ start: "17:00", end: "19:00", date: "2026-10-20" }));
    ok(await api.shifts.makeOne({ start: "09:00", end: "11:00", date: "2026-10-20" }));

    expect((await listedShifts(api)).map((s) => [s.date, s.start])).toEqual([
      ["2026-10-20", "09:00"],
      ["2026-10-20", "17:00"],
      ["2026-10-21", "13:00"],
    ]);
  });
});

describe("Shifts.List reservation and offer state", () => {
  test("shows unreserved, held, and held-and-offered shifts with the right holder and offer", async () => {
    const { api } = await start();
    const open = ok(await api.shifts.makeOne({ start: "09:00", end: "11:00", date: "2026-10-20" })).shift;
    const held = ok(await api.shifts.makeOne({ start: "11:00", end: "13:00", date: "2026-10-20" })).shift;
    const offered = ok(await api.shifts.makeOne({ start: "13:00", end: "15:00", date: "2026-10-20" })).shift;

    ok(await api.shifts.claim({ user: "ana", resource: held }));
    ok(await api.shifts.claim({ user: "ben", resource: offered }));
    const { offer } = ok(await api.shifts.offer({ resource: offered, user: "ben" }));

    const rows = new Map((await listedShifts(api)).map((row) => [row.shift, row]));

    expect(rows.get(open)).toMatchObject({ holder: null, offer: null });
    expect(rows.get(held)).toMatchObject({ holder: "ana", offer: null });
    expect(rows.get(offered)).toMatchObject({ holder: "ben", offer });
  });

  test("claiming an offered shift clears the offer and moves the holder to the claimer", async () => {
    const { api } = await start();
    const shift = ok(await api.shifts.makeOne({ start: "09:00", end: "11:00", date: "2026-10-20" })).shift;
    ok(await api.shifts.claim({ user: "ana", resource: shift }));
    ok(await api.shifts.offer({ resource: shift, user: "ana" }));

    ok(await api.shifts.claim({ user: "ben", resource: shift }));

    const row = (await listedShifts(api)).find((r) => r.shift === shift);
    expect(row).toMatchObject({ holder: "ben", offer: null });
  });
});

// CLAIM
async function makeShift(api: Market["api"]): Promise<string> {
  return ok(await api.shifts.makeOne({ start: "09:00", end: "17:00", date: "2026-11-02" })).shift;
}

/** A shift `user` holds, obtained by claiming it. */
async function shiftHeldBy(api: Market["api"], user: string): Promise<string> {
  const shift = await makeShift(api);
  ok(await api.shifts.claim({ user, resource: shift }));
  return shift;
}

describe("Shifts.Claim", () => {
  let api: Market["api"];

  beforeEach(async () => {
    ({ api } = await start());
  });

  test("a staff member claims an open shift and then holds it", async () => {
    const shift = await makeShift(api);

    ok(await api.shifts.claim({ user: "rowan", resource: shift }));

    // Holding is observable through offering: only the holder can offer.
    expect("error" in (await api.shifts.offer({ resource: shift, user: "rowan" }))).toBe(false);
  });

  test("an unknown shift is refused", async () => {
    const result = await api.shifts.claim({ user: "rowan", resource: crypto.randomUUID() });

    expect(result).toEqual({ error: "UNKNOWN_SHIFT" });
  });

  test("a held shift that is not offered is refused to other staff and to its holder", async () => {
    const shift = await shiftHeldBy(api, "rowan");

    expect(await api.shifts.claim({ user: "sam", resource: shift })).toEqual({ error: "TAKEN" });
    expect(await api.shifts.claim({ user: "rowan", resource: shift })).toEqual({ error: "TAKEN" });
  });

  test("a refused claim leaves the holder unchanged", async () => {
    const shift = await shiftHeldBy(api, "rowan");

    await api.shifts.claim({ user: "sam", resource: shift });

    expect("error" in (await api.shifts.offer({ resource: shift, user: "rowan" }))).toBe(false);
  });

  test("simultaneous claims on an open shift leave exactly one holder", async () => {
    const shift = await makeShift(api);
    const users = ["ada", "ben", "cy", "dee", "eli"];

    const results = await Promise.all(users.map((user) => api.shifts.claim({ user, resource: shift })));

    const winners = results.flatMap((result, i) => ("error" in result ? [] : [users[i]!]));
    expect(winners).toHaveLength(1);
    expect(results.filter((r) => "error" in r)).toHaveLength(users.length - 1);

    // The single winner is the one holder: they can offer, and no one else can.
    const [winner] = winners;
    expect("error" in (await api.shifts.offer({ resource: shift, user: winner! }))).toBe(false);
  });

  describe("claiming an offered shift", () => {
    test("another staff member claims an offered shift, which then belongs to them", async () => {
      const shift = await shiftHeldBy(api, "ana");
      ok(await api.shifts.offer({ resource: shift, user: "ana" }));

      ok(await api.shifts.claim({ user: "ben", resource: shift }));

      // Ben holds it now, so Ben can offer it again ...
      expect("error" in (await api.shifts.offer({ resource: shift, user: "ben" }))).toBe(false);
    });

    test("claiming closes the offer, and the former holder no longer holds the shift", async () => {
      const shift = await shiftHeldBy(api, "ana");
      ok(await api.shifts.offer({ resource: shift, user: "ana" }));

      ok(await api.shifts.claim({ user: "ben", resource: shift }));

      // ... which is only possible if the earlier offer is no longer open ...
      // ... and Ana, the former holder, can no longer offer it.
      expect(await api.shifts.offer({ resource: shift, user: "ana" })).toEqual({ error: "NOT_HELD" });
    });

    test("the offering staff member can claim their own offer", async () => {
      const shift = await shiftHeldBy(api, "ana");
      ok(await api.shifts.offer({ resource: shift, user: "ana" }));

      ok(await api.shifts.claim({ user: "ana", resource: shift }));

      expect("error" in (await api.shifts.offer({ resource: shift, user: "ana" }))).toBe(false);
    });

    test("a second claim on an already claimed offer is refused, and the first claimer keeps the shift", async () => {
      const shift = await shiftHeldBy(api, "ana");
      ok(await api.shifts.offer({ resource: shift, user: "ana" }));
      ok(await api.shifts.claim({ user: "ben", resource: shift }));

      expect(await api.shifts.claim({ user: "cy", resource: shift })).toHaveProperty("error");
      expect("error" in (await api.shifts.offer({ resource: shift, user: "ben" }))).toBe(false);
    });

    test("simultaneous claims on one offered shift leave exactly one new holder", async () => {
      const shift = await shiftHeldBy(api, "ana");
      ok(await api.shifts.offer({ resource: shift, user: "ana" }));
      const users = ["ben", "cy", "dee", "eli"];

      const results = await Promise.all(users.map((user) => api.shifts.claim({ user, resource: shift })));

      const winners = results.flatMap((result, i) => ("error" in result ? [] : [users[i]!]));
      expect(winners).toHaveLength(1);
      expect(results.filter((r) => "error" in r)).toHaveLength(users.length - 1);
      expect("error" in (await api.shifts.offer({ resource: shift, user: winners[0]! }))).toBe(false);
    });
  });

  test("a claim without a user or resource is rejected", async () => {
    // @ts-expect-error: deliberately omitting required fields
    const result = await api.shifts.claim({ user: "rowan" });

    expect(result).toHaveProperty("error");
  });
});