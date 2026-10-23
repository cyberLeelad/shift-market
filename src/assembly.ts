import { assemble } from "@mit-sdg/sync-engine/assembly";
import { composition as shiftsComposition } from "./compositions/Shifts.ts";
import { applicationConceptSet } from "./concepts.ts";
import { db } from "./db.ts";
import type { Db } from "mongodb";

export function assembleApplication(database: Db = db) {
  return assemble({
    conceptSet: applicationConceptSet,
    instances: applicationConceptSet.implementations("mongo", { database }),
    composition: { Shifts: shiftsComposition },
    rawFaultReporter: ({ error }) => console.error(error),
  });
}