import { assemble } from "@mit-sdg/sync-engine/assembly";
import { composition as shiftsComposition } from "./compositions/Shifts.ts";
import { composition as accounts } from "./compositions/auth/accounts.ts";
import { composition as passwords } from "./compositions/auth/passwords.ts";
import { composition as access } from "./compositions/access.ts";
import { applicationConceptSet } from "./concepts.ts";
import { db } from "./db.ts";
import type { Db } from "mongodb";

export function assembleApplication(database: Db = db) {
  return assemble({
    conceptSet: applicationConceptSet,
    instances: applicationConceptSet.implementations("mongo", { database }),
    composition: {
      Shifts: shiftsComposition,
      access,
      Accounts: accounts,
      Passwords: passwords
    },
    rawFaultReporter: ({ error }) => console.error(error),
  });
}