import { MongoClient } from "mongodb";
import { withCORS } from "../../../../middleware/cors";

async function getClients(req) {
  try {
    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("bb");

    // Fetch all clients (excluding password)
    const clients = await db
      .collection("clients")
      .find({ role: "client" }, { projection: { password: 0 } })
      .toArray();

    client.close();

    return new Response(
      JSON.stringify({ clients }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error fetching clients:", err.message);
    return new Response(
      JSON.stringify({ message: "Server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export const GET = withCORS(getClients);
