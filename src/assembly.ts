import { assemble } from "@mit-sdg/sync-engine/assembly";
import { composition as shiftsComposition } from "./compositions/Shifts.ts";
import { ReservingConcept } from "./concepts/Reserving.ts";
import { applicationConceptSet } from "./concepts.ts";
import { db } from "./db.ts";
import { ProvisioningConcept } from "./concepts/Provisioning.ts";
import { OfferingConcept } from "./concepts/Offering.ts";
import type { Db } from "mongodb";

export function assembleApplication(database: Db = db) {
  return assemble({
    conceptSet: applicationConceptSet,
    instances: {
      Reserving: new ReservingConcept(database),
      Provisioning: new ProvisioningConcept(database),
      Offering: new OfferingConcept(database),
    },
    composition: { Shifts: shiftsComposition },
    rawFaultReporter: ({ error }) => console.error(error),
  });
}