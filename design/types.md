# Application types

Staff members are identified by kerberos, and each shift is held by one staff member at a time.

```types
concrete Kerberos
  The kerberos (identifier of an MIT email) of a desk staff member who works the mail desk.

concrete Shift
  A two-hour block at the mail desk, such as Friday 6pm to 8pm.

concrete ClockTime
  A time of day, such as 16:00, passed as a string.
```

```instances
instantiate Reserving with
  User is Kerberos
  Resource is Shift

instantiate Provisioning with
  Time is ClockTime
```
