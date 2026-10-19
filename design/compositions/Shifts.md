# Shifts

Anyone can [list the shifts and their holders (if existent)](reaction:Shifts.List). The
[shift organizer](former:Shifts.ShiftOrganizer) gathers the the shift with [holder](former:Shifts.holderOf) in table order from chronologically soonest to farthest.

```endpoints
Shifts.List at /shifts/list
```

A desk captain [makes a shift](reaction:Shifts.MakeOne) or can
[make weekly shifts](reaction:Shifts.MakeWeekly).

```endpoints
Shifts.MakeOne at /shifts/makeOne
Shifts.MakeWeekly at /shifts/makeWeekly
```