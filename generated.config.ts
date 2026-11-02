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
      new URL("./design/compositions/auth/accounts.md", import.meta.url),
      new URL("./design/compositions/auth/passwords.md", import.meta.url),
      new URL("./design/compositions/access.md", import.meta.url),
    ],
  },
  projections: [httpWire({ policy: policy("http://localhost:3000"), name: "ShiftMarketWireHttp" })],
};
