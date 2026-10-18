# Shifts

This composition owns how shifts enter the schedule, who holds them at a given time, and whether they are available to claim. A shift is available if it is either unreserved (has no holder) or if it is up for offer. Staff members can offer and claim shifts.

## Listing a new shift

A desk captain [makes a shift](reaction:Shifts.MakeOne) or [makes weekly shifts](reaction:Shifts.MakeWeekly).
If the captain names an assignee, the shift is [assigned to that person](reaction:Shifts.Assign) at the time it's created (assigning is analagous to that staff member claiming the shift).
If no assignee is named, the shift starts unreserved and therefore available.

```endpoints
Shifts.MakeOne at /shifts/makeOne
Shifts.MakeWeekly at /shifts/makeWeekly
```

## Offering a shift

If a staff member wants coverage, they can [offering a shift](reaction:Shifts.Offer). The offer ensures that a staff member cannot give up a shift until another person agrees to take it (by claiming it).
If the shift is already up for offer by this owner, the request is [refused](reaction:Shifts.Offer.Duplicate)
If someone who does not hold the shift tries to offer it, the request is [refused](reaction:Shifts.Offer.WrongHolder)
If the shift does not exist, the request is [refused](reaction:Shifts.Offer.Missing) instead.

```endpoints
Shifts.Offer at /shifts/offer
Shifts.Offer.Duplicate at /shifts/offer
Shifts.Offer.WrongHolder at /shifts/offer
Shifts.Offer.Missing at /shifts/offer
```

## Claiming a shift

A staff member [claims a shift](reaction:Shifts.Claim) under their kerberos. If the shift is available, it is now assigned to the claiming staff member.
If the shift is not available, the claim is [refused](reaction:Shifts.Claim.Unavailable).
If the shift does not exist, the request is [refused](reaction:Shifts.Claim.Missing).

```endpoints
Shifts.Claim at /shifts/claim
Shifts.Claim.Unavailable at /shifts/claim
Shifts.Claim.Missing at /shifts/claim
```

## List shifts

Anyone can [list the shifts](reaction:Shifts.List). The [shift schedule](former:Shifts.Schedule) gathers them in table order, from chronologically soonest to farthest. Each list item contains the shift, its status (unreserved, held, or offered), and its holder if it has one.

```endpoints
Shifts.List at /shifts/list
```