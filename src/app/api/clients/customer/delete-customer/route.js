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

    // Delete from customers collection
    const result = await db
      .collection("customers")
      .deleteOne({ _id: new ObjectId(_id) });

    // Also delete from customer-device-mapping where customerId matches
    const mappingResult = await db
      .collection("customer-device-mapping")
      .deleteMany({ customerId: new ObjectId(_id) });

    client.close();

    if (result.deletedCount === 0) {
      return new Response(
        JSON.stringify({ message: "Customer not found" }),
        { status: 404 }
      );
    }

    return new Response(
      JSON.stringify({
        message: "Customer and related device mappings deleted successfully",
        deletedCustomer: result.deletedCount,
        deletedMappings: mappingResult.deletedCount,
      }),
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
