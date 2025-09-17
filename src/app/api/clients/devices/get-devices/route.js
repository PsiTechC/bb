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
      .project({ deviceObjId: 1, deviceId: 1, deviceName: 1 })
      .toArray();

    client.close();

    // Transform deviceObjId → _id in the response
    const devices = mappings.map((m) => ({
      _id: m.deviceObjId,  // ✅ send deviceObjId as _id
      deviceId: m.deviceId,
      deviceName: m.deviceName,
    }));

    return new Response(
      JSON.stringify({ devices }),
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
