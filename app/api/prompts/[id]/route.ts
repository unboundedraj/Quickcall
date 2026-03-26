import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

const COLLECTION_NAME = process.env.MONGODB_PROMPTS_COLLECTION || "prompts";

function getDatabaseName() {
  const dbName = process.env.MONGODB_DB;
  if (!dbName) {
    throw new Error("MONGODB_DB is not set. Add it to your environment variables.");
  }
  return dbName;
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const expectedPassword = process.env.ADMIN_DELETE_PASSWORD;
    if (!expectedPassword) {
      console.error("ADMIN_DELETE_PASSWORD is not configured.");
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
    const collection = client
      .db(getDatabaseName())
      .collection(COLLECTION_NAME);

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
