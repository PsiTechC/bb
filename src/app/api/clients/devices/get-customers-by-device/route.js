// import { MongoClient, ObjectId } from "mongodb";
// import { withCORS } from "../../../../middleware/cors";

// async function getCustomersByDevice(req) {
//   try {
//     const { deviceId } = await req.json(); // ✅ expect deviceId instead of deviceObjId

//     if (!deviceId) {
//       return new Response(
//         JSON.stringify({ message: "deviceId is required" }),
//         { status: 400 }
//       );
//     }

//     const client = await MongoClient.connect(process.env.MONGO_URI);
//     const db = client.db("bb");

//     // ✅ Query using ObjectId(deviceId)
//     const mappings = await db
//       .collection("customer-device-mapping")
//       .find({ deviceObjId: new ObjectId(deviceId) }) // notice: using deviceObjId field in DB
//       .project({ customerName: 1, phoneNumber: 1, _id: 0, customerId: 1, })
//       .toArray();

//     client.close();

//     return new Response(
//       JSON.stringify({ customers: mappings }),
//       { status: 200, headers: { "Content-Type": "application/json" } }
//     );
//   } catch (err) {
//     console.error("❌ Error fetching customers by device:", err.message);
//     return new Response(
//       JSON.stringify({ message: "Server error" }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }

// export const POST = withCORS(getCustomersByDevice);


import { MongoClient, ObjectId } from "mongodb";
import { withCORS } from "../../../../middleware/cors";

async function customerDeviceHandler(req) {
  try {
    const { action, deviceId, _id } = await req.json();

    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("bb");

    if (action === "get") {
      if (!deviceId) {
        client.close();
        return new Response(
          JSON.stringify({ message: "deviceId is required" }),
          { status: 400 }
        );
      }

      // ✅ Query by deviceObjId
      const mappings = await db
        .collection("customer-device-mapping")
        .find({ deviceObjId: new ObjectId(deviceId) })
        .project({
          customerName: 1,
          phoneNumber: 1,
          customerId: 1,
        })
        .toArray();

      client.close();

      return new Response(
        JSON.stringify({ customers: mappings }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (action === "remove") {
      if (!_id) {
        client.close();
        return new Response(
          JSON.stringify({ message: "Mapping _id is required" }),
          { status: 400 }
        );
      }

      // ✅ Delete mapping by _id
      const result = await db
        .collection("customer-device-mapping")
        .deleteOne({ _id: new ObjectId(_id) });

      client.close();

      if (result.deletedCount === 0) {
        return new Response(
          JSON.stringify({ message: "Customer-device mapping not found" }),
          { status: 404 }
        );
      }

      return new Response(
        JSON.stringify({
          message: "Customer-device mapping deleted successfully",
          deletedMappings: result.deletedCount,
        }),
        { status: 200 }
      );
    }

    client.close();
    return new Response(
      JSON.stringify({ message: "Invalid action. Use 'get' or 'remove'." }),
      { status: 400 }
    );
  } catch (err) {
    console.error("❌ Error in customerDeviceHandler:", err.message);
    return new Response(
      JSON.stringify({ message: "Server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export const POST = withCORS(customerDeviceHandler);
