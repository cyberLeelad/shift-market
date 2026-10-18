import { assemble } from "@mit-sdg/sync-engine/assembly";
// Compositions
import { composition as shifts } from "./compositions/Shifts.ts";

// Concepts
import { OfferingConcept } from "./concepts/Offering.ts";
import { ProvisioningConcept } from "./concepts/Provisioning.ts";
import { ReservingConcept } from "./concepts/Reserving.ts";

import { applicationConceptSet } from "./concepts.ts";
import { db } from "./db.ts";
import type { Db } from "mongodb";

export function assembleApplication(database: Db = db) {
  return assemble({
    conceptSet: applicationConceptSet,
    instances: {
      Reserving: new ReservingConcept(database),
      Provisioning: new ProvisioningConcept(database),
      Offering: new OfferingConcept(database),
    },
    composition: { Shifts: shifts },
    rawFaultReporter: ({ error }) => console.error(error),
  });
}