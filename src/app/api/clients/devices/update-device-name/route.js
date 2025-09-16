import { MongoClient, ObjectId } from "mongodb";
import { withCORS } from "../../../../middleware/cors";

async function updateDeviceName(req) {
  try {
    const { _id, newName } = await req.json();

    if (!_id || !newName) {
      return new Response(
        JSON.stringify({ message: "Mapping _id and new device name are required" }),
        { status: 400 }
      );
    }

    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("bb");

    // Update device name by mapping _id
    const result = await db.collection("client-device-mapping").updateOne(
      { _id: new ObjectId(_id) },
      { $set: { deviceName: newName } }
    );

    client.close();

    if (result.matchedCount === 0) {
      return new Response(
        JSON.stringify({ message: "Mapping not found" }),
        { status: 404 }
      );
    }

    return new Response(
      JSON.stringify({ message: "Device name updated successfully" }),
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Error updating device name:", err.message);
    return new Response(
      JSON.stringify({ message: "Server error" }),
      { status: 500 }
    );
  }
}

export const POST = withCORS(updateDeviceName);
