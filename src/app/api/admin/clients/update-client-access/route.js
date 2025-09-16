import { MongoClient } from "mongodb";
import { withCORS } from "../../../../middleware/cors";

async function restrictClient(req) {
  try {
    const { email, status } = await req.json();

    if (!email || !["granted", "restricted"].includes(status)) {
      return new Response(
        JSON.stringify({ message: "Email and valid status required" }),
        { status: 400 }
      );
    }

    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("bb");

    // Step 1: Find client
    const existing = await db.collection("clients").findOne({ email });
    if (!existing) {
      client.close();
      return new Response(
        JSON.stringify({ message: "Client not found" }),
        { status: 404 }
      );
    }

    // Step 2: Update status
    await db.collection("clients").updateOne(
      { email },
      { $set: { status } }
    );

    client.close();
    return new Response(
      JSON.stringify({ message: `Client status updated to ${status}` }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Error updating client status:", err.message);
    return new Response(
      JSON.stringify({ message: "Server error" }),
      { status: 500 }
    );
  }
}

export const POST = withCORS(restrictClient);
