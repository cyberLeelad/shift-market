import { describe, expect, test } from "bun:test";
import {
  AlreadyClaimed,
  AlreadyOffered,
  AnothersOffer,
  NoSuchOffer,
  OfferingConcept,
} from "../../src/concepts/Offering.ts";
import { testDatabase } from "../support/reusable/mongo.ts";
import { expectOneWinner } from "../support/reusable/race.ts";

async function setup() {
  const database = await testDatabase();
  return { offering: new OfferingConcept(database), database };
}

describe("Offering", () => {
  test("its principle: Fionna offers a shift, Cake claims it, the offer closes, and Fionna can offer it again afterward", async () => {
    const { offering } = await setup();
    const { offer } = await offering.offer({ item: "oct-13-6pm", user: "fionna" });
    expect(await offering._getOffer({ item: "oct-13-6pm" })).toEqual([{ offer }]);

    expect(await offering.resolve({ user: "cake", offer })).toEqual({});
    expect(await offering._getOffer({ item: "oct-13-6pm" })).toEqual([]);

    const again = await offering.offer({ item: "oct-13-6pm", user: "fionna" });
    expect(await offering._getOffer({ item: "oct-13-6pm" })).toEqual([{ offer: again.offer }]);
  });

  test("closed offers are kept as history, so a claimed offer is still stored, marked closed", async () => {
    const { offering, database } = await setup();
    const { offer } = await offering.offer({ item: "oct-13-6pm", user: "fionna" });
    await offering.resolve({ user: "cake", offer });

    const stored = await database.collection("offering.offers").find({ item: "oct-13-6pm" }).toArray();
    expect(stored).toEqual([expect.objectContaining({ _id: offer, owner: "fionna", closed: true })]);
  });

  test("a different user can offer an item again after its earlier offer was claimed", async () => {
    const { offering } = await setup();
    const { offer } = await offering.offer({ item: "oct-13-6pm", user: "fionna" });
    await offering.resolve({ user: "cake", offer });

    const later = await offering.offer({ item: "oct-13-6pm", user: "cake" });
    expect(await offering._getOffer({ item: "oct-13-6pm" })).toEqual([{ offer: later.offer }]);
  });

  test("the same user offering an item that is already open is refused with ALREADY_OFFERED, and nothing changes", async () => {
    const { offering, database } = await setup();
    const { offer } = await offering.offer({ item: "oct-13-6pm", user: "fionna" });

    const refusal = offering.offer({ item: "oct-13-6pm", user: "fionna" });
    await expect(refusal).rejects.toThrow(AlreadyOffered);
    await expect(refusal).rejects.toThrow("Item is already up for offer by this user.");

    const stored = await database.collection("offering.offers").find({ item: "oct-13-6pm" }).toArray();
    expect(stored).toEqual([expect.objectContaining({ _id: offer, owner: "fionna", closed: false })]);
  });

  test("another user offering an item that is already open is refused with ANOTHERS_OFFER, and nothing changes", async () => {
    const { offering, database } = await setup();
    const { offer } = await offering.offer({ item: "oct-13-6pm", user: "fionna" });

    const refusal = offering.offer({ item: "oct-13-6pm", user: "cake" });
    await expect(refusal).rejects.toThrow(AnothersOffer);
    await expect(refusal).rejects.toThrow("Cannot offer an item already offered by another user.");

    const stored = await database.collection("offering.offers").find({ item: "oct-13-6pm" }).toArray();
    expect(stored).toEqual([expect.objectContaining({ _id: offer, owner: "fionna" })]);
  });

  test("claiming a closed offer is refused with ALREADY_CLAIMED, and the claim does not change the offer", async () => {
    const { offering } = await setup();
    const { offer } = await offering.offer({ item: "oct-13-6pm", user: "fionna" });
    await offering.resolve({ user: "cake", offer });

    const refusal = offering.resolve({ user: "maya", offer });
    await expect(refusal).rejects.toThrow(AlreadyClaimed);
    await expect(refusal).rejects.toThrow("Cannot claim a closed offer.");
    expect(await offering._getOffer({ item: "oct-13-6pm" })).toEqual([]);
  });

  test("claiming an offer that never existed is refused with NO_SUCH_OFFER, and changes nothing", async () => {
    const { offering } = await setup();
    const refusal = offering.resolve({ user: "cake", offer: "never-existed" });
    await expect(refusal).rejects.toThrow(NoSuchOffer);
    await expect(refusal).rejects.toThrow("Cannot claim an offer that does not exist.");
    expect(await offering._openOffers({})).toEqual([]);
  });

  test("_getOffer answers no rows for an item that was never offered", async () => {
    const { offering } = await setup();
    expect(await offering._getOffer({ item: "oct-13-6pm" })).toEqual([]);
  });

  test("_openOffers lists every open offer across items, and leaves out the closed ones", async () => {
    const { offering } = await setup();
    const first = await offering.offer({ item: "oct-13-6pm", user: "fionna" });
    const second = await offering.offer({ item: "oct-14-6pm", user: "cake" });
    const third = await offering.offer({ item: "oct-15-6pm", user: "fionna" });
    await offering.resolve({ user: "maya", offer: second.offer });

    const open = await offering._openOffers({});
    expect(open).toHaveLength(2);
    expect(open).toEqual(expect.arrayContaining([{ offer: first.offer }, { offer: third.offer }]));
  });

  test("_openOffers answers no rows when nothing is open", async () => {
    const { offering } = await setup();
    expect(await offering._openOffers({})).toEqual([]);
  });

  test("two users offering the same item at once: exactly one succeeds and the other is refused with ANOTHERS_OFFER", async () => {
    const { offering } = await setup();
    await expectOneWinner(
      [
        offering.offer({ item: "oct-13-6pm", user: "fionna" }),
        offering.offer({ item: "oct-13-6pm", user: "cake" }),
      ],
      AnothersOffer,
    );
    expect(await offering._openOffers({})).toHaveLength(1);
  });

  test("one user offering the same item twice at once: exactly one succeeds and the other is refused with ALREADY_OFFERED", async () => {
    const { offering } = await setup();
    await expectOneWinner(
      [
        offering.offer({ item: "oct-13-6pm", user: "fionna" }),
        offering.offer({ item: "oct-13-6pm", user: "fionna" }),
      ],
      AlreadyOffered,
    );
    expect(await offering._openOffers({})).toHaveLength(1);
  });

  test("two users claiming the same offer at once: exactly one succeeds and the other is refused with ALREADY_CLAIMED", async () => {
    const { offering } = await setup();
    const { offer } = await offering.offer({ item: "oct-13-6pm", user: "fionna" });
    await expectOneWinner(
      [offering.resolve({ user: "cake", offer }), offering.resolve({ user: "maya", offer })],
      AlreadyClaimed,
    );
    expect(await offering._openOffers({})).toEqual([]);
  });
});