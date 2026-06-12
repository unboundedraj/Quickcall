import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import type { Category } from "@/app/components/promptDiaryTypes";

const COLLECTION_NAME = process.env.MONGODB_CATEGORIES_COLLECTION || "categories";

type CategoryDoc = {
  _id: ObjectId;
  name: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

function getDatabaseName() {
  const dbName = process.env.MONGODB_DB;
  if (!dbName) throw new Error("MONGODB_DB is not set.");
  return dbName;
}

function toCategory(doc: CategoryDoc): Category {
  return {
    id: doc._id.toString(),
    name: doc.name,
    sortOrder: doc.sortOrder,
  };
}

export async function GET() {
  try {
    const client = await clientPromise;
    const collection = client
      .db(getDatabaseName())
      .collection<Omit<CategoryDoc, "_id">>(COLLECTION_NAME);

    const docs = await collection
      .find({})
      .sort({ sortOrder: 1, createdAt: 1 })
      .toArray();

    return Response.json(docs.map((doc) => toCategory(doc as CategoryDoc)));
  } catch (error) {
    console.error("Failed to fetch categories", error);
    return Response.json({ error: "Failed to fetch categories." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string };
    const name = body.name?.trim() || "";

    if (!name) {
      return Response.json({ error: "name is required." }, { status: 400 });
    }

    const client = await clientPromise;
    const collection = client
      .db(getDatabaseName())
      .collection<Omit<CategoryDoc, "_id">>(COLLECTION_NAME);

    const lastDocs = await collection
      .find({})
      .sort({ sortOrder: -1 })
      .limit(1)
      .toArray();

    const sortOrder =
      lastDocs.length > 0 ? (lastDocs[0] as CategoryDoc).sortOrder + 1 : 0;

    const now = new Date();
    const result = await collection.insertOne({
      name,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    });

    return Response.json(
      { id: result.insertedId.toString(), name, sortOrder } satisfies Category,
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create category", error);
    return Response.json({ error: "Failed to create category." }, { status: 500 });
  }
}
