import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { view, each, form, former, where, whether, no, earlier } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { IsCaptain, Owns } from "./access.ts";

const { Provisioning, Reserving, Offering, Sessioning, Registering } = concepts;

// views

// // (shift) is happily held if it exists, is reserved, and has no offer on it
// const HappilyHeld = view("(shift) is happily held", ({ shift }, _outputs, {kerb, offer}) =>
//     where(
//         Provisioning._exists({ shift }).is({ exists: true }),
//         Reserving._holderOf({resource: shift}).is({holder: kerb}),
//         no(Offering._getOffer({ item: shift }).is({offer})),
//     ),
// ).holds();

// formers

const holderOf = former("the holder of (shift)", ({ shift }, { holder }) =>
  where(Reserving._holderOf({ resource: shift }).is({ holder })).form({ holder }),
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
const List = endpoint(
  "/shifts/list",
  ({ session }) =>
    receive({ session })
      .then(Sessioning.use({ session }).responds({}))
      .then(respond({ organizer: ShiftOrganizer({}) })),
  { input: { required: ["session"] } },
);

// Make shifts

const MakeOne = endpoint(
  "/shifts/makeOne",
  ({ session, user, username, shift, start, end, date }) =>
    receive({ session, start, end, date })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(Registering._username({ user }).is({ username }), IsCaptain({ user: username }))
          .then(Provisioning.makeShift({ start, end, date }).responds({ shift }))
          .then(respond({ shift }))
          .named("captain"),
        where(Registering._username({ user }).is({ username }), no(IsCaptain({ user: username })))
          .then(respond({ error: "NOT_CAPTAIN" }))
          .named("not_captain"),
      ),
  { input: { required: ["session", "start", "end", "date"] } },
);

const MakeWeekly = endpoint(
  "/shifts/makeWeekly",
  ({ session, user, username, shift, start, end, day, first, last }) =>
    receive({ session, start, end, day, first, last })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(Registering._username({ user }).is({ username }), IsCaptain({ user: username }))
          .then(Provisioning.makeWeeklyShift({ start, end, day, first, last }).responds({ shift }))
          .then(respond({ shift }))
          .named("captain"),
        where(Registering._username({ user }).is({ username }), no(IsCaptain({ user: username })))
          .then(respond({ error: "NOT_CAPTAIN" }))
          .named("not_captain"),
      ),
  { input: { required: ["session", "start", "end", "day", "first", "last"] } },
);

// Manage ownership of shifts

const Claim = endpoint(
  "/shifts/claim",
  ({ session, user, username: kerb, resource: shift, offer, reservation }) =>
    receive({ session, resource: shift })
      // Check for a valid session. If not, Sessioning.use refuses with NOT_SIGNED_IN.
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        // Case 1: shift doesn't exist ==> refuse with UNKNOWN_SHIFT.
        where(Provisioning._exists({ shift }).is({ exists: false }))
          .then(respond({ error: "UNKNOWN_SHIFT" }))
          .named("doesnt_exist"),

        // Case 2: shift exists with no holder ==> reserve it for caller.
        where(
          Provisioning._exists({ shift }).is({ exists: true }),
          no(Reserving._holderOf({ resource: shift })),
          Registering._username({ user }).is({ username: kerb }),
        )
          .then(Reserving.reserve({ resource: shift, user: kerb }).responds({ reservation }))
          .then(respond({ reservation }))
          .named("success"),

        // Case 3: shift exists, is held, and is not offered ==> refuse with ALREADY_CLAIMED.
        where (
          Provisioning._exists({ shift }).is({ exists: true }),
          Registering._username({ user }).is({ username: kerb }),
          Reserving._holderOf({ resource: shift }).is({ holder: kerb }),
          no(Offering._getOffer({ item: shift })),
        )
          .then(respond({ error: "ALREADY_CLAIMED" }))
          .named("already_claimed"),

        // Case 4: shift exists, is held, and is offered ==> first, resolve the existing offer.
        where(
          Provisioning._exists({ shift }).is({ exists: true }),
          Reserving._holderOf({ resource: shift }),
          Offering._getOffer({ item: shift }).is({ offer }),
        )
          .then(Offering.resolve({ offer }))
          // Attempt 1: 
          //  Add kerb retrieval to this `where` block
          //  then, after Offering.resolve, Reserving.transfer the shift to kerb
          //  then respond with the new reservation
          // This fails because the Offering.resolve line does not carry forward kerb,
          // thus kerb is unbound at the time Reserving.transfer is called.
          .named("resolve_offer")
          
      )
      // Attempt 2: 
      // If an offer was resolved (Case 4) in the previous stage ==> transfer shift to caller.
      .afterFlowSettles()
      .then(
        where(
          earlier(Offering.resolve, { offer }),
          Registering._username({ user }).is({ username: kerb })
        )
        .then(Reserving.transfer({ resource: shift, user: kerb }).responds({ reservation }))
        .then(respond({ reservation }))
        .named("success_transfer")
      ),
      // All cases responded by this point.
  { input: { required: ["session", "resource"] } },
);

