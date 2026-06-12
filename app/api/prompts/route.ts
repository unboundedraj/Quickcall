import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import type { Prompt } from "@/app/components/promptDiaryTypes";

type PromptDoc = {
  _id: ObjectId;
  abbreviation: string;
  description: string;
  fullPrompt: string;
  categoryIds?: string[];
  // legacy field — kept for migration reads only
  categoryId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const COLLECTION_NAME = process.env.MONGODB_PROMPTS_COLLECTION || "prompts";

function getDatabaseName() {
  const dbName = process.env.MONGODB_DB;
  if (!dbName) throw new Error("MONGODB_DB is not set.");
  return dbName;
}

function toPrompt(doc: PromptDoc): Prompt {
  return {
    id: doc._id.toString(),
    abbreviation: doc.abbreviation,
    description: doc.description,
    fullPrompt: doc.fullPrompt,
    // Migrate: old docs have categoryId (single), new ones have categoryIds (array)
    categoryIds:
      doc.categoryIds ??
      (doc.categoryId ? [doc.categoryId] : []),
  };
}

export async function GET() {
  try {
    const client = await clientPromise;
    const collection = client
      .db(getDatabaseName())
      .collection<Omit<PromptDoc, "_id">>(COLLECTION_NAME);

    const docs = await collection.find({}).sort({ createdAt: 1 }).toArray();
    return Response.json(docs.map((doc) => toPrompt(doc as PromptDoc)));
  } catch (error) {
    console.error("Failed to fetch prompts", error);
    return Response.json({ error: "Failed to fetch prompts." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<Prompt>;
    const abbreviation = body.abbreviation?.trim() || "";
    const fullPrompt = body.fullPrompt?.trim() || "";
    const description = body.description?.trim() || abbreviation;

    if (!abbreviation || !fullPrompt) {
      return Response.json(
        { error: "abbreviation and fullPrompt are required." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const collection = client
      .db(getDatabaseName())
      .collection<Omit<PromptDoc, "_id">>(COLLECTION_NAME);

    const now = new Date();
    const result = await collection.insertOne({
      abbreviation,
      description,
      fullPrompt,
      categoryIds: [],
      createdAt: now,
      updatedAt: now,
    });

    return Response.json(
      {
        id: result.insertedId.toString(),
        abbreviation,
        description,
        fullPrompt,
        categoryIds: [],
      } satisfies Prompt,
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create prompt", error);
    return Response.json({ error: "Failed to create prompt." }, { status: 500 });
  }
}
