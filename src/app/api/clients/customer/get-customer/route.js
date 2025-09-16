import { MongoClient } from "mongodb";
import { withCORS } from "../../../../middleware/cors";

async function getCustomers(req) {
  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ message: "Client email is required" }),
        { status: 400 }
      );
    }

    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("bb");

    // Find all customers belonging to this client
    const customers = await db
      .collection("customers")
      .find({ clientEmail: email })
      .project({ customerName: 1, phoneNumber: 1 }) 
      .toArray();

    client.close();

    return new Response(
      JSON.stringify({ customers }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("❌ Error fetching customers:", err.message);
    return new Response(
      JSON.stringify({ message: "Server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export const POST = withCORS(getCustomers);
