import { assemble } from "@mit-sdg/sync-engine/assembly";
import { composition as reservationsComposition } from "./compositions/Reservations.ts";
import { composition as shiftsComposition } from "./compositions/Shifts.ts";
import { ReservingConcept } from "./concepts/Reserving.ts";
import { applicationConceptSet } from "./concepts.ts";
import { db } from "./db.ts";
import { ProvisioningConcept } from "./concepts/Provisioning.ts";

export function assembleApplication() {
  return assemble({
    conceptSet: applicationConceptSet,
    instances: { Reserving: new ReservingConcept(db), Provisioning: new ProvisioningConcept(db)},
    composition: { Reservations: reservationsComposition, Shifts: shiftsComposition },
    // Print what went wrong. Otherwise a failure only shows up as INTERNAL_ERROR.
    rawFaultReporter: ({ error }) => console.error(error),
  });
}
