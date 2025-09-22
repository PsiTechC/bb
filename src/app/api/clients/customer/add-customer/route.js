// import { MongoClient } from "mongodb";
// import { withCORS } from "../../../../middleware/cors";
// const { sendWhatsAppTemplateMessage } = require("../../../../../../lib/mqtt/ws");

// async function addCustomer(req) {
//   try {
//     const { phoneNumber, customerName, clientEmail, deviceNames } = await req.json();

//     // optional deviceNames logging (array or string)
//     const names = Array.isArray(deviceNames)
//       ? deviceNames
//       : deviceNames
//       ? [deviceNames]
//       : [];

//     if (!phoneNumber || !customerName || !clientEmail) {
//       return new Response(
//         JSON.stringify({
//           message: "Phone number, customer name, and client email are required",
//         }),
//         { status: 400 }
//       );
//     }

//     const client = await MongoClient.connect(process.env.MONGO_URI);
//     const db = client.db("bb");

//     // prevent duplicate customer (per client)
//     const existing = await db.collection("customers").findOne({
//       phoneNumber,
//       clientEmail,
//     });

//     if (existing) {
//       client.close();
//       return new Response(
//         JSON.stringify({ message: "Customer already exists for this client" }),
//         { status: 409 }
//       );
//     }

//     // insert new customer
//     await db.collection("customers").insertOne({
//       phoneNumber,
//       customerName,
//       clientEmail,
//       createdAt: new Date(),
//     });

//     client.close();

//     // fire-and-forget WhatsApp template send with provided device names
//     if (names.length > 0) {
//       (async () => {
//         try {
//           await sendWhatsAppTemplateMessage(phoneNumber, {
//             deviceNames: names,
//             // no deviceIds/action/accessPoint here; template_name will be inferred by count
//           });
//         } catch (e) {
//           console.error("❌ Failed to send WhatsApp (post-add):", e?.message || e);
//         }
//       })();
//     }

//     return new Response(
//       JSON.stringify({ message: "Customer added successfully" }),
//       { status: 201 }
//     );
//   } catch (err) {
//     console.error("❌ Error adding customer:", err.message);
//     return new Response(JSON.stringify({ message: "Server error" }), {
//       status: 500,
//     });
//   }
// }

// export const POST = withCORS(addCustomer);


import { MongoClient } from "mongodb";
import { withCORS } from "../../../../middleware/cors";
const { sendWhatsAppTemplateMessage } = require("../../../../../../lib/mqtt/ws");

async function addCustomer(req) {
  try {
    const { phoneNumber, customerName, clientEmail, devices } = await req.json();

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

    // prevent duplicate customer (per client)
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

    // insert new customer
    await db.collection("customers").insertOne({
      phoneNumber,
      customerName,
      clientEmail,
      createdAt: new Date(),
    });

    client.close();

    // fire-and-forget WhatsApp template send with provided devices
    if (Array.isArray(devices) && devices.length > 0) {
      const deviceIds = devices.map((d) => d.deviceId).filter(Boolean);
      const deviceNames = devices.map((d) => d.deviceName).filter(Boolean);

      (async () => {
        try {
          await sendWhatsAppTemplateMessage(phoneNumber, {
            deviceIds,
            deviceNames,
            // template_name is inferred by count of deviceNames
          });
        } catch (e) {
          console.error("❌ Failed to send WhatsApp (post-add):", e?.message || e);
        }
      })();
    }

    return new Response(
      JSON.stringify({ message: "Customer added successfully" }),
      { status: 201 }
    );
  } catch (err) {
    console.error("❌ Error adding customer:", err.message);
    return new Response(JSON.stringify({ message: "Server error" }), {
      status: 500,
    });
  }
}

export const POST = withCORS(addCustomer);
