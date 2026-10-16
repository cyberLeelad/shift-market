<!-- Generated from the Shift Market assembly. Do not edit. -->
<!-- Manifest producer: @mit-sdg/sync-engine@1.1.0; concept specification: sync-engine.concept-specification@1; renderer: @mit-sdg/sync-engine@1.1.0. -->

# Shift Market — assembled read-back

_Assembled by sync-engine from registered concepts and composition. Edit the concept_
_specifications and composition source, then regenerate this file._

## Concepts

### Provisioning

Defined in [Provisioning](../design/concepts/Provisioning.md), line 1.

#### Actions

- `makeShift(start: Time, end: Time, date: Date) : returns (shift: Shift)`
  - Refuses `IMPROPER_SHIFT_TIMES`: A shift must end after it starts.
- `makeWeeklyShift(start: Time, end: Time, day: Day, first: Date, last: Date) : returns (shift: Shift)`
  - Refuses `NO_MATCHING_DATES`: No date in this window falls on that day.
  - Refuses `IMPROPER_SHIFT_DATES`: The first date of the shift window cannot be later than the the last date of the shift window.
  - Refuses `IMPROPER_SHIFT_TIMES`: A shift must end after it starts.

#### Queries

- `_all() : many (shift: Shift, start: Time, end: Time, date: Date)`

#### Instances

- `Provisioning` — instance of `Provisioning` — [Application types](../design/types.md), line 21.
  - `Time` is `ClockTime` — [Application types](../design/types.md), line 22.

### Reserving

Defined in [Reserving](../design/concepts/Reserving.md), line 1.

#### Actions

- `reserve(user: User, resource: Resource) : returns (reservation: Reservation)`
  - Refuses `ALREADY_RESERVED`: That resource is already reserved.
- `cancel(reservation: Reservation) : returns (reservation: Reservation)`
  - Refuses `NO_SUCH_RESERVATION`: There is no such reservation.

#### Queries

- `_all() : many (reservation: Reservation, user: User, resource: Resource)`

#### Instances

- `Reserving` — instance of `Reserving` — [Application types](../design/types.md), line 17.
  - `Resource` is `Shift` — [Application types](../design/types.md), line 19.
  - `User` is `Kerberos` — [Application types](../design/types.md), line 18.

## Application types

Concrete types:

- `ClockTime` — [Application types](../design/types.md), line 12.
- `Kerberos` — [Application types](../design/types.md), line 6.
- `Shift` — [Application types](../design/types.md), line 9.

## Formers

_Formers name result shapes evaluated when asked. The source former owns_
_the authored explanation; this section records the generated shape._

### the reservation book

Authored path: `Reservations.ReservationBook`.
- Covered by [Reservations](../design/compositions/Reservations.md), line 4.

```former
Former "the reservation book" — inputs (); bindings (reservation, user, resource); promises exactly one record — forms:
  a record of
    reservations: each Reserving._all () has (reservation, resource, user)
      form a record of
        reservation
        resource
        user
```

### the shift organizer

Authored path: `Shifts.ShiftOrganizer`.
- Covered by [Shifts](../design/compositions/Shifts.md), line 4.

```former
Former "the shift organizer" — inputs (); bindings (shift, start, end, date); promises exactly one record — forms:
  a record of
    shifts: each Provisioning._all () has (date, end, shift, start)
      form a record of
        date
        end
        shift
        start
```

## Reactions

### DeliverFaultToAsker

```reaction
when any action is faulted, not asked by DeliverFaultToAsker
where
  earlier, RequestBoundary.request (requestId)
then
  RequestBoundary.respondFramework (error: "INTERNAL_ERROR", requestId)
```

### DeliverRefusalToAsker

```reaction
when any action is refused (message), except RequestBoundary
where
  earlier, RequestBoundary.request (requestId)
then
  RequestBoundary.respond (error: message, requestId)
```

### Reservations.Cancel

Authored path: `Reservations.Cancel`.
- Covered by [Reservations](../design/compositions/Reservations.md), line 11.
- Covered by [Reservations](../design/compositions/Reservations.md), line 15.

```reaction
when RequestBoundary.request (path: "/reservations/cancel", requestId, reservation)
then
  Reserving.cancel (reservation)
```

### Reservations.Cancel#2

