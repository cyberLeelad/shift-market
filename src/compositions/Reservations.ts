import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { where, no } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";

const { Reserving, Provisioning } = concepts;

// 3 branches
const Reserve = endpoint("/reservations/reserve", ({ resource: shift, user, reservation }) =>
  receive({ resource: shift, user }).then(
    // shift exists, but not reserved -- success
    where(Provisioning._exists({ shift }), no(Reserving._holderOf({ resource: shift })))
      .then(Reserving.reserve({ resource: shift, user: user }).responds({ reservation }))
      .then(respond({ reservation }))
      .named("success"),
    // shift doesn't exist -- reject
    where(no(Provisioning._exists({ shift })))
      .then(respond({ error: "UNKNOWN_SHIFT" }))
      .named("doesnt_exist"),
    // shift exists  but is held -- reject
    where(Provisioning._exists({ shift }), Reserving._holderOf({ resource: shift }))
      .then(respond({ error: "TAKEN" }))
      .named("already_reserved"),
  ),
);

export const composition = { Reserve };