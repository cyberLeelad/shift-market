import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, form, former } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";

const { Reserving, Provisioning } = concepts;

// Alternative 1: the resource is an existing shift, so reserve it.
const Reserve = endpoint(
  "/reservations/reserve",
  ({ user, resource, reservation, exists }) =>
    receive({ user, resource })
      .where(Provisioning._exists({ shift: resource }).is({ exists: true }))
      .then(Reserving.reserve({ user, resource }).responds({ reservation }))
      .then(respond({ reservation })),
  { input: { required: ["user", "resource"] } },
);

// Alternative 2: the resource is not a shift, so refuse without reserving anything.
const RejectUnknownShift = endpoint(
  "/reservations/reserve",
  ({ user, resource, exists }) =>
    receive({ user, resource })
      .where(Provisioning._exists({ shift: resource }).is({ exists: false }))
      .then(respond({ error: "NOT_A_SHIFT" })),
);

export const composition = { Reserve, RejectUnknownShift };