// import { MongoClient } from "mongodb";
// import { withCORS } from "../../../../middleware/cors";

// async function mapCustomerDevice(req) {
//   try {
//     const { deviceId, customers, clientEmail } = await req.json();

//     if (!deviceId || !Array.isArray(customers) || customers.length === 0 || !clientEmail) {
//       return new Response(
//         JSON.stringify({ message: "Device ID, customers, and client email are required" }),
//         { status: 400 }
//       );
//     }

//     const client = await MongoClient.connect(process.env.MONGO_URI);
//     const db = client.db("bb");

//     // Step 1: Find device by its deviceId (string, e.g. "NODE004")
//     const deviceDoc = await db.collection("devices").findOne({ deviceId });
//     if (!deviceDoc) {
//       client.close();
//       return new Response(
//         JSON.stringify({ message: "Device not found" }),
//         { status: 404 }
//       );
//     }

//     // Step 2: Process each customer phone number
//     for (const phoneNumber of customers) {
//       const customerDoc = await db
//         .collection("customers")
//         .findOne({ phoneNumber, clientEmail });

//       if (!customerDoc) continue; // skip if invalid phone or not under this client

//       // Prevent duplicate mapping
//       const exists = await db.collection("customer-device-mapping").findOne({
//         deviceId: deviceDoc.deviceId, // check against string ID
//         phoneNumber: customerDoc.phoneNumber,
//       });

//       if (exists) continue;

//       // Insert mapping
//       await db.collection("customer-device-mapping").insertOne({
//         clientEmail,
//         deviceObjId: deviceDoc._id, // ObjectId for reference
//         deviceId: deviceDoc.deviceId, // ✅ string "NODE004"
//         deviceName: deviceDoc.name || deviceDoc.deviceId,
//         customerId: customerDoc._id,
//         customerName: customerDoc.customerName,
//         phoneNumber: customerDoc.phoneNumber,
//         createdAt: new Date(),
//       });
//     }

//     client.close();

//     return new Response(
//       JSON.stringify({ message: "Customer(s) assigned to device successfully" }),
//       { status: 201 }
//     );
//   } catch (err) {
//     console.error("❌ Error mapping customer to device:", err.message);
//     return new Response(
//       JSON.stringify({ message: "Server error" }),
//       { status: 500 }
//     );
//   }
// }

// export const POST = withCORS(mapCustomerDevice);


// src/app/api/clients/devices/mapp-device/route.js
import { MongoClient } from "mongodb";
import { withCORS } from "../../../../middleware/cors";

async function mapOrRenameDevice(req) {
  try {
    const { deviceId, customers, clientEmail, newName } = await req.json();

    if (!deviceId || !clientEmail) {
      return new Response(
        JSON.stringify({ message: "deviceId and clientEmail are required" }),
        { status: 400 }
      );
    }

    if ((!Array.isArray(customers) || customers.length === 0) && !newName) {
      return new Response(
        JSON.stringify({
          message:
            "Nothing to do: provide newName to rename, customers[] to map, or both",
        }),
        { status: 400 }
      );
    }

    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("bb");

    // 1) Find device by its string deviceId (e.g. "NODE004")
    const deviceDoc = await db.collection("devices").findOne({ deviceId });
    if (!deviceDoc) {
      await client.close();
      return new Response(JSON.stringify({ message: "Device not found" }), {
        status: 404,
      });
    }

    // We'll keep these flags/counters for a nice response body
    let renamed = false;
    let mappedCount = 0;
    let skippedDuplicates = 0;

    // 2) Optional rename
    if (newName && typeof newName === "string" && newName.trim()) {
      const trimmed = newName.trim();

      // Update the canonical device's name (optional but keeps source of truth tidy)
      await db
        .collection("devices")
        .updateOne({ _id: deviceDoc._id }, { $set: { name: trimmed } });

      // Update the name seen by this client in client-device-mapping
      await db.collection("client-device-mapping").updateMany(
        { clientEmail, deviceId: deviceDoc.deviceId },
        { $set: { deviceName: trimmed } }
      );

      renamed = true;
    }

    // 3) Optional mapping of customer phone numbers -> device
    if (Array.isArray(customers) && customers.length > 0) {
      for (const phoneNumber of customers) {
        if (!phoneNumber) continue;

        const customerDoc = await db
          .collection("customers")
          .findOne({ phoneNumber, clientEmail });

        if (!customerDoc) {
          // Skip if the phone doesn't belong to this client or doesn't exist
          continue;
        }

        // Prevent duplicate (deviceId + phoneNumber)
        const exists = await db.collection("customer-device-mapping").findOne({
          deviceId: deviceDoc.deviceId, // string ID
          phoneNumber: customerDoc.phoneNumber,
        });

        if (exists) {
          skippedDuplicates++;
          continue;
        }

        await db.collection("customer-device-mapping").insertOne({
          clientEmail,
          deviceObjId: deviceDoc._id, // ObjectId reference
          deviceId: deviceDoc.deviceId, // string "NODE004"
          deviceName: newName?.trim() || deviceDoc.name || deviceDoc.deviceId,
          customerId: customerDoc._id,
          customerName: customerDoc.customerName,
          phoneNumber: customerDoc.phoneNumber,
          createdAt: new Date(),
        });

        mappedCount++;
      }
    }

    await client.close();

    return new Response(
      JSON.stringify({
        message: "OK",
        renamed,
        mappedCount,
        skippedDuplicates,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Error in mapp-device:", err);
    return new Response(JSON.stringify({ message: "Server error" }), {
      status: 500,
    });
  }
}

export const POST = withCORS(mapOrRenameDevice);
