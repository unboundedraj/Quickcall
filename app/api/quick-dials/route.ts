import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import type { QuickDial } from "@/app/components/quickDialTypes";

type QuickDialDoc = {
  _id: ObjectId;
  abbreviation: string;
  description: string;
  url: string;
  createdAt: Date;
  updatedAt: Date;
};

const COLLECTION_NAME = process.env.MONGODB_QUICK_DIALS_COLLECTION || "quick_dials";

function getDatabaseName() {
  const dbName = process.env.MONGODB_DB;
  if (!dbName) {
    throw new Error("MONGODB_DB is not set. Add it to your environment variables.");
  }
  return dbName;
}

function isValidHttpUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function toQuickDial(doc: QuickDialDoc): QuickDial {
  return {
    id: doc._id.toString(),
    abbreviation: doc.abbreviation,
    description: doc.description,
    url: doc.url,
  };
}

export async function GET() {
  try {
    const client = await clientPromise;
    const collection = client
      .db(getDatabaseName())
      .collection<Omit<QuickDialDoc, "_id">>(COLLECTION_NAME);

    const docs = await collection.find({}).sort({ createdAt: -1 }).toArray();

    return Response.json(docs.map((doc) => toQuickDial(doc as QuickDialDoc)));
  } catch (error) {
    console.error("Failed to fetch quick dials", error);
    return Response.json({ error: "Failed to fetch quick dials." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<QuickDial>;
    const abbreviation = body.abbreviation?.trim() || "";
    const description = body.description?.trim() || "";
    const url = body.url?.trim() || "";

    if (!url) {
      return Response.json({ error: "url is required." }, { status: 400 });
    }

    if (!isValidHttpUrl(url)) {
      return Response.json(
        { error: "url must start with http:// or https:// and be valid." },
        { status: 400 }
      );
    }

    const now = new Date();

    const client = await clientPromise;
    const collection = client
      .db(getDatabaseName())
      .collection<Omit<QuickDialDoc, "_id">>(COLLECTION_NAME);

    const result = await collection.insertOne({
      abbreviation,
      description,
      url,
      createdAt: now,
      updatedAt: now,
    });

    return Response.json(
      {
        id: result.insertedId.toString(),
        abbreviation,
        description,
        url,
      } satisfies QuickDial,
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create quick dial", error);
    return Response.json({ error: "Failed to create quick dial." }, { status: 500 });
  }
}
