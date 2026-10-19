# Todo List

1. Incrementally develop the `Shifts` composition to match my most recently spec for `Shifts` as of last night ([this commit](https://github.com/cyberLeelad/shift-market/tree/30b7140b3fc7ca839f14305979f98a23ba357394) or [this commit](https://github.com/cyberLeelad/shift-market/tree/cda8e38a23b326f766c4405c8e4f2b0d40f627aa)). Update frontend at each step.

2. Take stock of current position and decide what to add next from a functionality point of view (not concepts point of view). Then, determine what concepts and/or compositions are needed, and work incrementally.

# Clean-up steps (5 min each)

- [ ] Ctrl-F everywhere for "TODO" (using a `grep` command line prompt)

- [ ] In design/design.md's problem statement, add evidence beyond your own experience such as maybe a count of swap threads. (P1 feedback)

- [ ] In design/design.md's pitch, replace marketing phrasing with plainer wording. (P1 feedback)

- [ ] Find out if design/concepts/Provisioning.md makeWeeklyShifts can return a set, and how to specify that

- [ ] Clean up `README.md` in both repos.

# Critical missing feature

Release shifts (single date or weekly-recurring) : `Offering` concept and updates to `Shifts` composition.

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