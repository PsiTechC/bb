import { MongoClient } from "mongodb";
import { withCORS } from "../../../../middleware/cors";

async function getMappings(req) {
  try {
    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("bb");

    // Fetch mappings
    const mappings = await db
      .collection("client-device-mapping")
      .aggregate([
        {
          $lookup: {
            from: "clients",
            localField: "clientId",
            foreignField: "_id",
            as: "clientInfo",
          },
        },
        {
          $lookup: {
            from: "devices",
            localField: "deviceObjId",
            foreignField: "_id",
            as: "deviceInfo",
          },
        },
        {
          $project: {
            _id: 0,
            clientEmail: 1,
            deviceId: 1,
            clientName: { $arrayElemAt: ["$clientInfo.name", 0] },
            deviceName: { $arrayElemAt: ["$deviceInfo.name", 0] },
          },
        },
      ])
      .toArray();

    client.close();

    return new Response(
      JSON.stringify({ mappings }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("❌ Error fetching mappings:", err.message);
    return new Response(
      JSON.stringify({ message: "Server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export const GET = withCORS(getMappings);
