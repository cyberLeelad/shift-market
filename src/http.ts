import { httpPolicy } from "@mit-sdg/sync-engine-http/policy";

export const policy = httpPolicy({
  basePath: "/api",
  publicErrors: {
    ALREADY_RESERVED: "CONFLICT", NO_SUCH_RESERVATION: "NOT_FOUND",
    IMPROPER_SHIFT_TIMES: "INVALID_REQUEST", IMPROPER_SHIFT_DATES: "INVALID_REQUEST", NO_MATCHING_DATES: "INVALID_REQUEST"
  },
});
