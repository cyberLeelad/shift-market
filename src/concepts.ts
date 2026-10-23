import { conceptSet } from "@mit-sdg/sync-engine/assembly";
import { provisioning } from "./concepts/Provisioning/registry.ts";
import { reserving } from "./concepts/Reserving/registry.ts";
import { offering } from "./concepts/Offering/registry.ts";
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
