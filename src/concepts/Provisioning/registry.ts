import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import type { Db } from "mongodb";

import provisioningSpec from "@design/concepts/Provisioning.md" with { type: "text" };
import { NoMatchingDates, ImproperShiftTimes, ImproperShiftDates, ProvisioningConcept } from "./Provisioning.ts";
export const provisioning = registerConcept({
  class: ProvisioningConcept,
  spec: provisioningSpec,
  refusals: {
    NO_MATCHING_DATES: NoMatchingDates, IMPROPER_SHIFT_TIMES: ImproperShiftTimes, IMPROPER_SHIFT_DATES: ImproperShiftDates
  },
  floors: {
    mongo: ({ database }: { database: Db }, _name: string) => new ProvisioningConcept(database),
  },
});