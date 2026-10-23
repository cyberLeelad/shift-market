import { conceptSet, registerConcept } from "@mit-sdg/sync-engine/assembly";
import type { Db } from "mongodb";

import reservingSpec from "@design/concepts/Reserving.md" with { type: "text" };
import { AlreadyReserved, NoSuchReservation, ReservingConcept } from "./concepts/Reserving.ts";
const reserving = registerConcept({
  class: ReservingConcept,
  spec: reservingSpec,
  refusals: { ALREADY_RESERVED: AlreadyReserved, NO_SUCH_RESERVATION: NoSuchReservation },
  floors: {
    mongo: ({ database }: { database: Db }, _name: string) => new ReservingConcept(database),
  },
});

import provisioningSpec from "@design/concepts/Provisioning.md" with { type: "text" };
import { NoMatchingDates, ImproperShiftTimes, ImproperShiftDates, ProvisioningConcept } from "./concepts/Provisioning.ts";
const provisioning = registerConcept({
  class: ProvisioningConcept,
  spec: provisioningSpec,
  refusals: {
    NO_MATCHING_DATES: NoMatchingDates, IMPROPER_SHIFT_TIMES: ImproperShiftTimes, IMPROPER_SHIFT_DATES: ImproperShiftDates
  },
  floors: {
    mongo: ({ database }: { database: Db }, _name: string) => new ProvisioningConcept(database),
  },
});

import offeringSpec from "@design/concepts/Offering.md" with {type: "text"};
import { OfferingConcept, AlreadyOffered, AnothersOffer, AlreadyClaimed, NoSuchOffer } from "./concepts/Offering.ts";
const offering = registerConcept({
  class: OfferingConcept,
  spec: offeringSpec,
  refusals: {
    ALREADY_OFFERED: AlreadyOffered, ANOTHERS_OFFER: AnothersOffer, ALREADY_CLAIMED: AlreadyClaimed, NO_SUCH_OFFER: NoSuchOffer
  },
  floors: {
    mongo: ({ database }: { database: Db }, _name: string) => new OfferingConcept(database),
  },
})

import { authenticating } from "./concepts/Authenticating/registry.ts";
import { registering } from "./concepts/Registering/registry.ts";
import { sessioning } from "./concepts/Sessioning/registry.ts";

export const applicationConceptSet = conceptSet({
  Authenticating: authenticating,
  Offering: offering,
  Provisioning: provisioning,
  Registering: registering,
  Reserving: reserving,
  Sessioning: sessioning
});
export const { concepts } = applicationConceptSet;
