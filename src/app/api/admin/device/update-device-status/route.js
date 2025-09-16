import { MongoClient } from "mongodb";
import { withCORS } from "../../../../middleware/cors";

async function updateDeviceStatus(req) {
  try {
    const { deviceId, status } = await req.json();

    if (!deviceId || !["active", "inactive"].includes(status)) {
      return new Response(
        JSON.stringify({ message: "Device ID and valid status required" }),
        { status: 400 }
      );
    }

    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("bb");

    // Step 1: Find device
    const existing = await db.collection("devices").findOne({ deviceId });
    if (!existing) {
      client.close();
      return new Response(
        JSON.stringify({ message: "Device not found" }),
        { status: 404 }
      );
    }

    // Step 2: Update status
    await db.collection("devices").updateOne(
      { deviceId },
      { $set: { status } }
    );

    client.close();

    return new Response(
      JSON.stringify({ message: `Device status updated to ${status}` }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Error updating device status:", err.message);
    return new Response(
      JSON.stringify({ message: "Server error" }),
      { status: 500 }
    );
  }
}

export const POST = withCORS(updateDeviceStatus);
