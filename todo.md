Current Todos:

- [x] P1

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

- [ ] P2

  - [x] User journey: Drafted, need to revise later.

  - [x] Set up sync engine

  - [ ] Revisit/confirm user journey.

  - [ ] Incremental implementation. On each step,

    - [ ] Backend implementation

    - [ ] SIMPLE frontend

    - [ ] For each new concept, write its spec in `design/concepts/`, then update `design/types.md` and any compositions. Run `bun run check:design` after each change.

    - [ ] Then write the class, register it in `src/concepts.ts`, and wire it into `src/compositions/`. Run `bun run generate` and `bun run check` before you try it in the browser.

    - [ ] Create the 
