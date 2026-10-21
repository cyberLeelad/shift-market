# Reserving

## Purpose

Hold a resource for one user at a time, so two people never end up with the same shift.

## Principle

Fionna reserves oct-13-6pm. When Cake then tries to reserve the same shift, the request is refused. After Fionna cancels, Cake can reserve it.

## Types

```types
external User
  The person who holds a reservation.

external Resource
  The thing being reserved, such as a shift for a certain time and date.
```

## State

```state
a set of Reservations with
  a User
  a unique Resource
```

## Actions

```actions
reserve(user: User, resource: Resource) : returns (reservation: Reservation)
  where resource is already reserved
  then
    refuses ALREADY_RESERVED "That resource is already reserved."
  where resource is not reserved
  then
    add a new reservation with user and resource
    returns reservation

cancel(reservation: Reservation) : returns (reservation: Reservation)
  where reservation is in Reservations
  then
    remove reservation
    returns reservation
  where reservation is not in Reservations
  then
    refuses NO_SUCH_RESERVATION "There is no such reservation."

transfer(user: User, resource: Resource) : returns (reservation: Reservation)
  where resource is reserved
  then
    set the holder of the reservation for resource to user
    returns reservation
  where resource is not reserved
  then
    refuses NO_SUCH_RESERVATION "There is no such reservation."
```

## Queries

```queries
_all() : many (reservation: Reservation, user: User, resource: Resource)
  Answers every reservation, ordered by resource, and no rows when there are none.

_holderOf(resource: Resource) : optional (reservation: Reservation, holder: User)
  Answers the holder of the resource, if there is a reservation on it.
```
