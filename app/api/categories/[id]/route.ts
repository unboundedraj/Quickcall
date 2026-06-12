import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import type { Category } from "@/app/components/promptDiaryTypes";

const COLLECTION_NAME = process.env.MONGODB_CATEGORIES_COLLECTION || "categories";
const PROMPTS_COLLECTION = process.env.MONGODB_PROMPTS_COLLECTION || "prompts";

type CategoryDoc = {
  _id: ObjectId;
  name: string;
  sortOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
};

function getDatabaseName() {
  const dbName = process.env.MONGODB_DB;
  if (!dbName) throw new Error("MONGODB_DB is not set.");
  return dbName;
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!ObjectId.isValid(id)) {
      return Response.json({ error: "Invalid id." }, { status: 400 });
    }

    const body = (await request.json()) as { name?: string; sortOrder?: number };
    const updates: Partial<{ name: string; sortOrder: number; updatedAt: Date }> = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;

    const client = await clientPromise;
    const collection = client
      .db(getDatabaseName())
      .collection<CategoryDoc>(COLLECTION_NAME);

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return Response.json({ error: "Category not found." }, { status: 404 });
    }

    const updated = await collection.findOne({ _id: new ObjectId(id) });
    if (!updated) {
      return Response.json({ error: "Category not found." }, { status: 404 });
    }

    return Response.json({
      id: updated._id.toString(),
      name: updated.name,
      sortOrder: updated.sortOrder,
    } satisfies Category);
  } catch (error) {
    console.error("Failed to update category", error);
    return Response.json({ error: "Failed to update category." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const expectedPassword = process.env.ADMIN_DELETE_PASSWORD;
    if (!expectedPassword) {
      return Response.json(
        { error: "Delete password not configured." },
        { status: 500 }
      );
    }

    const providedPassword =
      request.headers.get("x-admin-delete-password") || "";
    if (providedPassword !== expectedPassword) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await context.params;

    if (!ObjectId.isValid(id)) {
      return Response.json({ error: "Invalid id." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(getDatabaseName());

    const result = await db
      .collection(COLLECTION_NAME)
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return Response.json({ error: "Category not found." }, { status: 404 });
    }

    // Move prompts from this category back to uncategorized
    await db
      .collection(PROMPTS_COLLECTION)
      .updateMany(
        { categoryId: id },
        { $set: { categoryId: null, updatedAt: new Date() } }
      );

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete category", error);
    return Response.json(
      { error: "Failed to delete category." },
      { status: 500 }
    );
  }
}
