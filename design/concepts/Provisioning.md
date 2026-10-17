# Provisioning

## Purpose

Provision time slots (shifts) for filling in advance.

## Principle

Shifts can be created, either one-off or on a recurring weekly schedule.

## Types

```types
Day is MONDAY or TUESDAY or WEDNESDAY or THURSDAY or FRIDAY or SATURDAY or SUNDAY
  The day of the week, an enum used to error-proof makeWeeklyShift.

external Time
  A representation of a time in a day. This must be a type that can be compared (e.g. has valueOf()). For comparisons, I'm counting an end that comes after start, but before 6am, as the following morning, and therefore in that case end > start.
```

## State

```state
a set of Shifts with
  a start Time
  an end Time
  a Date
  a linked set of Shifts
```

## Actions

```actions
makeShift(start: Time, end: Time, date: Date) : returns (shift: Shift)
  where start < end
  then
    create a new shift with the given parameters
    returns shift
  where start >= end
  then
    refuses IMPROPER_SHIFT_TIMES "A shift must end after it starts."

makeWeeklyShift(start: Time, end: Time, day: Day, first: Date, last: Date) : returns (shift: Shift)
  where start < end and first <= last and some date between first and last falls on day
  then
    create new shifts, one for each week between first and last (inclusive), with each's linked Shifts containing all other shifts created in this call
    create a set with all the newly-created shifts, and return an arbitrary one
    returns shift
  where start < end and first <= last and no date between first and last falls on day
  then
    refuses NO_MATCHING_DATES "No date in this window falls on that day."
  where start < end and first > last
  then
    refuses IMPROPER_SHIFT_DATES "The first date of the shift window cannot be later than the the last date of the shift window."
  where start >= end
  then
    refuses IMPROPER_SHIFT_TIMES "A shift must end after it starts."
```

## Queries

```queries
_all() : many (shift: Shift, start: Time, end: Time, date: Date)
  Answers every shift, ordered chronologically by start date and time (with ties ordered arbitrarily), and no rows when there are none.

_exists(shift: Shift) : one (exists: Flag)
  Returns true if and only if shift exists in Shifts, and false otherwise.
```