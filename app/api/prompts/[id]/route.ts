import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import type { Prompt } from "@/app/components/promptDiaryTypes";

const COLLECTION_NAME = process.env.MONGODB_PROMPTS_COLLECTION || "prompts";

type PromptDoc = {
  _id: ObjectId;
  abbreviation: string;
  description: string;
  fullPrompt: string;
  categoryIds?: string[];
  categoryId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

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
    categoryIds:
      doc.categoryIds ??
      (doc.categoryId ? [doc.categoryId] : []),
  };
}

// Edit full prompt text
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!ObjectId.isValid(id)) {
      return Response.json({ error: "Invalid prompt id." }, { status: 400 });
    }

    const body = (await request.json()) as Partial<Prompt>;
    const fullPrompt = body.fullPrompt?.trim() || "";
    if (!fullPrompt) {
      return Response.json({ error: "fullPrompt is required." }, { status: 400 });
    }

    const client = await clientPromise;
    const collection = client.db(getDatabaseName()).collection<PromptDoc>(COLLECTION_NAME);
    const _id = new ObjectId(id);

    const result = await collection.updateOne(
      { _id },
      { $set: { fullPrompt, updatedAt: new Date() } }
    );
    if (result.matchedCount === 0) {
      return Response.json({ error: "Prompt not found." }, { status: 404 });
    }

    const updated = await collection.findOne({ _id });
    if (!updated) return Response.json({ error: "Prompt not found." }, { status: 404 });

    return Response.json(toPrompt(updated));
  } catch (error) {
    console.error("Failed to update prompt", error);
    return Response.json({ error: "Failed to update prompt." }, { status: 500 });
  }
}

// Update category membership
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!ObjectId.isValid(id)) {
      return Response.json({ error: "Invalid prompt id." }, { status: 400 });
    }

    const body = (await request.json()) as { categoryIds?: string[] };
    if (!Array.isArray(body.categoryIds)) {
      return Response.json({ error: "categoryIds array is required." }, { status: 400 });
    }

    const client = await clientPromise;
    const collection = client.db(getDatabaseName()).collection<PromptDoc>(COLLECTION_NAME);
    const _id = new ObjectId(id);

    const result = await collection.updateOne(
      { _id },
      { $set: { categoryIds: body.categoryIds, updatedAt: new Date() } }
    );
    if (result.matchedCount === 0) {
      return Response.json({ error: "Prompt not found." }, { status: 404 });
    }

    const updated = await collection.findOne({ _id });
    if (!updated) return Response.json({ error: "Prompt not found." }, { status: 404 });

    return Response.json(toPrompt(updated));
  } catch (error) {
    console.error("Failed to patch prompt", error);
    return Response.json({ error: "Failed to update prompt." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const expectedPassword = process.env.ADMIN_DELETE_PASSWORD;
    if (!expectedPassword) {
      return Response.json({ error: "Delete password is not configured." }, { status: 500 });
    }

    const providedPassword = request.headers.get("x-admin-delete-password") || "";
    if (providedPassword !== expectedPassword) {
      return Response.json({ error: "Unauthorized delete attempt." }, { status: 401 });
    }

    const { id } = await context.params;
    if (!ObjectId.isValid(id)) {
      return Response.json({ error: "Invalid prompt id." }, { status: 400 });
    }

    const client = await clientPromise;
    const collection = client.db(getDatabaseName()).collection<PromptDoc>(COLLECTION_NAME);
    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return Response.json({ error: "Prompt not found." }, { status: 404 });
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete prompt", error);
    return Response.json({ error: "Failed to delete prompt." }, { status: 500 });
  }
}
