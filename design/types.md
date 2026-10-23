# Shift Market types

Every user in Shift Market is a Registering user who signed up with a password. That user is the one who has a password in Authenticating and the one a session belongs to.

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
instantiate Registering

instantiate Authenticating with
  User is Registering.User

instantiate Sessioning with
  Subject is Registering.User

instantiate Reserving with
  User is Kerberos
  Resource is Shift

instantiate Provisioning with
  Time is ClockTime

instantiate Offering with
  User is Kerberos
  Item is Shift
```
