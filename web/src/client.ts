import { createHttpClient } from "@mit-sdg/sync-engine-http/client";
import type { ShiftMarketWireHttp } from "../../generated/wire.ts";

/** A typed client for every endpoint, built from `generated/wire.ts`. */
export const api = createHttpClient<ShiftMarketWireHttp>({ baseUrl: "/api" });