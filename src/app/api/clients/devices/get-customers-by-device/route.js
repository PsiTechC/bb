import { MongoClient, ObjectId } from "mongodb";
import { withCORS } from "../../../../middleware/cors";

async function getCustomersByDevice(req) {
  try {
    const { deviceId } = await req.json(); // ✅ expect deviceId instead of deviceObjId

    if (!deviceId) {
      return new Response(
        JSON.stringify({ message: "deviceId is required" }),
        { status: 400 }
      );
    }

    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("bb");

    // ✅ Query using ObjectId(deviceId)
    const mappings = await db
      .collection("customer-device-mapping")
      .find({ deviceObjId: new ObjectId(deviceId) }) // notice: using deviceObjId field in DB
      .project({ customerName: 1, phoneNumber: 1, _id: 0 })
      .toArray();

    client.close();

    return new Response(
      JSON.stringify({ customers: mappings }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("❌ Error fetching customers by device:", err.message);
    return new Response(
      JSON.stringify({ message: "Server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export const POST = withCORS(getCustomersByDevice);
