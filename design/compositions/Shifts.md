# Shifts

This composition owns how shifts enter the schedule, who holds them at a given time, and whether they are available for claiming. Staff members can offer and claim shifts.

## Listing a new shift

A desk captain [makes a shift](reaction:Shifts.MakeOne) or [makes weekly shifts](reaction:Shifts.MakeWeekly). If the captain names an assignee, the shift is reserved for that person as part of creation, so the assignment is [recorded when the shift is made](reaction:Shifts.AssignNewShift). If no assignee is named, the shift starts unreserved and appears in the [available view](view:Shifts.Available).

```endpoints
Shifts.MakeOne at /shifts/makeOne
Shifts.MakeWeekly at /shifts/makeWeekly
```

## Offering a shift

A staff member gives up a shift by [offering it](reaction:Shifts.Offer). The offer is the barrier between leaving a shift and finding someone to cover it, so a shift cannot be claimed by another person unless its holder offers it first. Only the current holder may offer a shift. If the shift does not exist, the request is [refused](reaction:Shifts.RejectOfferUnknownShift) instead.

```endpoints
Shifts.Offer at /shifts/offer
Shifts.RejectOfferUnknownShift at /shifts/offer
```

## Claiming a shift

A staff member [claims a shift](reaction:Shifts.Claim) under their kerberos. If the shift is [available](view:Shifts.Available), the claimer holds its reservation afterward. If the shift was offered, the offer closes and the previous holder's reservation is replaced. If the shift is not available, the claim is refused, because it is covered by someone who has not offered it. If the shift does not exist, the request is [refused](reaction:Shifts.RejectClaimUnknownShift) instead.

```endpoints
Shifts.Claim at /shifts/claim
Shifts.RejectClaimUnknownShift at /shifts/claim
```

## Viewing shifts

Anyone can [list all shifts](reaction:Shifts.ListAll). The [shift schedule](former:Shifts.ShiftSchedule) gathers them in table order, from chronologically soonest to farthest.

```endpoints
Shifts.ListAll at /shifts/list
```

Anyone can [list available shifts](reaction:Shifts.ListAvailable). The [available schedule](former:Shifts.AvailableSchedule) gathers the shifts that the [available view](view:Shifts.Available) selects, in the same table order.

```endpoints
Shifts.ListAvailable at /shifts/available
```

## Views

The [available view](view:Shifts.Available) selects shifts that are either unreserved or currently offered.