import { conceptSet, registerConcept } from "@mit-sdg/sync-engine/assembly";

// Reserving
import reservingSpec from "@design/concepts/Reserving.md" with { type: "text" };
import { AlreadyReserved, NoSuchReservation, ReservingConcept } from "./concepts/Reserving.ts";

const reserving = registerConcept({
  class: ReservingConcept,
  spec: reservingSpec,
  refusals: { ALREADY_RESERVED: AlreadyReserved, NO_SUCH_RESERVATION: NoSuchReservation },
});

// Provisioning
import provisioningSpec from "@design/concepts/Provisioning.md" with { type: "text" };
import { NoMatchingDates, ImproperShiftTimes, ImproperShiftDates, ProvisioningConcept } from "./concepts/Provisioning.ts";

const provisioning = registerConcept({
  class: ProvisioningConcept,
  spec: provisioningSpec,
  refusals: {
    NO_MATCHING_DATES: NoMatchingDates, IMPROPER_SHIFT_TIMES: ImproperShiftTimes, IMPROPER_SHIFT_DATES: ImproperShiftDates
  },
});

// Offering
import offeringSpec from "@design/concepts/Offering.md" with {type: "text" };
import { OfferingConcept, AlreadyOffered, AlreadyClaimed, AnothersOffer, NoSuchOffer } from "./concepts/Offering.ts";

const offering = registerConcept({
  class: OfferingConcept,
  spec: offeringSpec,
  refusals: {
    ALREADY_OFFERED: AlreadyOffered, ANOTHERS_OFFER: AnothersOffer, ALREADY_CLAIMED: AlreadyClaimed, NO_SUCH_OFFER: NoSuchOffer
  },
});

// Concept set
export const applicationConceptSet = conceptSet({ Reserving: reserving, Provisioning: provisioning, Offering: offering });
export const { concepts } = applicationConceptSet;
