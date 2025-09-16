import { MongoClient } from "mongodb";
import { withCORS } from "../../../../middleware/cors";

async function getDevicesByClient(req) {
  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ message: "Client email is required" }),
        { status: 400 }
      );
    }

    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("bb");

    // Find all mappings for the given client email
    const mappings = await db
      .collection("client-device-mapping")
      .find({ clientEmail: email })
      .project({ deviceName: 1 }) // include deviceName, keep _id
      .toArray();

    client.close();

    // Response: array of { _id, deviceName }
    return new Response(
      JSON.stringify({ devices: mappings }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("❌ Error fetching devices by client:", err.message);
    return new Response(
      JSON.stringify({ message: "Server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export const POST = withCORS(getDevicesByClient);
