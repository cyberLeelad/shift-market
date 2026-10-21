import { describe, expect, test } from "bun:test";
import { AlreadyReserved, NoSuchReservation, ReservingConcept } from "../../src/concepts/Reserving.ts";
import { testDatabase } from "../support/reusable/mongo.ts";
import { expectOneWinner } from "../support/reusable/race.ts";

async function setup() {
  const database = await testDatabase();
  return { reserving: new ReservingConcept(database) };
}

describe("Reserving", () => {
  test("its principle: Fionna holds oct-13-6pm, Cake is refused until she cancels, then Cake can reserve it", async () => {
    const { reserving } = await setup();

    const { reservation } = await reserving.reserve({ user: "fionna", resource: "oct-13-6pm" });
    const refusal = reserving.reserve({ user: "cake", resource: "oct-13-6pm" });
    await expect(refusal).rejects.toThrow(AlreadyReserved);
    await expect(refusal).rejects.toThrow("That resource is already reserved.");

    expect(await reserving.cancel({ reservation })).toEqual({ reservation });
    const retry = await reserving.reserve({ user: "cake", resource: "oct-13-6pm" });
    expect(await reserving._all({})).toEqual([
      { reservation: retry.reservation, user: "cake", resource: "oct-13-6pm" },
    ]);
  });

  test("_all lists every reservation ordered by resource, and no rows when there are none", async () => {
    const { reserving } = await setup();
    expect(await reserving._all({})).toEqual([]);

    await reserving.reserve({ user: "cake", resource: "oct-14-6pm" });
    await reserving.reserve({ user: "fionna", resource: "oct-13-6pm" });
    const rows = await reserving._all({});
    expect(rows.map(({ user, resource }) => ({ user, resource }))).toEqual([
      { user: "fionna", resource: "oct-13-6pm" },
      { user: "cake", resource: "oct-14-6pm" },
    ]);
  });

  test("one user can hold several different resources at once", async () => {
    const { reserving } = await setup();
    await reserving.reserve({ user: "fionna", resource: "oct-13-6pm" });
    await reserving.reserve({ user: "fionna", resource: "oct-22-12pm" });
    const rows = await reserving._all({});
    expect(rows.map(({ resource }) => resource)).toEqual(["oct-13-6pm", "oct-22-12pm"]);
  });

  test("a refused reservation leaves the current holder in place", async () => {
    const { reserving } = await setup();
    await reserving.reserve({ user: "fionna", resource: "oct-13-6pm" });

    await expect(reserving.reserve({ user: "cake", resource: "oct-13-6pm" })).rejects.toThrow(AlreadyReserved);
    const rows = await reserving._all({});
    expect(rows.map(({ user, resource }) => ({ user, resource }))).toEqual([
      { user: "fionna", resource: "oct-13-6pm" },
    ]);
  });

  test("cancelling twice, or cancelling a reservation that never existed, is refused and changes nothing", async () => {
    const { reserving } = await setup();
    const { reservation } = await reserving.reserve({ user: "fionna", resource: "oct-13-6pm" });
    await reserving.cancel({ reservation });

    const refusal = reserving.cancel({ reservation });
    await expect(refusal).rejects.toThrow(NoSuchReservation);
    await expect(refusal).rejects.toThrow("There is no such reservation.");
    await expect(reserving.cancel({ reservation: "never-existed" })).rejects.toThrow(NoSuchReservation);
    expect(await reserving._all({})).toEqual([]);
  });

  test("two users reserving the same resource at once: exactly one succeeds and the other is refused", async () => {
    const { reserving } = await setup();
    await expectOneWinner(
      [
        reserving.reserve({ user: "fionna", resource: "oct-13-6pm" }),
        reserving.reserve({ user: "cake", resource: "oct-13-6pm" }),
      ],
      AlreadyReserved,
    );
    expect(await reserving._all({})).toHaveLength(1);
  });

  test("two cancellations of one reservation at once: one succeeds and the other is refused", async () => {
    const { reserving } = await setup();
    const { reservation } = await reserving.reserve({ user: "fionna", resource: "oct-13-6pm" });
    await expectOneWinner(
      [reserving.cancel({ reservation }), reserving.cancel({ reservation })],
      NoSuchReservation,
    );
    expect(await reserving._all({})).toEqual([]);
  });
});

