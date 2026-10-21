# Shifts

Anyone can [list the shifts and their holders (if existent)](reaction:Shifts.List). The [shift organizer](former:Shifts.ShiftOrganizer) gathers the the shift with [holder](former:Shifts.holderOf) in table order from chronologically soonest to farthest.

```endpoints
Shifts.List at /shifts/list
```

A desk captain [makes a shift](reaction:Shifts.MakeOne) or can [make weekly shifts](reaction:Shifts.MakeWeekly).

```endpoints
Shifts.MakeOne at /shifts/makeOne
Shifts.MakeWeekly at /shifts/makeWeekly
```

If a staff member wants coverage, they can [offer a shift](reaction:Shifts.Offer). The offer ensures that a staff member cannot give up a shift until another person agrees to take it (by claiming it). The request is refused if the shift is already up for offer (by any owner), the shift does not exist, or the shift is not held by this person.

```endpoints
Shifts.Offer at /shifts/offer
```

A staff member [claims a shift](reaction:Shifts.Claim) under their kerberos. If the shift is available, it is now assigned to the claiming staff member instead of the offering shift member (if different). If the shift is not available or does not exist, the claim is refused.

```endpoints
Shifts.Claim at /shifts/claim
```