import { MongoClient, ObjectId } from "mongodb";
import { withCORS } from "../../../../middleware/cors";

async function assignDevice(req) {
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

    // Step 1: Find client
    const clientDoc = await db.collection("clients").findOne({ email: clientEmail });
    if (!clientDoc) {
      client.close();
      return new Response(JSON.stringify({ message: "Client not found" }), { status: 404 });
    }

    // Step 2: Find device
    const deviceDoc = await db.collection("devices").findOne({ deviceId });
    if (!deviceDoc) {
      client.close();
      return new Response(JSON.stringify({ message: "Device not found" }), { status: 404 });
    }

    // Step 3: Prevent duplicate mapping
    const exists = await db.collection("client-device-mapping").findOne({
      clientId: clientDoc._id,
      deviceId: deviceDoc.deviceId,
    });

    if (exists) {
      client.close();
      return new Response(
        JSON.stringify({ message: "Mapping already exists" }),
        { status: 409 }
      );
    }

    // Step 4: Insert mapping
    await db.collection("client-device-mapping").insertOne({
      clientId: clientDoc._id,
      clientEmail: clientDoc.email,
      deviceId: deviceDoc.deviceId,
      deviceObjId: deviceDoc._id,
      createdAt: new Date(),
    });

    client.close();
    return new Response(
      JSON.stringify({ message: "Device assigned successfully" }),
      { status: 201 }
    );
  } catch (err) {
    console.error("❌ Error assigning device:", err.message);
    return new Response(
      JSON.stringify({ message: "Server error" }),
      { status: 500 }
    );
  }
}

export const POST = withCORS(assignDevice);
