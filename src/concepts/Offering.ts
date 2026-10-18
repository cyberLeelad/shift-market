import { MongoServerError, type Collection, type Db } from "mongodb";

export class AlreadyOffered extends Error {}
export class AnothersOffer extends Error {}
export class AlreadyClaimed extends Error {}
export class NoSuchOffer extends Error {}

interface Offer {
  _id: string;
  item: string;
  owner: string;
  closed: boolean;
}

export class OfferingConcept {
  private readonly offers: Collection<Offer>;
  private indexed = false;

  constructor(db: Db) {
    this.offers = db.collection<Offer>("offering.offers");
  }

  private async ensureIndex() {
    if (this.indexed) return;
    // At most one open offer per item. Closed offers are excluded, so an item can be offered again after a claim.
    await this.offers.createIndex(
      { item: 1 },
      { unique: true, partialFilterExpression: { closed: false } },
    );
    this.indexed = true;
  }

  async offer({ item, user }: { item: string; user: string }) {
    await this.ensureIndex();
    const offer = crypto.randomUUID();
    for (;;) {
      try {
        await this.offers.insertOne({ _id: offer, item, owner: user, closed: false });
        return { offer };
      } catch (error) {
        if (!(error instanceof MongoServerError && error.code === 11000)) throw error;
      }
      // The index refused the insert, so an open offer exists. Find out whose it is.
      const open = await this.offers.findOne({ item, closed: false });
      if (open) {
        if (open.owner === user) {
          throw new AlreadyOffered("Item is already up for offer by this user.");
        }
        throw new AnothersOffer("Cannot offer an item already offered by another user.");
      }
      // The conflicting offer closed before we looked, so try the insert again.
    }
  }

  async resolve({ offer }: { user: string; offer: string }) {
    // Matching on closed: false makes the check and the close one atomic step.
    const result = await this.offers.updateOne({ _id: offer, closed: false }, { $set: { closed: true } });
    if (result.matchedCount === 1) return {};
    const existing = await this.offers.findOne({ _id: offer });
    if (existing === null) {
      throw new NoSuchOffer("Cannot claim an offer that does not exist.");
    }
    throw new AlreadyClaimed("Cannot claim a closed offer.");
  }

  async _getOffer({ item }: { item: string }) {
    const open = await this.offers.findOne({ item, closed: false }, { projection: { _id: 1 } });
    return open ? [{ offer: open._id }] : [];
  }

  async _openOffers(_input: Record<string, never>) {
    const rows = await this.offers.find({ closed: false }).toArray();
    return rows.map(({ _id }) => ({ offer: _id }));
  }
}