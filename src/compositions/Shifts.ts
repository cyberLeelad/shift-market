import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, form, former, where, whether, no } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";

const { Provisioning, Reserving } = concepts;

const holderOf = former("the holder of (shift)", ({ shift }, { holder }) =>
  where(Reserving._holderOf({ resource: shift }).is({ holder })).form({ holder }),
).optional();

const ShiftOrganizer = former("the shift organizer", (_input, { shift, start, end, date }) =>
  form({
    shifts: each(Provisioning._all({}).is({ shift, start, end, date }))
      .form({ shift, start, end, date })
      .splicing(whether(holderOf({ shift }))),
  }),
);

const List = endpoint("/shifts/list", () =>
  receive({}).then(respond({ organizer: ShiftOrganizer({}) })),
);

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

// 3 branches
const Claim = endpoint("/shifts/claim", ({ resource: shift, user, reservation }) =>
  receive({ resource: shift, user }).then(
    // shift exists, not held -- reserve it
    where(
      Provisioning._exists({ shift }).is({ exists: true }),
      no(Reserving._holderOf({ resource: shift })),
    )
      .then(Reserving.reserve({ resource: shift, user }).responds({ reservation }))
      .then(respond({ reservation }))
      .named("success"),
    // shift doesn't exist
    where(Provisioning._exists({ shift }).is({ exists: false }))
      .then(respond({ error: "UNKNOWN_SHIFT" }))
      .named("doesnt_exist"),
    // shift exists and is held
    where(
      Provisioning._exists({ shift }).is({ exists: true }),
      Reserving._holderOf({ resource: shift }),
    )
      .then(respond({ error: "TAKEN" }))
      .named("already_reserved"),
  ),
);

export const composition = { ShiftOrganizer, List, MakeOne, MakeWeekly, holderOf, Claim };