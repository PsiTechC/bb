import { MongoClient } from "mongodb";
import { withCORS } from "../../../../middleware/cors";

async function unassignDevice(req) {
  try {
    const { clientEmail, deviceId } = await req.json();

    if (!clientEmail || !deviceId) {
      return new Response(
        JSON.stringify({ message: "Client email and Device ID are required" }),
        { status: 400 }
      );
    }

    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("bb");

    // Step 1: Check if mapping exists
    const mapping = await db.collection("client-device-mapping").findOne({
      clientEmail,
      deviceId,
    });

    if (!mapping) {
      client.close();
      return new Response(
        JSON.stringify({ message: "Mapping not found" }),
        { status: 404 }
      );
    }

    // Step 2: Delete mapping
    await db.collection("client-device-mapping").deleteOne({
      clientEmail,
      deviceId,
    });

    client.close();

    return new Response(
      JSON.stringify({ message: "Device unassigned successfully" }),
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Error unassigning device:", err.message);
    return new Response(
      JSON.stringify({ message: "Server error" }),
      { status: 500 }
    );
  }
}

export const POST = withCORS(unassignDevice);
