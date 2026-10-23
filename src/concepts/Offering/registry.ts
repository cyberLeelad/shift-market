import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import type { Db } from "mongodb";
import spec from "@design/concepts/Offering.md" with {type: "text"};
import { OfferingConcept, AlreadyOffered, AnothersOffer, AlreadyClaimed, NoSuchOffer } from "./Offering.ts";

export const offering = registerConcept({
  class: OfferingConcept,
  spec: spec,
  refusals: {
    ALREADY_OFFERED: AlreadyOffered, ANOTHERS_OFFER: AnothersOffer, ALREADY_CLAIMED: AlreadyClaimed, NO_SUCH_OFFER: NoSuchOffer
  },
  floors: {
    mongo: ({ database }: { database: Db }, _name: string) => new OfferingConcept(database),
  },
})