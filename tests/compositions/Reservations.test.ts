import { describe, expect, test } from "bun:test";
import { startShiftMarket } from "../support/app.ts";
import { ok } from "../support/reusable/results.ts";

async function setup() {
  const { api } = await startShiftMarket();
  /** Makes a one-off shift through the Shifts composition and returns its id. */
  const makeShift = async (date: string, start = "08:00", end = "10:00") =>
    ok(await api.shifts.makeOne({ start, end, date })).shift;
  return { api, makeShift };
}

describe("Reservations", () => {
  test("its principle: a shift is reserved by one person, refused to another, and free again after cancelling", async () => {
    const { api, makeShift } = await setup();
    const shift = await makeShift("2026-10-13");

    const fionna = ok(await api.reservations.reserve({ user: "fionna", resource: shift }));
    expect(await api.reservations.reserve({ user: "cake", resource: shift })).toEqual({ error: "ALREADY_RESERVED" });

    ok(await api.reservations.cancel({ reservation: fionna.reservation }));
    const cake = ok(await api.reservations.reserve({ user: "cake", resource: shift }));
    const { book } = ok(await api.reservations.list({}));
    expect(book.reservations).toEqual([{ reservation: cake.reservation, user: "cake", resource: shift }]);
  });

  test("the list is empty when nothing is reserved", async () => {
    const { api } = await setup();
    const { book } = ok(await api.reservations.list({}));
    expect(book.reservations).toEqual([]);
  });

  test("one person can hold several shifts, and cancelling one leaves the others", async () => {
    const { api, makeShift } = await setup();
    const monday = await makeShift("2026-10-12");
    const friday = await makeShift("2026-10-16");
    const mondayRes = ok(await api.reservations.reserve({ user: "fionna", resource: monday }));
    const fridayRes = ok(await api.reservations.reserve({ user: "fionna", resource: friday }));

    ok(await api.reservations.cancel({ reservation: mondayRes.reservation }));
    const { book } = ok(await api.reservations.list({}));
    expect(book.reservations).toEqual([{ reservation: fridayRes.reservation, user: "fionna", resource: friday }]);
  });

  test("a resource that is not a shift is refused with NOT_A_SHIFT, and nothing is reserved", async () => {
    const { api } = await setup();
    expect(await api.reservations.reserve({ user: "fionna", resource: "oct-13-6pm" })).toEqual({
      error: "NOT_A_SHIFT",
    });
    const { book } = ok(await api.reservations.list({}));
    expect(book.reservations).toEqual([]);
  });

  test("cancelling a reservation twice, or one that never existed, is refused and changes nothing", async () => {
    const { api, makeShift } = await setup();
    const shift = await makeShift("2026-10-13");
    const { reservation } = ok(await api.reservations.reserve({ user: "fionna", resource: shift }));
    ok(await api.reservations.cancel({ reservation }));

    expect(await api.reservations.cancel({ reservation })).toEqual({ error: "NO_SUCH_RESERVATION" });
    expect(await api.reservations.cancel({ reservation: "never-existed" })).toEqual({ error: "NO_SUCH_RESERVATION" });
    const { book } = ok(await api.reservations.list({}));
    expect(book.reservations).toEqual([]);
  });

  test("two people reserving the same shift at once: exactly one succeeds and the other gets CONFLICT", async () => {
    const { api, makeShift } = await setup();
    const shift = await makeShift("2026-10-13");
    const results = await Promise.all([
      api.reservations.reserve({ user: "fionna", resource: shift }),
      api.reservations.reserve({ user: "cake", resource: shift }),
    ]);
    expect(results.filter((r) => "reservation" in r)).toHaveLength(1);
    expect(results.filter((r) => "error" in r)).toEqual([{ error: "ALREADY_RESERVED" }]);
  });
});