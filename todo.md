Most minimal product/first steps:

1. Sees landing page: calendar; alphabetized list of shifts, which can be **encoded** as yyyy-mm-dd-day-military_start_time-end_time (that way they do in fact appear in the correct order), but **display** in a more readable format such as "Friday (10/16) 4pm-6pm." Initialized with pre-populated standard FRED DESK shifts (2 hour blocks, 8am-12am, M-Su, weekly).

   1. You basically have this right now. Just remove the UI to add shifts & list the reservations in alphabetical order. ==> No, that doesn't work, because some will be unreserved and thus not show up.

   2. Going to need to build Provisioning, to start with.

2. Claim weekly shift. "Calendar" updates appropriately after each change.

3. Claim one-off shift

4. Release one date of weekly shift

5. Reclaim her own punted shift

6. Release weekly shift (all instances)

- [ ] [30min] any add'l needed work to flesh out feedback

- [ ] Ctrl-F everywhere for "TODO" (perhaps I can do this more efficiently from the command line somehow)

- [ ] Find out if design/concepts/Provisioning.md makeWeeklyShifts can return a set, and how to specify that

- [ ] Allow desk captain to delete shifts

- [ ] Change Provisioning._all to also return "isWeeklyShift," as determined by whether or not it's linked to anything else. (I think this is a reasonable way to determine whether it's a weekly shift?)

- [ ] Disallow creating shifts in the past.

- [ ] Disallow interacting with past shifts.

---

- [ ] P2

Incremental implementation. On each step,

    - [x] (**Spec**) For each new concept, write its spec in `design/concepts/`, then update `design/types.md` and any compositions. Run `bun run check:design` after each change.

    - [x] (**Backend**) Write `src/concepts/ConceptName.ts`. Run `bun run check:design` and `bun run check`.

    - [x] Update `src/concepts.ts`.

    - [x] Write endpoints in `src/compositions/CompositionName.ts`.

    - [x] Update `src/assembly.ts` and `generated.config.ts`. Run `bun run generate` and then `bun run check`.

    - [x] `src/http.ts`: Define what code the API will send when the request results throws an error.

    - [ ] Run the backend: bun run db:up, bun run dev:backend.

    - [ ] (*optional?*) Can use a scripts/ to try the concept before writing front end: bun scripts/script-name.ts

    - [ ] (**Frontend**) Update what displays using `web/index.html`.

    - [ ] Update `web/app.ts` with any new calls (to locate data for `web/index.html` to display).

    - [ ] bun run start runs both frontend & backend servers together. View site to test feature.

---

Current Todos:

- [ ] **Keep design notebook updated** with incremenetal progress & back steps etc.

  > Record design notes; document progress
  >
  > - significant decisions
  >
  > - challenges
  >
  > - future work
  >
  > - going back to previous steps
  >
  > - changing your implementations or concepts
  >
  > Steps will be iterated as you develop your application incrementally
  >
  > Demonstrate this incremental work in your design notes

---

Writing stuff

- [ ] In design/design.md's problem statement, add evidence beyond your own experience such as maybe a count of swap threads. (P1 feedback)

- [ ] In design/design.md's pitch, replace marketing phrasing with plainer wording. (P1 feedback)

---

Completed tasks:

P2

- [x] User journey: Drafted, need to revise later.

- [x] Set up sync engine

- [x] Revisit/confirm user journey.

- [x] Break down the MVP even more. Forget about logging in. That’s standard stuff that shouldn’t be hard to add

- [x] [15-30 min] Implement feedback efficiently / just by making notes

P1

- [x] P1