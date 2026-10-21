import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, form, former, where, whether, no } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";

const { Provisioning, Reserving, Offering } = concepts;

// formers

const holderOf = former("the holder of (shift)", ({ shift }, { holder }) =>
  where(Reserving._holderOf({ resource: shift }).is({ holder })).form({ holder }),
).optional();

const offerOf = former("the open offer of (shift)", ({ shift }, { offer }) =>
  where(Offering._getOffer({ item: shift }).is({ offer })).form({ offer }),
).optional();

const ShiftLinks = former("the links of (shift)", ({ shift }, { linked }) =>
  each(Provisioning._linked({ shift }).is({ linked })).form({ linked }),
);

const ShiftState = former("the state of (shift)", ({ shift }, { holder, offer }) =>
  where(
    whether(Reserving._holderOf({ resource: shift }).is({ holder })),
    whether(Offering._getOffer({ item: shift }).is({ offer })),
  ).form({ holder, offer }),
);

const ShiftOrganizer = former("the shift organizer", (_input, { shift, start, end, date }) =>
  form({
    shifts: each(Provisioning._all({}).is({ shift, start, end, date })).form({
      shift,
      start,
      end,
      date,
      state: ShiftState({ shift }),
      linked: ShiftLinks({ shift }),
    }),
  }),
);

// List

const List = endpoint("/shifts/list", () =>
  receive({}).then(respond({ organizer: ShiftOrganizer({}) })),
);


// Make shifts

const MakeOne = endpoint(
  "/shifts/makeOne",
  ({ shift, start, end, date }) =>
    receive({ start, end, date })
      .then(Provisioning.makeShift({ start, end, date }).responds({ shift }))
      .then(respond({ shift })),
  { input: { required: ["start", "end", "date"] } },
);

const MakeWeekly = endpoint(
  "/shifts/makeWeekly",
  ({ shift, start, end, day, first, last }) =>
    receive({ start, end, day, first, last })
      .then(Provisioning.makeWeeklyShift({ start, end, day, first, last }).responds({ shift }))
      .then(respond({ shift })),
  { input: { required: ["start", "end", "day", "first", "last"] } },
);

// Manage ownership of shifts

const Claim = endpoint(
  "/shifts/claim",
  ({ resource: shift, user, offer, reservation, next }) =>
    receive({ resource: shift, user }).then(
      // exists, no holder -- reserve it
      where(
        Provisioning._exists({ shift }).is({ exists: true }),
        no(Reserving._holderOf({ resource: shift })),
      )
        .then(Reserving.reserve({ resource: shift, user }).responds({ reservation: next }))
        .then(respond({ reservation: next }))
        .named("success"),

      // doesn't exist
      where(Provisioning._exists({ shift }).is({ exists: false }))
        .then(respond({ error: "UNKNOWN_SHIFT" }))
        .named("doesnt_exist"),

      // held, not offered -- taken
      where(
        Provisioning._exists({ shift }).is({ exists: true }),
        Reserving._holderOf({ resource: shift }),
        no(Offering._getOffer({ item: shift })),
      )
        .then(respond({ error: "TAKEN" }))
        .named("already_reserved"),

      // offered -- any user, including the offerer, may claim it
      where(
        Provisioning._exists({ shift }).is({ exists: true }),
        Offering._getOffer({ item: shift }).is({ offer }),
      )
        // Gate first: only one claimer can close the offer.
        .then(Offering.resolve({ offer }))
        .then(Reserving.transfer({ resource: shift, user }).responds({ reservation: next }))
        .then(respond({ reservation: next }))
        .named("claim_offered"),
    ),
  { input: { required: ["resource", "user"] } },
);

const Offer = endpoint(
  "/shifts/offer",
  ({ resource: shift, user, offer }) =>
    receive({ resource: shift, user }).then(
      // exists, held by this user, not already offered -- offer it
      where(
        Provisioning._exists({ shift }).is({ exists: true }),
        Reserving._holderOf({ resource: shift }).is({ holder: user }),
        no(Offering._getOffer({ item: shift })),
      )
        // Offering.offer also refuses if the item is already offered, which covers concurrent requests.
        .then(Offering.offer({ item: shift, user }).responds({ offer }))
        .then(respond({ offer }))
        .named("success"),
      // shift doesn't exist
      where(Provisioning._exists({ shift }).is({ exists: false }))
        .then(respond({ error: "UNKNOWN_SHIFT" }))
        .named("doesnt_exist"),
      // already up for offer, by any owner
      where(Offering._getOffer({ item: shift }))
        .then(respond({ error: "ALREADY_OFFERED" }))
        .named("already_offered"),
      // exists, not offered, nobody holds it
      where(
        Provisioning._exists({ shift }).is({ exists: true }),
        no(Offering._getOffer({ item: shift })),
        no(Reserving._holderOf({ resource: shift })),
      )
        .then(respond({ error: "NOT_HELD" }))
        .named("unheld"),
      // exists, not offered, held by someone else
      where(
        Provisioning._exists({ shift }).is({ exists: true }),
        no(Offering._getOffer({ item: shift })),
        Reserving._holderOf({ resource: shift }).is.not({ holder: user }),
      )
        .then(respond({ error: "NOT_HELD" }))
        .named("held_by_other"),
    ),
  { input: { required: ["resource", "user"] } },
);

export const composition = { ShiftOrganizer, List, MakeOne, MakeWeekly, holderOf, Claim, Offer };