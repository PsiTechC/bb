import { MongoClient, ObjectId } from "mongodb";
import { withCORS } from "../../../../middleware/cors";

async function deleteCustomer(req) {
  try {
    const { _id } = await req.json();

    if (!_id) {
      return new Response(
        JSON.stringify({ message: "Customer _id is required" }),
        { status: 400 }
      );
    }

    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("bb");

    // Delete customer by _id
    const result = await db
      .collection("customers")
      .deleteOne({ _id: new ObjectId(_id) });

    client.close();

    if (result.deletedCount === 0) {
      return new Response(
        JSON.stringify({ message: "Customer not found" }),
        { status: 404 }
      );
    }

    return new Response(
      JSON.stringify({ message: "Customer deleted successfully" }),
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Error deleting customer:", err.message);
    return new Response(
      JSON.stringify({ message: "Server error" }),
      { status: 500 }
    );
  }
}

export const POST = withCORS(deleteCustomer);