Authored path: `Reservations.Cancel`.
- Covered by [Reservations](../design/compositions/Reservations.md), line 11.
- Covered by [Reservations](../design/compositions/Reservations.md), line 15.

```reaction
when Reserving.cancel (reservation), asked by Reservations.Cancel
where
  earlier, RequestBoundary.request (path: "/reservations/cancel", requestId, reservation)
then
  RequestBoundary.respond (requestId, reservation)
```

### Reservations.List

Authored path: `Reservations.List`.
- Covered by [Reservations](../design/compositions/Reservations.md), line 3.
- Covered by [Reservations](../design/compositions/Reservations.md), line 7.

```reaction
when RequestBoundary.request (path: "/reservations/list", requestId)
then
  RequestBoundary.respond (book: former "the reservation book", requestId)
```

### Reservations.Reserve

Authored path: `Reservations.Reserve`.
- Covered by [Reservations](../design/compositions/Reservations.md), line 10.
- Covered by [Reservations](../design/compositions/Reservations.md), line 14.

```reaction
when RequestBoundary.request (path: "/reservations/reserve", requestId, resource, user)
then
  Reserving.reserve (resource, user)
```

### Reservations.Reserve#2

Authored path: `Reservations.Reserve`.
- Covered by [Reservations](../design/compositions/Reservations.md), line 10.
- Covered by [Reservations](../design/compositions/Reservations.md), line 14.

```reaction
when Reserving.reserve (resource, user, reservation), asked by Reservations.Reserve
where
  earlier, RequestBoundary.request (path: "/reservations/reserve", requestId, resource, user)
then
  RequestBoundary.respond (requestId, reservation)
```

### Shifts.List

Authored path: `Shifts.List`.
- Covered by [Shifts](../design/compositions/Shifts.md), line 3.
- Covered by [Shifts](../design/compositions/Shifts.md), line 7.

```reaction
when RequestBoundary.request (path: "/shifts/list", requestId)
then
  RequestBoundary.respond (organizer: former "the shift organizer", requestId)
```

### Shifts.MakeOne

Authored path: `Shifts.MakeOne`.
- Covered by [Shifts](../design/compositions/Shifts.md), line 10.
- Covered by [Shifts](../design/compositions/Shifts.md), line 14.

```reaction
when RequestBoundary.request (date, end, path: "/shifts/makeOne", requestId, start)
then
  Provisioning.makeShift (date, end, start)
```

### Shifts.MakeOne#2

Authored path: `Shifts.MakeOne`.
- Covered by [Shifts](../design/compositions/Shifts.md), line 10.
- Covered by [Shifts](../design/compositions/Shifts.md), line 14.

```reaction
when Provisioning.makeShift (date, end, start, shift), asked by Shifts.MakeOne
where
  earlier, RequestBoundary.request (date, end, path: "/shifts/makeOne", requestId, start)
then
  RequestBoundary.respond (requestId, shift)
```

### Shifts.MakeWeekly

Authored path: `Shifts.MakeWeekly`.
- Covered by [Shifts](../design/compositions/Shifts.md), line 11.
- Covered by [Shifts](../design/compositions/Shifts.md), line 15.

```reaction
when RequestBoundary.request (day, end, first, last, path: "/shifts/makeWeekly", requestId, start)
then
  Provisioning.makeWeeklyShift (day, end, first, last, start)
```

### Shifts.MakeWeekly#2

Authored path: `Shifts.MakeWeekly`.
- Covered by [Shifts](../design/compositions/Shifts.md), line 11.
- Covered by [Shifts](../design/compositions/Shifts.md), line 15.

```reaction
when Provisioning.makeWeeklyShift (day, end, first, last, start, shift), asked by Shifts.MakeWeekly
where
  earlier, RequestBoundary.request (day, end, first, last, path: "/shifts/makeWeekly", requestId, start)
then
  RequestBoundary.respond (requestId, shift)
```

## Endpoint input contracts

Before recording an action ask, the boundary rejects a body that is not an
object or lacks a required key. The response uses `INVALID_INPUT` and names
the path or missing key. A declared default fills an absent key. Endpoints
not listed here have no explicit input contract.

- `/reservations/cancel` — requires `reservation`
- `/reservations/reserve` — requires `user`, `resource`
- `/shifts/makeOne` — requires `start`, `end`, `date`
- `/shifts/makeWeekly` — requires `start`, `end`, `day`, `first`, `last`
