# Reservations

A staff member [reserves a shift](reaction:Reservations.Reserve) under their kerberos if the resource exists. An unknown resource is
[refused](reaction:Reservations.RejectUnknownShift) instead of reserved.

```endpoints
Reservations.Reserve at /reservations/reserve
Reservations.RejectUnknownShift at /reservations/reserve
```