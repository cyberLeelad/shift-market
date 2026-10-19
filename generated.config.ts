import { httpWire } from "@mit-sdg/sync-engine-http/tooling";
import { assembleApplication } from "./src/assembly.ts";
import { policy } from "./src/http.ts";

export default {
  assemble: assembleApplication,
  title: "Shift Market",
  wireName: "ShiftMarketWire",
  design: {
    version: 1,
    documents: [
      new URL("./design/types.md", import.meta.url),
      new URL("./design/compositions/Shifts.md", import.meta.url),
      // New compositions are added here
    ],
  },
  projections: [httpWire({ policy, name: "ShiftMarketWireHttp" })],
};
