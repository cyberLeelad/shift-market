import { afterEach, describe, expect, test } from "bun:test";
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
        { shift: made.shift, start: "09:00", end: "17:00", date: "2026-10-20", holder: null },
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

describe("Shifts.List", () => {
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