const Offer = endpoint(
  "/shifts/offer",
  ({ session, user, username, resource: shift, offer }) =>
    receive({ session, resource: shift })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        // Case 1: shift doesn't exist
        where(Provisioning._exists({ shift }).is({ exists: false }))
          .then(respond({ error: "UNKNOWN_SHIFT" }))
          .named("doesnt_exist"),

        // Case 2: exists, held by this user, not already offered -- offer it
        where(
          Provisioning._exists({ shift }).is({ exists: true }),
          Owns({ user, shift }),
          no(Offering._getOffer({ item: shift })),
        )
          // Offering.offer also refuses if the item is already offered, which covers concurrent requests.
          .then(Offering.offer({ item: shift, user: username }).responds({ offer }))
          .then(respond({ offer }))
          .named("success"),

        // Case 3: exists, held by user, already up for offer
        where(
          Provisioning._exists({ shift }).is({ exists: true }),
          Owns({ user, shift }),
          no(Offering._getOffer({ item: shift })),
        )
          .then(respond({ error: "ALREADY_OFFERED" }))
          .named("already_offered"),

        // Case 4: exists, not held by user
        where(
          Provisioning._exists({ shift }).is({ exists: true }),
          no(Owns({user, shift})),
        )
          .then(respond({ error: "NOT_CALLERS" }))
          .named("no_callers"),
      ),
  { input: { required: ["session", "resource"] } },
);

const Assign = endpoint(
  "/shifts/assign",
  ({ session, user, username, resource: shift, staff, offer, reservation }) =>
    receive({ session, resource: shift, staff })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        // not a captain
        where(Registering._username({ user }).is({ username }), no(IsCaptain({ user: username })))
          .then(respond({ error: "NOT_CAPTAIN" }))
          .named("not_captain"),

        // captain, unknown shift
        where(
          Registering._username({ user }).is({ username }),
          IsCaptain({ user: username }),
          Provisioning._exists({ shift }).is({ exists: false }),
        )
          .then(respond({ error: "UNKNOWN_SHIFT" }))
          .named("unknown_shift"),

        // captain, existing shift, unheld -- reserve it for the staff member
        where(
          Registering._username({ user }).is({ username }),
          IsCaptain({ user: username }),
          Provisioning._exists({ shift }).is({ exists: true }),
          no(Reserving._holderOf({ resource: shift })),
        )
          .then(Reserving.reserve({ resource: shift, user: staff }).responds({ reservation }))
          .then(respond({ reservation }))
          .named("reserve"),

        // captain, existing shift, held and not offered -- refuse
        where(
          Registering._username({ user }).is({ username }),
          IsCaptain({ user: username }),
          Provisioning._exists({ shift }).is({ exists: true }),
          Reserving._holderOf({ resource: shift }),
          no(Offering._getOffer({ item: shift })),
        )
          .then(respond({ error: "ALREADY_CLAIMED" }))
          .named("taken"),

        // captain, existing shift, offered -- close the offer, then transfer
        where(
          Registering._username({ user }).is({ username }),
          IsCaptain({ user: username }),
          Provisioning._exists({ shift }).is({ exists: true }),
          Offering._getOffer({ item: shift }).is({ offer }),
        )
          .then(Offering.resolve({ offer }))
          .then(Reserving.transfer({ resource: shift, user: staff }).responds({ reservation }))
          .then(respond({ reservation }))
          .named("transfer_offered"),
      ),
  { input: { required: ["session", "resource", "staff"] } },
);

export const composition = { ShiftOrganizer, List, MakeOne, MakeWeekly, holderOf, Claim, Offer, Assign };