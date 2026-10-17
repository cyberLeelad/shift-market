import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createLocalClient } from "@mit-sdg/sync-engine/client";
import type { ShiftMarketWire } from "../../generated/wire.ts";
import { assembleApplication } from "../../src/assembly.ts";
import { testDatabase } from "./reusable/mongo.ts";

/** Shift Market on a fresh in-memory database, called through its typed client, as the browser would. */
export async function startShiftMarket() {
  const database = await testDatabase();
  const application = assembleApplication(database);
  const api = createLocalClient<ShiftMarketWire>({
    invoker: createGateway<ShiftMarketWire>({ application }),
  });
  return { database, application, api };
}