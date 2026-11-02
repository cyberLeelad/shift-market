import { httpPolicy, type HttpPolicy } from "@mit-sdg/sync-engine-http/policy";
import { accountsHttp } from "./compositions/auth/accounts.ts";
import { passwordsHttp } from "./compositions/auth/passwords.ts";

/**
 * The HTTP category the server returns for each refusal from the compositions in `src/compositions/`.
 * A refusal missing here reaches the browser as INTERNAL_ERROR (500), so each new refusal needs a line.
 * Signing in declares its categories beside its endpoints. The browser receives only the
 * category; (TODO) the sentence for each one is in `frontend/src/api/errors.ts`.
 */
const publicErrors = {
  ALREADY_RESERVED:     "CONFLICT",
  NO_SUCH_RESERVATION:  "NOT_FOUND",
  IMPROPER_SHIFT_TIMES: "INVALID_REQUEST",
  IMPROPER_SHIFT_DATES: "INVALID_REQUEST",
  NO_MATCHING_DATES:    "INVALID_REQUEST",
  ALREADY_OFFERED:      "INVALID_REQUEST",
  ANOTHERS_OFFER:       "FORBIDDEN",
  ALREADY_CLAIMED:      "FORBIDDEN",
  NO_SUCH_OFFER:        "NOT_FOUND",
} as const;

/**
 * The HTTP settings: the API under /api, each refusal returned as an HTTP category, the session in
 * an HttpOnly cookie that signing in sets and sign-out clears, that only the browser that started it holds.
 */
export function policy(publicOrigin: string): HttpPolicy {
  return httpPolicy({
    publicOrigin,
    basePath: "/api",
    publicErrors: {
      ...accountsHttp.publicErrors,
      ...passwordsHttp.publicErrors,
      ...publicErrors,
    },
    cookies: {
      session: accountsHttp.sessionCookie("conceptbox-session", [
        ...passwordsHttp.startingSessions,
      ]),
    },
  });
}