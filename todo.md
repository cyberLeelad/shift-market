# Todo List

1. Incrementally develop the `Shifts` composition to match my most recently spec for `Shifts` as of last night ([this commit](https://github.com/cyberLeelad/shift-market/blob/cda8e38a23b326f766c4405c8e4f2b0d40f627aa/design/compositions/Shifts.md). Update frontend at each step.

# Critical missing feature

Release shifts (single date or weekly-recurring) : `Offering` concept and updates to `Shifts` composition.

# P3 Deliverables

- [ ] `githash` command in each repo.

- [ ] Update [README.md](README.md).
    - [ ] Include instructions in the README for running the tests, including any database setup.

- [ ] [Shift Market, deployed on the web.](https://shift-market.mit-sdg.dev/)

- [ ] Run automated tests to tests/output.txt.

- [ ] Your visual design study (2 slides).

- [ ] An updated user journey.

- [ ] An updated screen recording. Add YouTube link to [README.md](README.md).

# Incremental implementation

On each step,

## Spec

- Write a new concept's spec in `design/concepts/`.  Run `bun run check:design`. Update `design/types.md` with this new concept.

- Write any new compositions or edit existing ones in `design/compositions/`. Run `bun run check:design`.

- Write test cases for the concept and/or composition.

## Backend

- Implement concept in `src/concepts/`. Run `bun run generate`, `bun run check`, and `bun run tests`.

- Wire concept into `src/concepts.ts`, and `src/assembly.ts`. Also, define [what code the API will send](src/http.ts) when requests throws an error originating in this concept.

- Implement or update any related compositions in `src/compositions/`, including endpoints. Run `bun run generate`, `bun run check`, and `bun run test`.

- If a new composition was added, wire it into [src/assembly.ts](src/assembly.ts) and [generated.config.ts](generated.config.ts).

## Frontend

- Update frontend in [App.vue](App.vue).

- [View site](http://localhost:8080/) to test feature.

# Document progress in design notebook

Demonstrate your incremental work in your design notes.

Record incremenetal progress, design notes, significant decisions, challenges, future work, going back to previous steps, changing your implementations or concepts, etc.