# Reservations

Anyone can [list the reservations](reaction:Reservations.List). The
[reservation book](former:Reservations.ReservationBook) gathers them in table order.

```endpoints
Reservations.List at /reservations/list
```

A staff member [reserves a shift](reaction:Reservations.Reserve) under their kerberos, and anyone can
[cancel a reservation](reaction:Reservations.Cancel).

```endpoints
Reservations.Reserve at /reservations/reserve
Reservations.Cancel at /reservations/cancel
```
