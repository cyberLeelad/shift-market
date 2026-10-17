import { describe, expect, test } from "bun:test";
import {
  ImproperShiftDates,
  ImproperShiftTimes,
  NoMatchingDates,
  ProvisioningConcept,
} from "../../src/concepts/Provisioning.ts";
import { testDatabase } from "../support/reusable/mongo.ts";

async function setup() {
  const database = await testDatabase();
  return { provisioning: new ProvisioningConcept(database), database };
}

describe("Provisioning", () => {
  test("its principle: a one-off shift can be made, and a weekly shift makes one shift for each matching week", async () => {
    const { provisioning } = await setup();

    const { shift: oneOff } = await provisioning.makeShift({ start: "08:00", end: "10:00", date: "2026-10-13" });
    expect(await provisioning._exists({ shift: oneOff })).toEqual({ exists: true });

    const { shift: firstWeekly } = await provisioning.makeWeeklyShift({
      start: "10:00",
      end: "12:00",
      day: "MONDAY",
      first: "2026-10-12",
      last: "2026-10-26",
    });
    expect(await provisioning._exists({ shift: firstWeekly })).toEqual({ exists: true });

    const rows = await provisioning._all({});
    expect(rows.map(({ date, start, end }) => ({ date, start, end }))).toEqual([
      { date: "2026-10-12", start: "10:00", end: "12:00" },
      { date: "2026-10-13", start: "08:00", end: "10:00" },
      { date: "2026-10-19", start: "10:00", end: "12:00" },
      { date: "2026-10-26", start: "10:00", end: "12:00" },
    ]);
  });

  test("a weekly shift only covers the chosen weekday inside the window", async () => {
    const { provisioning } = await setup();
    await provisioning.makeWeeklyShift({
      start: "18:00",
      end: "20:00",
      day: "FRIDAY",
      first: "2026-10-12",
      last: "2026-10-25",
    });
    const rows = await provisioning._all({});
    expect(rows.map(({ date }) => date)).toEqual(["2026-10-16", "2026-10-23"]);
  });

  test("a weekly window that starts and ends on the chosen weekday gives exactly one shift", async () => {
    const { provisioning } = await setup();
    await provisioning.makeWeeklyShift({
      start: "18:00",
      end: "20:00",
      day: "FRIDAY",
      first: "2026-10-16",
      last: "2026-10-16",
    });
    expect(await provisioning._all({})).toHaveLength(1);
  });

  test("every shift from one weekly call is linked to the others, so they form one series", async () => {
    const { provisioning, database } = await setup();
    await provisioning.makeWeeklyShift({
      start: "10:00",
      end: "12:00",
      day: "MONDAY",
      first: "2026-10-12",
      last: "2026-10-26",
    });
    // Reads the stored links directly to check them. Setup still goes through the concept.
    const stored = await database.collection("provisioning.shifts").find().toArray();
    expect(stored).toHaveLength(3);
    for (const row of stored) {
      expect(row.linked).toHaveLength(2);
      expect(row.linked).not.toContain(row._id);
    }
  });

  test("a one-off shift has no linked shifts", async () => {
    const { provisioning, database } = await setup();
    await provisioning.makeShift({ start: "08:00", end: "10:00", date: "2026-10-13" });
    const [stored] = await database.collection("provisioning.shifts").find().toArray();
    expect(stored.linked).toEqual([]);
  });

  test("an end time after midnight is stored past 24:00, so the shift sorts with its own day", async () => {
    const { provisioning } = await setup();
    await provisioning.makeShift({ start: "22:00", end: "00:00", date: "2026-10-16" });
    await provisioning.makeShift({ start: "22:00", end: "00:30", date: "2026-10-17" });
    const rows = await provisioning._all({});
    expect(rows.map(({ start, end }) => ({ start, end }))).toEqual([
      { start: "22:00", end: "24:00" },
      { start: "22:00", end: "24:30" },
    ]);
  });

  test("a shift that ends at or before its start during the day is refused", async () => {
    const { provisioning } = await setup();
    const backwards = provisioning.makeShift({ start: "10:00", end: "09:00", date: "2026-10-13" });
    await expect(backwards).rejects.toThrow(ImproperShiftTimes);
    await expect(backwards).rejects.toThrow("A shift must end after it starts.");
    await expect(provisioning.makeShift({ start: "10:00", end: "10:00", date: "2026-10-13" })).rejects.toThrow(
      ImproperShiftTimes,
    );
    expect(await provisioning._all({})).toEqual([]);
  });

  test("a weekly shift with an end before its start is refused, and nothing is created", async () => {
    const { provisioning } = await setup();
    const refusal = provisioning.makeWeeklyShift({
      start: "12:00",
      end: "10:00",
      day: "MONDAY",
      first: "2026-10-12",
      last: "2026-10-26",
    });
    await expect(refusal).rejects.toThrow(ImproperShiftTimes);
    expect(await provisioning._all({})).toEqual([]);
  });

  test("a weekly window whose first date is after its last date is refused, and nothing is created", async () => {
    const { provisioning } = await setup();
    const refusal = provisioning.makeWeeklyShift({
      start: "10:00",
      end: "12:00",
      day: "MONDAY",
      first: "2026-10-26",
      last: "2026-10-12",
    });
    await expect(refusal).rejects.toThrow(ImproperShiftDates);
    await expect(refusal).rejects.toThrow(
      "The first date of the shift window cannot be later than the last date of the shift window.",
    );
    expect(await provisioning._all({})).toEqual([]);
  });

  test("a weekly window with no matching weekday is refused, and nothing is created", async () => {
    const { provisioning } = await setup();
    const refusal = provisioning.makeWeeklyShift({
      start: "10:00",
      end: "12:00",
      day: "FRIDAY",
      first: "2026-10-12",
      last: "2026-10-14",
    });
    await expect(refusal).rejects.toThrow(NoMatchingDates);
    await expect(refusal).rejects.toThrow("No date in this window falls on that day.");
    expect(await provisioning._all({})).toEqual([]);
  });

  test("when both the times and the dates are wrong, the time refusal is reported", async () => {
    const { provisioning } = await setup();
    await expect(
      provisioning.makeWeeklyShift({
        start: "12:00",
        end: "10:00",
        day: "MONDAY",
        first: "2026-10-26",
        last: "2026-10-12",
      }),
    ).rejects.toThrow(ImproperShiftTimes);
  });

  test("_exists is false for an id that was never made", async () => {
    const { provisioning } = await setup();
    expect(await provisioning._exists({ shift: "never-made" })).toEqual({ exists: false });
  });

  test("_all lists shifts ordered by date and then start time, and no rows when there are none", async () => {
    const { provisioning } = await setup();
    expect(await provisioning._all({})).toEqual([]);

    await provisioning.makeShift({ start: "14:00", end: "16:00", date: "2026-10-13" });
    await provisioning.makeShift({ start: "08:00", end: "10:00", date: "2026-10-13" });
    await provisioning.makeShift({ start: "08:00", end: "10:00", date: "2026-10-12" });
    const rows = await provisioning._all({});
    expect(rows.map(({ date, start }) => ({ date, start }))).toEqual([
      { date: "2026-10-12", start: "08:00" },
      { date: "2026-10-13", start: "08:00" },
      { date: "2026-10-13", start: "14:00" },
    ]);
  });
});