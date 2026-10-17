# Offering

## Purpose

Unwanted items can find users who want them.

## Principle

Users and non-users (e.g. system) can offer up items, which can then be claimed by users.

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
  an optional owner User
  an Item

a set of Closed Offers
```

## Actions

```actions
offer(item: Item, user?: User) : returns (offer: Offer)
  where there is no offer with this item or all offers are also in Closed
  then
    create a new offer with user and item
    returns offer
  where there is an offer that is not in Closed and user is offer's user
  then
    refuses ALREADY_OFFERED "Item is already up for offer by this user."
  where there is an offer that is not Closed and user is not the offer's user
  then
    refuses ANOTHERS_OFFER "Cannot offer an item already offered by another user."

claim(user: User, offer: Offer) : returns ()
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
  where there is an open offer for this item
  then
    returns offer
  where the item has no open offer
  then
    returns
```