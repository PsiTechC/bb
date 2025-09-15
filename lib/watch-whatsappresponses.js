// watch-whatsappresponses.js
require("dotenv").config({ path: ".env.local" });
const { MongoClient } = require("mongodb");
const {
  sendDeviceCommandOnceAck,
  sendDeviceCommandDoubleAck,
} = require("./mqttCommand");
const { sendWhatsAppTemplateMessage } = require("./ws");

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
const dbName = process.env.DB_NAME || "chatbot";
const collectionName = "whatsappresponses";

function parseRaw(raw) {
  if (!raw) return null;
  try { return typeof raw === "string" ? JSON.parse(raw) : raw; }
  catch { return null; }
}
const isFlowUnused = (o) => o && o.flow_token === "unused";
const getSelectedAction = (o) => o?.screen_0_Select_an_action_0; 

async function startWatcher() {
  if (!uri) {
    console.error("❌ Missing MONGODB_URI/MONGO_URI in env");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  console.log("✅ Connected to MongoDB");

  const db = client.db(dbName);
  const coll = db.collection(collectionName);

  const pipeline = [{ $match: { operationType: { $in: ["insert", "update", "replace"] } } }];
  const changeStream = coll.watch(pipeline, { fullDocument: "updateLookup" });

  changeStream.on("change", async (change) => {
    const doc = change.fullDocument;
    if (!doc) return;

    const rawObj = parseRaw(doc.raw_response_json);
    if (!isFlowUnused(rawObj)) return;

    const action = getSelectedAction(rawObj);
    if (!action) return;

    const notifyNumber = `+${doc.customer_number}`;

    console.log("📩 Matched flow:", {
      _id: doc._id?.toString?.(),
      customer_number: notifyNumber,
      action_selected: action,
      at: doc.timestamp,
    });

    try {
      if (action === "0_Start") {
        // Send twice; wait for the SECOND ACK, then notify on WhatsApp
        const ack = await sendDeviceCommandOnceAck("NODE001", "start", 120000);
        if (ack) await sendWhatsAppTemplateMessage(notifyNumber);
        else console.warn("⚠️ No second ACK received; skipping WhatsApp notify");
      } else if (action === "1_Stop") {
        // Send once; wait for ACK, then notify
        const ack = await sendDeviceCommandOnceAck("NODE001", "stop", 120000);
        if (ack) await sendWhatsAppTemplateMessage(notifyNumber);
        else console.warn("⚠️ No ACK received; skipping WhatsApp notify");
      } else if (action === "2_Ped") {
        // Ped: send once; wait for ACK, then notify
        const ack = await sendDeviceCommandOnceAck("NODE001", "ped", 120000);
        if (ack) await sendWhatsAppTemplateMessage(notifyNumber);
        else console.warn("⚠️ No ACK received; skipping WhatsApp notify");
      } else {
        console.log("ℹ️ Unhandled action:", action);
      }
    } catch (e) {
      console.error("❌ Failure in command/notify flow:", e?.response?.data || e?.message || e);
    }
  });

  changeStream.on("error", (err) => console.error("⚠️ Change stream error:", err));

  process.on("SIGINT", async () => {
    console.log("👋 Closing watcher...");
    try { await changeStream.close(); } catch { }
    try { await client.close(); } catch { }
    process.exit(0);
  });
}

if (require.main === module) {
  startWatcher().catch((err) => {
    console.error("❌ Failed to start watcher:", err);
    process.exit(1);
  });
}

module.exports = { startWatcher };
