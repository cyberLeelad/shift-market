import { conceptSet, registerConcept } from "@mit-sdg/sync-engine/assembly";
import reservingSpec from "@design/concepts/Reserving.md" with { type: "text" };
import provisioningSpec from "@design/concepts/Provisioning.md" with { type: "text" };
import { AlreadyReserved, NoSuchReservation, ReservingConcept } from "./concepts/Reserving.ts";
import { NoMatchingDates, ImproperShiftTimes, ImproperShiftDates, ProvisioningConcept } from "./concepts/Provisioning.ts";

const reserving = registerConcept({
  class: ReservingConcept,
  spec: reservingSpec,
  refusals: { ALREADY_RESERVED: AlreadyReserved, NO_SUCH_RESERVATION: NoSuchReservation },
});

const provisioning = registerConcept({
  class: ProvisioningConcept,
  spec: provisioningSpec,
  refusals: {
    NO_MATCHING_DATES: NoMatchingDates, IMPROPER_SHIFT_TIMES: ImproperShiftTimes, IMPROPER_SHIFT_DATES: ImproperShiftDates
  },
});

export const applicationConceptSet = conceptSet({ Reserving: reserving, Provisioning: provisioning });
export const { concepts } = applicationConceptSet;
