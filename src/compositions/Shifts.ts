import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, form, former, no, where, earlier } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";

const { Offering, Provisioning, Reserving } = concepts;

const ShiftOrganizer = former("the shift organizer", (_input, { shift, start, end, date }) =>
  form({
    shifts: each(Provisioning._all({}).is({ shift, start, end, date })).form({
      shift,
      start,
      end,
      date,
    }),
  }),
);

const List = endpoint("/shifts/list", () =>
  receive({}).then(respond({ organizer: ShiftOrganizer({}) })),
);

const MakeOne = endpoint("/shifts/makeOne", ({ start, end, date, shift }) =>
  receive({ start, end, date })
    .then(Provisioning.makeShift({ start, end, date }).responds({ shift }))
    .then(respond({ shift })),
);

const MakeWeekly = endpoint(
  "/shifts/makeWeekly",
  ({ shift, start, end, day, first, last }) =>
    receive({ start, end, day, first, last })
      .then(Provisioning.makeWeeklyShift({ start, end, day, first, last }).responds({ shift }))
      .then(respond({ shift })),
  { input: { required: ["start", "end", "day", "first", "last"] } },
);

const Offer = endpoint(
  "/shifts/offer",
  ({ shift, user, offer, newOffer }) =>
    receive({ shift, user }).then(
      where(no(Provisioning._exists({ shift })))
        .then(respond({ error: "MISSING" }))
        .named("missing"),

      where(
        Provisioning._exists({ shift }).is({ exists: true }),
        no(Reserving._holderOf({ resource: shift }).is({ user })),
      )
        .then(respond({ error: "NOT_HOLDER" }))
        .named("notHolder"),

      where(
        Provisioning._exists({ shift }).is({ exists: true }),
        Reserving._holderOf({ resource: shift }).is({ user }),
      )
        .then(Offering.offer({ item: shift, user }).responds({ offer: newOffer }))
        .then(respond({ offer: newOffer }))
        .named("offer"),
    ),
);

const Claim = endpoint(
  "/shifts/claim",
  ({ shift, user, newReservation }) =>
    receive({ shift, user }).then(
      where(no(Provisioning._exists({ shift })))
        .then(respond({ error: "MISSING" }))
        .named("missing"),

      where(
        Provisioning._exists({ shift }).is({ exists: true }),
        no(Reserving._holderOf({ resource: shift })),
      )
        .then(Reserving.reserve({ user, resource: shift }).responds({ reservation: newReservation }))
        .then(respond({ reservation: newReservation }))
        .named("unreserved"),

      where(
        Provisioning._exists({ shift }).is({ exists: true }),
        Reserving._holderOf({ resource: shift }),
        Offering._getOffer({ item: shift }).is({ offer }),
      )
        .then(Offering.resolve({ offer }))
        .then(Reserving.release({ resource: shift }))
        .then(Reserving.reserve({ user, resource: shift }).responds({ reservation }))
        .then(respond({ reservation }))
        .named("offered"),

      where(
        Provisioning._exists({ shift }).is({ exists: true }),
        Reserving._holderOf({ resource: shift }),
        no(Offering._getOffer({ item: shift })),
      )
        .then(respond({ error: "UNAVAILABLE" }))
        .named("unavailable"),
    ),
);

export const composition = {
  List,
  MakeOne,
  MakeWeekly,
  Offer,
  Claim
};