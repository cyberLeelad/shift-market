# Todo List

# Current plan

1. Restore old compositions, `Shifts` and `Reservations`, and remove `Offering` concept.

2. If the app works as it used to, continue. If it doesn't, perhaps just roll back everything. Once things work as they used to, proceed.

3. Add back the `Offering` concept and verify it with test cases.

4. Incrementally develop the `Shifts` composition to make the `Reservations` composition redundant. Update frontend at each step.

5. Delete `Reservations` in its entirety (design, src, and tests).

6. Incrementally develop the `Shifts` composition to match my most recently spec for `Shifts` as of last night ([this commit](https://github.com/cyberLeelad/shift-market/tree/30b7140b3fc7ca839f14305979f98a23ba357394) or [this commit](https://github.com/cyberLeelad/shift-market/tree/cda8e38a23b326f766c4405c8e4f2b0d40f627aa)). Update frontend at each step.

7. Take stock of current position and decide what to add next from a functionality point of view (not concepts point of view). Then, determine what concepts and/or compositions are needed, and work incrementally.

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

- [ ] For each new concept, write its spec in `design/concepts/`, then update `design/types.md` and any compositions. Run `bun run check:design` after each change.

- [ ] Write test cases

## Backend

- [ ] Write `src/concepts/ConceptName.ts`. Run `bun run check:design` and `bun run check`.

- [ ] Update `src/concepts.ts`.

- [ ] Write endpoints in `src/compositions/CompositionName.ts`.

- [ ] Update `src/assembly.ts` and `generated.config.ts`. Run `bun run generate` and then `bun run check`.

- [ ] `src/http.ts`: Define what code the API will send when the request results throws an error.

- [ ] Run the backend: `bun run db:up`, `bun run dev:backend`.

- [ ] Pass test cases

## Frontend

- [ ] Update what displays using `web/index.html`.

- [ ] Update `web/app.ts` with any new calls (to locate data for `web/index.html` to display).

- [ ] bun run start runs both frontend & backend servers together. View site to test feature.

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