require("dotenv").config({ path: ".env.local" });
const { MongoClient } = require("mongodb");
const { sendDeviceCommandOnceAck } = require("./mqttCommand");
const { findDevicesByPhonefn } = require("./findDevicesByPhonefn");
const {sendWhatsAppGetLink} = require('./sendWhatsAppGetLink')

const uri = process.env.MONGO_URI_WS;
const dbName = process.env.DB_NAME_WS || "chatbot";
const collectionName = "whatsappresponses";

const bbUri = process.env.MONGO_URI;
const bbDbName = "bb";

function parseRaw(raw) {
  if (!raw) return null;
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}
const isFlowUnused = (o) => o && o.flow_token === "unused";

const getSelectedAction = (o) =>
  o?.screen_0_Select_an_action_0 || o?.screen_0_Select_an_Action_1 ||  o?.screen_0_Select_an_Action_0;

const getSelectedAccessPoint = (o) =>
  o?.screen_0_Select_an_Access_Point_0 || null;

async function startWatcher() {
  if (!uri) {
    console.error("❌ Missing MONGODB_URI_WS in env");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  console.log("✅ Connected to MongoDB");

  const db = client.db(dbName);
  const coll = db.collection(collectionName);

  const pipeline = [
    { $match: { operationType: { $in: ["insert", "update", "replace"] } } },
  ];
  const changeStream = coll.watch(pipeline, { fullDocument: "updateLookup" });

  changeStream.on("change", async (change) => {
    const doc = change.fullDocument;
    if (!doc) return;

    const rawObj = parseRaw(doc.raw_response_json);
    const action = getSelectedAction(rawObj);
    const accessPoint = getSelectedAccessPoint(rawObj);

    if (!action) return;
    if (!isFlowUnused(rawObj)) return;

    console.log("🆔 Context Message Info:", {
      context_message_id: doc.context_message_id,
      action,
      access_point: accessPoint,
    });

    let client2;
    try {
      // 🔹 Lookup in customer_send_ws_response by context_message_id
      client2 = new MongoClient(bbUri);
      await client2.connect();
      const db2 = client2.db(bbDbName);

      const wsDoc = await db2
        .collection("customer_send_ws_response")
        .findOne({ whatsapp_message_id: doc.context_message_id });

      if (wsDoc && wsDoc.deviceIds && wsDoc.deviceIds.length > 0) {
        let selectedDeviceId = null;

            if (accessPoint) {
              // Use accessPoint index if available
              const idx = parseInt(accessPoint.split("_")[0], 10);
              selectedDeviceId =
                !isNaN(idx) && idx < wsDoc.deviceIds.length
                  ? wsDoc.deviceIds[idx]
                  : null;
            } else {
              // If no accessPoint, default to first device
              selectedDeviceId = wsDoc.deviceIds[0];
            }

        if (!selectedDeviceId) {
          console.warn("⚠️ No valid selectedDeviceId found");
        } else {
          console.log("📦 Matched Device from ws_response DB:", {
            selectedDeviceId,
            allDeviceIds: wsDoc.deviceIds,
          });

          // 🔹 Immediately call findDevicesByPhonefn
          if (wsDoc.phoneNumber) {
            findDevicesByPhonefn(wsDoc.phoneNumber).catch((err) =>
              console.error("❌ Error in findDevicesByPhonefn:", err.message)
            );
          }

          // 🔹 Fire MQTT command but don’t block
          (async () => {
            try {
              let ack = false;
              if (action === "0_Open") {
                ack = await sendDeviceCommandOnceAck(
                  selectedDeviceId,
                  "start",
                  120000
                );
              } else if (action === "1_Close") {
                ack = await sendDeviceCommandOnceAck(
                  selectedDeviceId,
                  "stop",
                  120000
                );
              } else if (action === "2_Get_Link") {
                ack = await sendDeviceCommandOnceAck(
                  selectedDeviceId,
                  "getip",
                  120000
                );
              }
              if (typeof ack === "string" && ack.startsWith("ACK:")) {
                const parts = ack.split(":");
                const ip = parts[4]; // e.g., 192.168.1.69
                if (ip) {
                  console.log(`🌐 Device ${selectedDeviceId} returned IP: ${ip}`);
                  try {
                    await sendWhatsAppGetLink(ip, wsDoc.phoneNumber);
                  } catch (err) {
                    console.error("❌ Failed to send WhatsApp GetLink:", err.message);
                  }
                }
              }
              console.log("📡 MQTT Command Result:", {
                context_message_id: doc.context_message_id,
                action,
                access_point: accessPoint,
                selectedDeviceId,
                ack,
              });
            } catch (err) {
              console.error("❌ Error running MQTT command:", err.message);
            }
          })();
        }

        // 🔹 Delete the wsDoc regardless of ack
        await db2
          .collection("customer_send_ws_response")
          .deleteOne({ whatsapp_message_id: doc.context_message_id });
        console.log(
          `🗑️ Deleted wsDoc for context_message_id: ${doc.context_message_id}`
        );
      } else {
        console.warn("⚠️ No matching wsDoc or deviceIds found in ws DB");
      }
    } catch (err) {
      console.error(
        "❌ Error during device lookup / command run:",
        err.message
      );
    } finally {
      if (client2) await client2.close();
    }
  });
}

if (require.main === module) {
  startWatcher().catch((err) => {
    console.error("❌ Failed to start watcher:", err);
    process.exit(1);
  });
}

module.exports = { startWatcher };