describe("transfer", () => {
  test("moves the holder to another user and keeps the same reservation", async () => {
    const { reserving } = await setup();
    const { reservation } = await reserving.reserve({ user: "fionna", resource: "oct-13-6pm" });

    expect(await reserving.transfer({ resource: "oct-13-6pm", user: "cake" })).toEqual({ reservation });
    expect(await reserving._all({})).toEqual([{ reservation, user: "cake", resource: "oct-13-6pm" }]);
  });

  test("transferring the same resource again moves the holder again", async () => {
    const { reserving } = await setup();
    const { reservation } = await reserving.reserve({ user: "fionna", resource: "oct-13-6pm" });
    await reserving.transfer({ resource: "oct-13-6pm", user: "cake" });

    expect(await reserving.transfer({ resource: "oct-13-6pm", user: "dee" })).toEqual({ reservation });
    expect(await reserving._all({})).toEqual([{ reservation, user: "dee", resource: "oct-13-6pm" }]);
  });

  test("transferring to the current holder changes nothing", async () => {
    const { reserving } = await setup();
    const { reservation } = await reserving.reserve({ user: "fionna", resource: "oct-13-6pm" });

    expect(await reserving.transfer({ resource: "oct-13-6pm", user: "fionna" })).toEqual({ reservation });
    expect(await reserving._all({})).toEqual([{ reservation, user: "fionna", resource: "oct-13-6pm" }]);
  });

  test("does not create a second reservation", async () => {
    const { reserving } = await setup();
    await reserving.reserve({ user: "fionna", resource: "oct-13-6pm" });
    await reserving.transfer({ resource: "oct-13-6pm", user: "cake" });

    expect(await reserving._all({})).toHaveLength(1);
  });

  test("leaves other resources and their holders untouched", async () => {
    const { reserving } = await setup();
    await reserving.reserve({ user: "fionna", resource: "oct-13-6pm" });
    const other = await reserving.reserve({ user: "fionna", resource: "oct-22-12pm" });

    await reserving.transfer({ resource: "oct-13-6pm", user: "cake" });

    expect(await reserving._all({})).toEqual([
      { reservation: expect.any(String), user: "cake", resource: "oct-13-6pm" },
      { reservation: other.reservation, user: "fionna", resource: "oct-22-12pm" },
    ]);
  });

  test("a resource that is not reserved is refused and nothing is created", async () => {
    const { reserving } = await setup();

    const refusal = reserving.transfer({ resource: "oct-13-6pm", user: "cake" });
    await expect(refusal).rejects.toThrow(NoSuchReservation);
    await expect(refusal).rejects.toThrow("There is no such reservation.");
    expect(await reserving._all({})).toEqual([]);
  });

  test("a resource whose reservation was cancelled is refused", async () => {
    const { reserving } = await setup();
    const { reservation } = await reserving.reserve({ user: "fionna", resource: "oct-13-6pm" });
    await reserving.cancel({ reservation });

    await expect(reserving.transfer({ resource: "oct-13-6pm", user: "cake" })).rejects.toThrow(NoSuchReservation);
    expect(await reserving._all({})).toEqual([]);
  });

  test("concurrent transfers of one reservation both succeed, keep one row, and leave one holder", async () => {
    const { reserving } = await setup();
    const { reservation } = await reserving.reserve({ user: "fionna", resource: "oct-13-6pm" });

    const results = await Promise.all([
      reserving.transfer({ resource: "oct-13-6pm", user: "cake" }),
      reserving.transfer({ resource: "oct-13-6pm", user: "dee" }),
    ]);

    expect(results).toEqual([{ reservation }, { reservation }]);
    const rows = await reserving._all({});
    expect(rows).toHaveLength(1);
    expect(["cake", "dee"]).toContain(rows[0]!.user);
  });

  test("a transfer racing a cancel leaves a consistent state", async () => {
    const { reserving } = await setup();
    const { reservation } = await reserving.reserve({ user: "fionna", resource: "oct-13-6pm" });

    const [transfer, cancel] = await Promise.allSettled([
      reserving.transfer({ resource: "oct-13-6pm", user: "cake" }),
      reserving.cancel({ reservation }),
    ]);

    expect(cancel.status).toBe("fulfilled");
    if (transfer.status === "rejected") expect(transfer.reason).toBeInstanceOf(NoSuchReservation);
    // Whichever ran first, the reservation is either gone or held once, never duplicated.
    expect((await reserving._all({})).length).toBeLessThanOrEqual(0);
  });
});