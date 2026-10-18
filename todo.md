# Todo List

# Current plan

1. Wire in Offering.

2. Incrementally develop the `Shifts` composition to make the `Reservations` composition redundant. Update frontend at each step.

3. Delete `Reservations` in its entirety (design, src, and tests).

4. Incrementally develop the `Shifts` composition to match my most recently spec for `Shifts` as of last night ([this commit](https://github.com/cyberLeelad/shift-market/tree/30b7140b3fc7ca839f14305979f98a23ba357394) or [this commit](https://github.com/cyberLeelad/shift-market/tree/cda8e38a23b326f766c4405c8e4f2b0d40f627aa)). Update frontend at each step.

5. Take stock of current position and decide what to add next from a functionality point of view (not concepts point of view). Then, determine what concepts and/or compositions are needed, and work incrementally.

# Clean-up steps (5 min each)

- [ ] Ctrl-F everywhere for "TODO" (using a `grep` command line prompt)

- [ ] In design/design.md's problem statement, add evidence beyond your own experience such as maybe a count of swap threads. (P1 feedback)

- [ ] In design/design.md's pitch, replace marketing phrasing with plainer wording. (P1 feedback)

- [ ] Find out if design/concepts/Provisioning.md makeWeeklyShifts can return a set, and how to specify that

# Critical features

1. Release shifts (single date or weekly-recurring) : `Offering` concept and updates to `Shifts` composition.

## Potentially critical

- [ ] Change Provisioning._all to also return "isWeeklyShift," as determined by whether or not it's linked to anything else. (I think this is a reasonable way to determine whether it's a weekly shift?)

- [ ] Then you can add the ability to release all occurances of a weekly shift.

- [ ] UI symbol has a little ↻ on repeating shifts

# Incremental implementation

On each step,

## Spec

- [ ] Concept only: Write its spec in `design/concepts/`.  Run `bun run check:design`. Update `design/types.md` with this new concept.

- [ ] Write any new compositions or edit existing ones in `design/compositions/`. Run `bun run check:design`.

- [ ] Write test cases for the concept and/or composition.

## Backend

- [ ] Implement concept in `src/concepts/`. Run `bun run generate`, `bun run check`, and `bun run tests`.

- [ ] Wire concept into `src/concepts.ts`, and `src/assembly.ts`

- [ ] Implement or update any related compositions in `src/compositions/`, including endpoints. Run `bun run generate`, `bun run check`, and `bun run tests`.

- [ ] If a new composition was added, wire it into `src/assembly.ts` and `generated.config.ts`.

- [ ] Define what code the API will send when the request results throws an error in `src/http.ts`.

## Frontend

- [ ] Update frontend in `App.vue`.

- [ ] View site to test feature.

# Document progress in design notebook

Demonstrate your incremental work in your design notes.

Record incremenetal progress, design notes, significant decisions, challenges, future work, going back to previous steps, changing your implementations or concepts, etc.

# Additional features

- [ ] Expiring

- [ ] Authenticating

   - [ ] Only desk captains can create and delete shifts
   
   - [ ] UI reflects this (hidden "manage shifts" toggle-able sidebar)

- Temporality

   - [ ] Disallow creating shifts in the past

   - [ ] Disallow interacting with past shifts

- [ ] Calendar size varies depending on actual shift schedule