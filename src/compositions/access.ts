import { is, view, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";

const { Reserving, Registering } = concepts;

// Hardcoded for
const CAPTAIN_KERBS = ["rld"];

// (user) is desk captain if (user)'s kerb is in CAPTAIN_KERBS
export const IsCaptain = view("(user) is a desk captain", ({ user }, _outputs, { kerb }) =>
    where(
        Registering._username({ user }).is({ username: kerb }),
        is.among(kerb, CAPTAIN_KERBS)
    ),
).holds();

// (user) owns (shift) if (user)'s kerb is (shift)'s holder
export const Owns = view("(user) owns (shift)", ({ user, shift }, _outputs, { kerb }) =>
    where(
        Registering._username({ user }).is({ username: kerb }),
        Reserving._holderOf({ resource: shift }).is({ holder: kerb })),
).holds();

export const composition = { IsCaptain, Owns };