import { MongoClient } from "mongodb";
import { withCORS } from "../../../../middleware/cors";

async function getDevices(req) {
  try {
    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("bb");

    const devices = await db
      .collection("devices")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    client.close();

    return new Response(
      JSON.stringify({ devices }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error fetching devices:", err.message);
    return new Response(
      JSON.stringify({ message: "Server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export const GET = withCORS(getDevices);
