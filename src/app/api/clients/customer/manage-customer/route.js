import { MongoClient } from "mongodb";
import { withCORS } from "../../../../middleware/cors";
import { sendWhatsAppInvitation } from "../../../../../../lib/whatsapp/gate-operation";

async function addCustomer(req) {
  try {
    const { phoneNumber, customerName, clientEmail } = await req.json();

    if (!phoneNumber || !customerName || !clientEmail) {
      return new Response(
        JSON.stringify({
          message: "Phone number, customer name, and client email are required",
        }),
        { status: 400 }
      );
    }

    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("bb");

    // ✅ Prevent duplicate customer for the same client by phone number
    const existing = await db.collection("customers").findOne({
      phoneNumber,
      clientEmail,
    });

    if (existing) {
      client.close();
      return new Response(
        JSON.stringify({ message: "Customer already exists for this client" }),
        { status: 409 }
      );
    }

    // ✅ Step 1: Send WhatsApp invitation before saving
    try {
      await sendWhatsAppInvitation(phoneNumber, customerName);
    } catch (err) {
      client.close();
      console.error("❌ Failed to send WhatsApp invitation:", err.message);
      return new Response(
        JSON.stringify({ message: "Failed to send WhatsApp invitation" }),
        { status: 502 }
      );
    }

    // ✅ Step 2: Insert new customer in DB
    await db.collection("customers").insertOne({
      phoneNumber,
      customerName,
      clientEmail,
      createdAt: new Date(),
    });

    client.close();

    return new Response(
      JSON.stringify({ message: "Customer added successfully" }),
      { status: 201 }
    );
  } catch (err) {
    console.error("❌ Error adding customer:", err.message);
    return new Response(
      JSON.stringify({ message: "Server error" }),
      { status: 500 }
    );
  }
}

export const POST = withCORS(addCustomer);


