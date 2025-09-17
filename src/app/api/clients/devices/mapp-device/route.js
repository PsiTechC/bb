import { MongoClient } from "mongodb";
import { withCORS } from "../../../../middleware/cors";

async function mapCustomerDevice(req) {
  try {
    const { deviceId, customers, clientEmail } = await req.json();

    if (!deviceId || !Array.isArray(customers) || customers.length === 0 || !clientEmail) {
      return new Response(
        JSON.stringify({ message: "Device ID, customers, and client email are required" }),
        { status: 400 }
      );
    }

    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("bb");

    // Step 1: Find device by its deviceId (string, e.g. "NODE004")
    const deviceDoc = await db.collection("devices").findOne({ deviceId });
    if (!deviceDoc) {
      client.close();
      return new Response(
        JSON.stringify({ message: "Device not found" }),
        { status: 404 }
      );
    }

    // Step 2: Process each customer phone number
    for (const phoneNumber of customers) {
      const customerDoc = await db
        .collection("customers")
        .findOne({ phoneNumber, clientEmail });

      if (!customerDoc) continue; // skip if invalid phone or not under this client

      // Prevent duplicate mapping
      const exists = await db.collection("customer-device-mapping").findOne({
        deviceId: deviceDoc.deviceId, // check against string ID
        phoneNumber: customerDoc.phoneNumber,
      });

      if (exists) continue;

      // Insert mapping
      await db.collection("customer-device-mapping").insertOne({
        clientEmail,
        deviceObjId: deviceDoc._id, // ObjectId for reference
        deviceId: deviceDoc.deviceId, // ✅ string "NODE004"
        deviceName: deviceDoc.name || deviceDoc.deviceId,
        customerId: customerDoc._id,
        customerName: customerDoc.customerName,
        phoneNumber: customerDoc.phoneNumber,
        createdAt: new Date(),
      });
    }

    client.close();

    return new Response(
      JSON.stringify({ message: "Customer(s) assigned to device successfully" }),
      { status: 201 }
    );
  } catch (err) {
    console.error("❌ Error mapping customer to device:", err.message);
    return new Response(
      JSON.stringify({ message: "Server error" }),
      { status: 500 }
    );
  }
}

export const POST = withCORS(mapCustomerDevice);
