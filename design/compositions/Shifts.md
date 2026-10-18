# Shifts

Anyone can [list the shifts](reaction:Shifts.List). The
[shift organizer](former:Shifts.ShiftOrganizer) gathers them in table order from chronologically soonest to farthest.

```endpoints
Shifts.List at /shifts/list
```

A desk captain [makes a shift](reaction:Shifts.MakeOne) or can
[make weekly shifts](reaction:Shifts.MakeWeekly).

```endpoints
Shifts.MakeOne at /shifts/makeOne
Shifts.MakeWeekly at /shifts/makeWeekly
```