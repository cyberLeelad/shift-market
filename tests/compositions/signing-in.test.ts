import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { startShiftMarket } from "../support/app.ts";
import { ok } from "../support/results.ts";

type Market = Awaited<ReturnType<typeof startShiftMarket>>;

let stopCurrent: (() => Promise<void>) | undefined;

async function start(): Promise<Market> {
  const market = await startShiftMarket();
  stopCurrent = async () => {
    await market.application.beginDrain();
    await market.application.whenIdle();
  };
  return market;
}

afterEach(async () => {
  await stopCurrent?.();
  stopCurrent = undefined;
});

describe("auth", () => {
  describe("register", () => {
    test("registers and signs in to a new session", async () => {
      const { api } = await start();

      const register = ok(await api.auth.register({ username: "ben", password: "correct dog" }));
      const userId = register.user;
      expect(ok(await api.auth.me({ session: register.session })).username).toEqual("ben");

      // Login to a new session
      const login = ok(await api.auth.login({ username: "ben", password: "correct dog" }));
      expect(login.user).toEqual(userId);
      expect(ok(await api.auth.me({ session: login.session })).username).toEqual("ben");
      expect(login.session).not.toEqual(register.session);
    });

    test("refuses registration with a taken username", async () => {
      const { api } = await start();
      const register = ok(await api.auth.register({ username: "ben", password: "correct dog" }));

      const second = await api.auth.register({ username: "ben", password: "battery staple" });
      expect(second).toMatchObject({ error: "USERNAME_TAKEN" });

      // The original password still works. The refused registration didn't overwrite the account.
      const login = ok(await api.auth.login({ username: "ben", password: "correct dog" }));
      expect(ok(await api.auth.me({ session: login.session })).username).toEqual("ben");
      expect(login.user).toEqual(register.user);
    });

    test("refuses registration with an empty username", async () => {
      const { api } = await start();

      const result = await api.auth.register({ username: "", password: "correct dog" });
      expect(result).toMatchObject({ error: "INVALID_USERNAME" });
    });
  });

  test("refuses login with an incorrect password", async () => {
    const { api } = await start();
    ok(await api.auth.register({ username: "ben", password: "correct dog" }));

    const result = await api.auth.login({ username: "ben", password: "battery staple" });
    expect(result).toMatchObject({ error: "INVALID_CREDENTIALS" });
  });

  describe("sessions", () => {
    test("logs out and ends the session", async () => {
      // Session stops working
      const { api } = await start();
      const register = ok(await api.auth.register({ username: "ben", password: "correct dog" }));
      expect(ok(await api.auth.me({ session: register.session })).username).toEqual("ben");

      ok(await api.auth.logout({ session: register.session }));

      expect(await api.auth.me({ session: register.session })).toMatchObject({ error: "NOT_SIGNED_IN" });
    });

    test("keeps sessions of multiple signed-in users separate", async () => {
      // register 2 users
      const { api } = await start();
      const ben = ok(await api.auth.register({ username: "ben", password: "correct dog" }));
      const cake = ok(await api.auth.register({ username: "cake", password: "battery staple" }));

      expect(ben.user).not.toEqual(cake.user);
      expect(ok(await api.auth.me({ session: ben.session })).username).toEqual("ben");
      expect(ok(await api.auth.me({ session: cake.session })).username).toEqual("cake");

      // ensure logging out one user does not affect the other
      ok(await api.auth.logout({ session: ben.session }));

      expect(await api.auth.me({ session: ben.session })).toMatchObject({ error: "NOT_SIGNED_IN" });
      expect(ok(await api.auth.me({ session: cake.session })).username).toEqual("cake");
    });

    test("refuses authentication with an incorrect session cookie", async () => {
      const { api } = await start();
      const register = ok(await api.auth.register({ username: "ben", password: "correct dog" }));

      const unknown = "not-a-real-session" as typeof register.session;
      expect(await api.auth.me({ session: unknown })).toMatchObject({ error: "NOT_SIGNED_IN" });
      expect(ok(await api.auth.me({ session: register.session })).username).toEqual("ben");
    });
  });
});