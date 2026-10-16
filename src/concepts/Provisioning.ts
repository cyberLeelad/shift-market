import type { Collection, Db } from "mongodb";

export class ImproperShiftTimes extends Error {}
export class ImproperShiftDates extends Error {}
export class NoMatchingDates extends Error {}

type Day = "SUNDAY" | "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY";

// JavaScript numbers weekdays from 0 (Sunday) to 6 (Saturday).
const DAY_NUMBER: Record<Day, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

interface Shift {
  _id: string;
  start: string; // "HH:MM", zero-padded so string order matches time order
  end: string;
  date: string; // "YYYY-MM-DD", so string order matches date order
  linked: string[];
}

// Every date from first to last (inclusive) that falls on dayNumber, one week apart.
function weeklyDates(first: string, last: string, dayNumber: number): string[] {
  const dates: string[] = [];
  const end = Date.parse(`${last}T00:00:00Z`);
  let t = Date.parse(`${first}T00:00:00Z`);
  // Move forward to the first matching weekday on or after first.
  while (new Date(t).getUTCDay() !== dayNumber) t += DAY_MS;
  for (; t <= end; t += WEEK_MS) {
    dates.push(new Date(t).toISOString().slice(0, 10));
  }
  return dates;
}

export class ProvisioningConcept {
  private readonly shifts: Collection<Shift>;

  constructor(db: Db) {
    this.shifts = db.collection<Shift>("provisioning.shifts");
  }

  async makeShift({ start, end, date }: { start: string; end: string; date: string }) {
    if (start >= end) {
      throw new ImproperShiftTimes("A shift must end after it starts.");
    }
    const shift = crypto.randomUUID();
    await this.shifts.insertOne({ _id: shift, start, end, date, linked: [] });
    return { shift };
  }

  async makeWeeklyShift({
    start,
    end,
    day,
    first,
    last,
  }: {
    start: string;
    end: string;
    day: Day;
    first: string;
    last: string;
  }) {
    if (start >= end) {
      throw new ImproperShiftTimes("A shift must end after it starts.");
    }
    if (first > last) {
      throw new ImproperShiftDates(
        "The first date of the shift window cannot be later than the last date of the shift window.",
      );
    }

    const dates = weeklyDates(first, last, DAY_NUMBER[day]);
    if (dates.length === 0)
        throw new NoMatchingDates("No date in this window falls on that day.");

    // Create every id first, so each shift can link to the others in this call.
    const ids = dates.map(() => crypto.randomUUID());
    await this.shifts.insertMany(
      dates.map((date, i) => ({
        _id: ids[i],
        start,
        end,
        date,
        linked: ids.filter((id) => id !== ids[i]),
      })),
    );
    return { shift: ids[0] };
  }

  async _all(_input: Record<string, never>) {
    const rows = await this.shifts.find().sort({ date: 1, start: 1 }).toArray();
    return rows.map(({ _id, start, end, date }) => ({ shift: _id, start, end, date }));
  }
}