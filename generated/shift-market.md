<!-- Generated from the Shift Market assembly. Do not edit. -->
<!-- Manifest producer: @mit-sdg/sync-engine@1.1.0; concept specification: sync-engine.concept-specification@1; renderer: @mit-sdg/sync-engine@1.1.0. -->

# Shift Market — assembled read-back

_Assembled by sync-engine from registered concepts and composition. Edit the concept_
_specifications and composition source, then regenerate this file._

## Concepts

### Offering

Defined in [Offering](../design/concepts/Offering.md), line 1.

#### Actions

- `offer(item: Item, user: User) : returns (offer: Offer)`
  - Refuses `ALREADY_OFFERED`: Item is already up for offer by this owner.
  - Refuses `ANOTHERS_OFFER`: Cannot offer an item already offered by another owner.
- `resolve(offer: Offer) : returns ()`
  - Refuses `ALREADY_CLAIMED`: Cannot claim a closed offer.
  - Refuses `NO_SUCH_OFFER`: Cannot claim an offer that does not exist.

#### Queries

- `_getOffer(item: Item) : optional (offer: Offer)`
- `_openOffers() : many (offer: Offer)`

#### Instances

- `Offering` — instance of `Offering` — [Application types](../design/types.md), line 24.
  - `Item` is `Shift` — [Application types](../design/types.md), line 26.
  - `User` is `Kerberos` — [Application types](../design/types.md), line 25.

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
- `_exists(shift: Shift) : one (exists: Flag)`

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
- `_holderOf(resource: Resource) : optional (reservation: Reservation, holder: User)`

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

### the holder of (shift)

Authored path: `Shifts.holderOf`.
- Covered by [Shifts](../design/compositions/Shifts.md), line 4.

```former
Former "the holder of (shift)" — inputs (shift); bindings (holder); promises at most one record — forms:
  a record of
    where Reserving._holderOf (resource: shift) has (holder)
    holder
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
        … former "the holder of (shift)" with (shift), with blank leaves if absent
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

### Reservations.RejectUnknownShift

Authored path: `Reservations.RejectUnknownShift`.
- Covered by [Reservations](../design/compositions/Reservations.md), line 4.
- Covered by [Reservations](../design/compositions/Reservations.md), line 8.

```reaction
when RequestBoundary.request (path: "/reservations/reserve", requestId, resource, user)
where
  Provisioning._exists (shift: resource) has (exists: false)
then
  RequestBoundary.respond (error: "NOT_A_SHIFT", requestId)
```

### Reservations.Reserve

Authored path: `Reservations.Reserve`.
- Covered by [Reservations](../design/compositions/Reservations.md), line 3.
- Covered by [Reservations](../design/compositions/Reservations.md), line 7.

```reaction
when RequestBoundary.request (path: "/reservations/reserve", requestId, resource, user)
where
  Provisioning._exists (shift: resource) has (exists: true)
then
  Reserving.reserve (resource, user)
```

### Reservations.Reserve#2

Authored path: `Reservations.Reserve`.
- Covered by [Reservations](../design/compositions/Reservations.md), line 3.
- Covered by [Reservations](../design/compositions/Reservations.md), line 7.

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

- `/reservations/reserve` — requires `user`, `resource`
- `/shifts/makeOne` — requires `start`, `end`, `date`
- `/shifts/makeWeekly` — requires `start`, `end`, `day`, `first`, `last`
