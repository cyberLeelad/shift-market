# Offering

## Purpose

Unwanted items can find users who want them.

## Principle

Users and non-users (e.g. system) can offer up items, which can then be claimed (resolved) by users.

## Types

```types
external User
  The person who either offers and claims an item.

external Item
  The thing being offered up.
```

## State

```state
a set of Offers with
  an owner User
  an Item

a set of Closed Offers

Rule: an item has at most one offer that is not in Closed.
```

## Actions

```actions
offer(item: Item, user: User) : returns (offer: Offer)
  where there is no offer with this item or all offers are also in Closed
  then
    create a new offer with user and item
    returns offer
  where there is an offer that is not in Closed with user
  then
    refuses ALREADY_OFFERED "Item is already up for offer by this owner."
  where there is an offer that is not Closed and with a different user
  then
    refuses ANOTHERS_OFFER "Cannot offer an item already offered by another owner."

resolve(offer: Offer) : returns ()
  where offer exists in Offers and is not in Closed
  then
    add offer to Closed Offers
    returns
  where offer is in Closed Offers
  then
    refuses ALREADY_CLAIMED "Cannot claim a closed offer."
  where offer does not exist in Offers
  then
    refuses NO_SUCH_OFFER "Cannot claim an offer that does not exist."
```

## Queries

```queries
_getOffer(item: Item) : optional (offer: Offer)
  Answers the open offer for this item, if one exists.

_openOffers() : many (offer: Offer)
  Answers any and all open offers.
```