import { MongoClient } from "mongodb";
import { withCORS } from "../../../../middleware/cors";

async function addDevice(req) {
  try {
    const { deviceId, name, description } = await req.json();

    if (!deviceId || !name) {
      return new Response(
        JSON.stringify({ message: "Device ID and Name are required" }),
        { status: 400 }
      );
    }

    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("bb");

    // Step 1: Prevent duplicate deviceId
    const exists = await db.collection("devices").findOne({ deviceId });
    if (exists) {
      client.close();
      return new Response(
        JSON.stringify({ message: "Device ID already exists" }),
        { status: 409 }
      );
    }

    // Step 2: Insert device
    await db.collection("devices").insertOne({
      deviceId,
      name,
      description: description || "",
      createdAt: new Date(),
    });

    client.close();

    return new Response(
      JSON.stringify({ message: "Device created successfully" }),
      { status: 201 }
    );
  } catch (err) {
    console.error("Error adding device:", err.message);
    return new Response(
      JSON.stringify({ message: "Server error" }),
      { status: 500 }
    );
  }
}

export const POST = withCORS(addDevice);
