# Reservations

Anyone can [list the reservations](reaction:Reservations.List). The
[reservation book](former:Reservations.ReservationBook) gathers them in table order.

```endpoints
Reservations.List at /reservations/list
```

A staff member [reserves a shift](reaction:Reservations.Reserve) under their kerberos if the resource exists. An unknown resource is
[refused](reaction:Reservations.RejectUnknownShift) instead of reserved.

```endpoints
Reservations.Reserve at /reservations/reserve
Reservations.RejectUnknownShift at /reservations/reserve
```