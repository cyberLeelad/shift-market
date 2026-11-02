/**
 * Testing strategy for access
 * Attempts not to be redundant with things that other test files have already covered.
 * 
    captain access:
        * captain makes shifts (both types) with a valid session
        * non-captain user is refused with `NOT_CAPTAIN` on attempts to use both shift making endpoints. check the shift count afterward to ensure no shifts were made.

    new endpoint: assign(session, shift, user)
        * captain assigns an unreserved shift and then an offered shift.
        * non-captain user is refused with NOT_CAPTAIN. check that the shift has not changed hands.
        * captain is refused when attempting to assign an already-held shift. check that shift has not changed hands.

    valid session required: each of the following requests gets NOT_SIGNED_IN if there is no valid session.
        * listing shifts
        * claiming shifts
        * makeOne/makeWeekly
        * assign
        * additionally, all of these will fail on a session that has been logged out.

    ownership:
        * a user can offer a shift they own
        * a user is refused when they try to offer a shift they don't own
        * a request with an invalid session is refused

    concurrency:
        * Two users claiming the same offered shift at once: exactly one succeeds.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { startShiftMarket } from "../support/app.ts";
import { ok } from "../support/results.ts";

type Market = Awaited<ReturnType<typeof startShiftMarket>>;
const stops: (() => Promise<void>)[] = [];
// Used for one-off shifts
const DATE = "2026-11-02";

async function start(): Promise<Market> {
  const market = await startShiftMarket();
  stops.push(async () => {
    await market.application.beginDrain();
    await market.application.whenIdle();
  });
  return market;
}

afterEach(async () => {
  for (const stop of stops.splice(0)) await stop();
});

describe("access", () => {
    describe("captain access", () => {
        test("makes one-off and weekly shifts", async () => {
            const { api } = await start();

            // register captain
            const captain = ok(await api.auth.register({ username: "rld", password: "correct dog" }));
            const session = captain.session;

            // make one shift, ensure 1 shift is created and action is ok
            ok(await api.shifts.makeOne({ session, start: "08:00", end: "10:00", date: "2026-11-02" }));
            const afterOneOff = ok(await api.shifts.list({ session }));
            expect(afterOneOff.organizer.shifts).toHaveLength(1);

            // repeat, for a weekly shift instead
            ok(
            await api.shifts.makeWeekly({
                session,
                start: "08:00",
                end: "10:00",
                day: "MONDAY",
                first: "2026-11-02",
                last: "2026-11-16",
            }),
            );
            const afterWeekly = ok(await api.shifts.list({ session }));
            expect(afterWeekly.organizer.shifts).toHaveLength(4);
        });
        test("refuses shift creation by a non-captain with NOT_CAPTAIN and creates no shifts", async () => {
            const { api } = await start();

            const member = ok(await api.auth.register({ username: "maya", password: "correct dog" }));
            const session = member.session;

            const oneOff = await api.shifts.makeOne({ session, start: "08:00", end: "10:00", date: "2026-11-02" });
            expect(oneOff).toEqual({ error: "NOT_CAPTAIN" });

            const weekly = await api.shifts.makeWeekly({
                session,
                start: "08:00",
                end: "10:00",
                day: "MONDAY",
                first: "2026-11-02",
                last: "2026-11-16",
            });
            expect(weekly).toEqual({ error: "NOT_CAPTAIN" });

            expect(ok(await api.shifts.list({ session })).organizer.shifts).toHaveLength(0);
        });
    });

    describe("assignment", () => {
        test("assigns an unreserved shift", async () => {
            const { api } = await start();

            const captain = ok(await api.auth.register({ username: "rld", password: "correct dog" })).session;
            const ana = ok(await api.auth.register({ username: "ana", password: "correct dog" })).session;
            const ben = ok(await api.auth.register({ username: "ben", password: "correct dog" })).session;

            // An unreserved shift can be assigned directly.
            const unreserved = ok(await api.shifts.makeOne({ session: captain, start: "09:00", end: "13:00", date: DATE })).shift;
            ok(await api.shifts.assign({ session: captain, resource: unreserved, staff: "ana" }));

            const rows = ok(await api.shifts.list({ session: captain })).organizer.shifts;
            expect(rows.find((s) => s.shift === unreserved)?.state.holder).toEqual("ana");
        });

        test("assigns an offered shift", async () => {
            const { api } = await start();

            const captain = ok(await api.auth.register({ username: "rld", password: "correct dog" })).session;
            const ana = ok(await api.auth.register({ username: "ana", password: "correct dog" })).session;
            const ben = ok(await api.auth.register({ username: "ben", password: "correct dog" })).session;

            // An offered shift can also be assigned. Ana holds it, then offers it.
            const offered = ok(await api.shifts.makeOne({ session: captain, start: "13:00", end: "17:00", date: DATE })).shift;
            ok(await api.shifts.assign({ session: captain, resource: offered, staff: "ana" }));
            ok(await api.shifts.offer({ session: ana, resource: offered }));
            ok(await api.shifts.assign({ session: captain, resource: offered, staff: "ben" }));

            const row = ok(await api.shifts.list({ session: captain })).organizer.shifts.find((s) => s.shift === offered);
            expect(row?.state.holder).toEqual("ben");
            expect(row?.state.offer).toBeNull();
        });

        test("refuses assignment by a non-captain with NOT_CAPTAIN and leaves the holder unchanged", async () => {
            const { api } = await start();

            const captain = ok(await api.auth.register({ username: "rld", password: "correct dog" })).session;
            const ana = ok(await api.auth.register({ username: "ana", password: "correct dog" })).session;
            const ben = ok(await api.auth.register({ username: "ben", password: "correct dog" })).session;

            const shift = ok(await api.shifts.makeOne({ session: captain, start: "09:00", end: "13:00", date: DATE })).shift;
            ok(await api.shifts.assign({ session: captain, resource: shift, staff: "ana" }));

            // Ben is not the captain, so his attempt to reassign Ana's shift is refused.
            const attempt = await api.shifts.assign({ session: ben, resource: shift, staff: "ben" });
            expect(attempt).toEqual({ error: "NOT_CAPTAIN" });

            const row = ok(await api.shifts.list({ session: captain })).organizer.shifts.find((s) => s.shift === shift);
            expect(row?.state.holder).toEqual("ana");
        });

        test("refuses assignment of a held shift and leaves the holder unchanged", async () => {
            const { api } = await start();

            const captain = ok(await api.auth.register({ username: "rld", password: "correct dog" })).session;
            await api.auth.register({ username: "ana", password: "correct dog" });
            await api.auth.register({ username: "ben", password: "correct dog" });

            // The shift is held by Ana and not offered, so the captain cannot assign it to Ben.
            const shift = ok(await api.shifts.makeOne({ session: captain, start: "09:00", end: "13:00", date: DATE })).shift;
            ok(await api.shifts.assign({ session: captain, resource: shift, staff: "ana" }));

            const attempt = await api.shifts.assign({ session: captain, resource: shift, staff: "ben" });
            expect(attempt).toEqual({ error: "ALREADY_CLAIMED" });

            const row = ok(await api.shifts.list({ session: captain })).organizer.shifts.find((s) => s.shift === shift);
            expect(row?.state.holder).toEqual("ana");
        });
    });

    describe("sessions", () => {
        test("refuses listing shifts without a valid session", async () => {
            const { api } = await start();

            // A session that was never issued is refused before any shift is read.
            const attempt = await api.shifts.list({ session: "not-a-real-session" });
            expect(attempt).toEqual({ error: "NOT_SIGNED_IN" });
        });

        test("refuses claiming a shift without a valid session", async () => {
            const { api } = await start();

            const captain = ok(await api.auth.register({ username: "rld", password: "correct dog" })).session;
            // The shift exists and is unheld, so only the session check can refuse the claim.
            const shift = ok(await api.shifts.makeOne({ session: captain, start: "09:00", end: "13:00", date: DATE })).shift;

            const attempt = await api.shifts.claim({ session: "not-a-real-session", resource: shift });
            expect(attempt).toEqual({ error: "NOT_SIGNED_IN" });
        });

        test("refuses creating shifts without a valid session", async () => {
            const { api } = await start();

            await api.auth.register({ username: "rld", password: "correct dog" });

            const attempt = await api.shifts.makeOne({ session: "not-a-real-session", start: "09:00", end: "13:00", date: DATE });
            expect(attempt).toEqual({ error: "NOT_SIGNED_IN" });

            // No shift was created by the refused request.
            const captain = ok(await api.auth.login({ username: "rld", password: "correct dog" })).session;
            expect(ok(await api.shifts.list({ session: captain })).organizer.shifts).toHaveLength(0);
        });

        test("refuses assignment without a valid session", async () => {
            const { api } = await start();

            const captain = ok(await api.auth.register({ username: "rld", password: "correct dog" })).session;
            // The shift exists and is unheld, so only the session check can refuse the assignment.
            const shift = ok(await api.shifts.makeOne({ session: captain, start: "09:00", end: "13:00", date: DATE })).shift;

            const attempt = await api.shifts.assign({ session: "not-a-real-session", resource: shift, staff: "ana" });
            expect(attempt).toEqual({ error: "NOT_SIGNED_IN" });

            const row = ok(await api.shifts.list({ session: captain })).organizer.shifts.find((s) => s.shift === shift);
            expect(row?.state.holder).toBeNull();
        });

        test("refuses all of these actions after logout", async () => {
            const { api } = await start();

            const session = ok(await api.auth.register({ username: "rld", password: "correct dog" })).session;
            // Everything works while signed in, so the refusals below come from the logout.
            const shift = ok(await api.shifts.makeOne({ session, start: "09:00", end: "13:00", date: DATE })).shift;
            ok(await api.shifts.list({ session }));

            ok(await api.auth.logout({ session }));

            // Each action is refused with NOT_SIGNED_IN. The shift exists and is unheld, so only the session check can refuse these.
            expect(await api.shifts.list({ session })).toEqual({ error: "NOT_SIGNED_IN" });
            expect(await api.shifts.claim({ session, resource: shift })).toEqual({ error: "NOT_SIGNED_IN" });
            expect(await api.shifts.makeOne({ session, start: "13:00", end: "17:00", date: DATE })).toEqual({
                error: "NOT_SIGNED_IN",
            });
            expect(await api.shifts.assign({ session, resource: shift, staff: "ana" })).toEqual({ error: "NOT_SIGNED_IN" });
        });
    });

  describe("ownership", () => {
    test("offers a shift the user holds", async () => {
        const { api } = await start();

        const captain = ok(await api.auth.register({ username: "rld", password: "correct dog" })).session;
        const ana = ok(await api.auth.register({ username: "ana", password: "correct dog" })).session;

        // The captain creates a shift and assigns it to Ana, so Ana holds it.
        const shift = ok(await api.shifts.makeOne({ session: captain, start: "09:00", end: "13:00", date: DATE })).shift;
        ok(await api.shifts.assign({ session: captain, resource: shift, staff: "ana" }));

        // Ana offers the shift she holds, which opens an offer on it.
        const offer = ok(await api.shifts.offer({ session: ana, resource: shift })).offer;

        // The holder is unchanged, and the offer now appears on the shift.
        const row = ok(await api.shifts.list({ session: captain })).organizer.shifts.find((s) => s.shift === shift);
        expect(row?.state.holder).toEqual("ana");
        expect(row?.state.offer).toEqual(offer);
    });

    test("refuses offering a shift held by another user", async () => {
        const { api } = await start();

        const captain = ok(await api.auth.register({ username: "rld", password: "correct dog" })).session;
        await api.auth.register({ username: "ana", password: "correct dog" });
        const ben = ok(await api.auth.register({ username: "ben", password: "correct dog" })).session;

        // Ana holds the shift, so Ben has no claim to offer it.
        const shift = ok(await api.shifts.makeOne({ session: captain, start: "09:00", end: "13:00", date: DATE })).shift;
        ok(await api.shifts.assign({ session: captain, resource: shift, staff: "ana" }));

        // Ben's offer is refused with NOT_HELD, the branch for a shift held by someone else.
        const attempt = await api.shifts.offer({ session: ben, resource: shift });
        expect(attempt).toEqual({ error: "NOT_HELD" });

        // No offer was opened, and Ana still holds the shift.
        const row = ok(await api.shifts.list({ session: captain })).organizer.shifts.find((s) => s.shift === shift);
        expect(row?.state.holder).toEqual("ana");
        expect(row?.state.offer).toBeNull();
    });

    test("refuses offering with an incorrect session cookie", async () => {
        const { api } = await start();

        const captain = ok(await api.auth.register({ username: "rld", password: "correct dog" })).session;
        await api.auth.register({ username: "ana", password: "correct dog" });

        // The shift is held by Ana, so only the session check can refuse this offer.
        const shift = ok(await api.shifts.makeOne({ session: captain, start: "09:00", end: "13:00", date: DATE })).shift;
        ok(await api.shifts.assign({ session: captain, resource: shift, staff: "ana" }));

        // A session that was never issued is refused with NOT_SIGNED_IN before any shift check runs.
        const attempt = await api.shifts.offer({ session: "not-a-real-session", resource: shift });
        expect(attempt).toEqual({ error: "NOT_SIGNED_IN" });

        const row = ok(await api.shifts.list({ session: captain })).organizer.shifts.find((s) => s.shift === shift);
        expect(row?.state.offer).toBeNull();
    });
    });

  describe("concurrency", () => {
    test("allows only one of two simultaneous claims on an offered shift", async () => {
        const { api } = await start();

        // The captain creates a shift and assigns it to ana, who will be the holder.
        const captain = ok(await api.auth.register({ username: "rld", password: "correct dog" })).session;
        const shift = ok(await api.shifts.makeOne({ session: captain, start: "09:00", end: "13:00", date: DATE })).shift;
        ok(await api.shifts.assign({ session: captain, resource: shift, staff: "ana" }));

        // Ana offers the shift, which leaves it open for anyone to claim.
        const ana = ok(await api.auth.register({ username: "ana", password: "correct dog" })).session;
        ok(await api.shifts.offer({ session: ana, resource: shift }));

        // Ben and Cake register, then send their claims at the same time.
        const ben = ok(await api.auth.register({ username: "ben", password: "correct dog" })).session;
        const cake = ok(await api.auth.register({ username: "cake", password: "correct dog" })).session;
        const [benAttempt, cakeAttempt] = await Promise.all([
            api.shifts.claim({ session: ben, resource: shift }),
            api.shifts.claim({ session: cake, resource: shift }),
        ]);

        // Exactly one claim is accepted. The loser is refused with ALREADY_CLAIMED,
        // whether the offer had already closed when its branch ran.
        const attempts = [benAttempt, cakeAttempt];
        const accepted = attempts.filter((attempt) => !("error" in attempt));
        const refused = attempts.filter((attempt) => "error" in attempt);
        expect(accepted).toHaveLength(1);
        expect(refused).toHaveLength(1);
        expect(["ALREADY_CLAIMED"]).toContain(refused[0]!.error);
    });
  });
});