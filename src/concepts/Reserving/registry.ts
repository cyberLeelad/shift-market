
import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import type { Db } from "mongodb";

import reservingSpec from "@design/concepts/Reserving.md" with { type: "text" };
import { AlreadyReserved, NoSuchReservation, ReservingConcept } from "./Reserving.ts";
export const reserving = registerConcept({
  class: ReservingConcept,
  spec: reservingSpec,
  refusals: { ALREADY_RESERVED: AlreadyReserved, NO_SUCH_RESERVATION: NoSuchReservation },
  floors: {
    mongo: ({ database }: { database: Db }, _name: string) => new ReservingConcept(database),
  },
});