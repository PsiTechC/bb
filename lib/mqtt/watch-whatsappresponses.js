// require("dotenv").config({ path: ".env.local" });
// const { MongoClient } = require("mongodb");
// const {
//   sendDeviceCommandOnceAck,
// } = require("./mqttCommand");
// const { sendWhatsAppTemplateMessage } = require("./ws");

// const uri = process.env.MONGO_URI_WS || process.env.MONGO_URI_WS;
// const dbName = process.env.DB_NAME_WS || "chatbot";
// const collectionName = "whatsappresponses";


// const bbUri = process.env.MONGO_URI;
// const bbDbName = "bb";
// const mappingCollection = "customer-device-mapping";

// async function findDevicesByPhone(phoneNumber) {
//   if (!bbUri) {
//     console.error("❌ Missing MONGO_URI for bb lookup");
//     return [];
//   }

//   // 🔹 Normalize: keep only last 10 digits
//   const normalizedNumber = phoneNumber.replace(/\D/g, "");
//   const last10 = normalizedNumber.slice(-10);

//   console.log("🔍 Lookup started:", { original: phoneNumber, normalizedNumber, last10 });

//   const client = new MongoClient(bbUri);
//   try {
//     await client.connect();
//     const db = client.db(bbDbName);

//     const mappings = await db
//       .collection(mappingCollection)
//       .find({ phoneNumber: last10 })
//       .toArray();

//     if (mappings.length > 0) {
//       console.log("✅ Mappings found:", mappings.map(m => ({
//         deviceId: m.deviceId,
//         deviceName: m.deviceName
//       })));
//     } else {
//       console.warn("⚠️ No mappings found for:", last10);
//     }

//     return mappings.map(m => ({
//       deviceId: m.deviceId,
//       deviceName: m.deviceName
//     }));
//   } catch (err) {
//     console.error("❌ Error finding devices:", err.message);
//     return [];
//   } finally {
//     await client.close();
//   }
// }






// function parseRaw(raw) {
//   if (!raw) return null;
//   try {
//     return typeof raw === "string" ? JSON.parse(raw) : raw;
//   } catch {
//     return null;
//   }
// }
// const isFlowUnused = (o) => o && o.flow_token === "unused";

// // ✅ Extract action and access point separately
// const getSelectedAction = (o) => {
//   return (
//     o?.screen_0_Select_an_action_0 || // old format
//     o?.screen_0_Select_an_Action_1    // new format
//   );
// };

// const getSelectedAccessPoint = (o) => {
//   return (
//     o?.screen_0_Select_an_Access_Point_0 || null
//   );
// };

// async function startWatcher() {
//   if (!uri) {
//     console.error("❌ Missing MONGODB_URI/MONGO_URI in env");
//     process.exit(1);
//   }

//   const client = new MongoClient(uri);
//   await client.connect();
//   console.log("✅ Connected to MongoDB");

//   const db = client.db(dbName);
//   const coll = db.collection(collectionName);

//   const pipeline = [
//     { $match: { operationType: { $in: ["insert", "update", "replace"] } } }
//   ];
//   const changeStream = coll.watch(pipeline, { fullDocument: "updateLookup" });

//   changeStream.on("change", async (change) => {
//     const doc = change.fullDocument;
//     if (!doc) return;

//     const rawObj = parseRaw(doc.raw_response_json);
//     if (!isFlowUnused(rawObj)) return;

//     const action = getSelectedAction(rawObj);
//     const accessPoint = getSelectedAccessPoint(rawObj);

//     if (!action) return;

//     const rawNumber = doc.customer_number.replace(/^\+91/, "").trim();
//     const notifyNumber = `+${doc.customer_number}`;

//     // ✅ Log both action + access point
//     console.log("📩 Matched flow:", {
//       _id: doc._id?.toString?.(),
//       customer_number: notifyNumber,
//       action_selected: action,
//       access_point: accessPoint,
//       at: doc.timestamp,
//     });

//     try {
//       const devices = await findDevicesByPhone(rawNumber);
//       if (devices.length === 0) {
//         console.warn("⚠️ No devices found for number:", rawNumber);
//         return;
//       }

//       // Extract arrays of names + ids
//       const deviceNames = devices.map(d => d.deviceName);
//       const deviceIds = devices.map(d => d.deviceId);

//       console.log("📦 Devices linked:", { deviceNames, deviceIds });

//       // 🔹 Send them to WhatsApp and capture the chosen device + action
//       const { selectedDeviceId, action: selectedAction } = await sendWhatsAppTemplateMessage(notifyNumber, {
//         parameters: [
//           JSON.stringify({ deviceNames, deviceIds, action, accessPoint })
//         ],
//       });

//       if (selectedDeviceId && selectedAction) {
//         console.log(`🎯 Running command for selected device: ${selectedDeviceId} with action: ${selectedAction}`);
//         let ack = false;

//         if (selectedAction === "0_Open") {
//           ack = await sendDeviceCommandOnceAck(selectedDeviceId, "start", 12000);
//         } else if (selectedAction === "1_Close") {
//           ack = await sendDeviceCommandOnceAck(selectedDeviceId, "stop", 12000);
//         } else if (selectedAction === "2_Get_Link") {
//           ack = await sendDeviceCommandOnceAck(selectedDeviceId, "getip", 12000);

//           if (typeof ack === "string" && ack.startsWith("ACK:")) {
//             const parts = ack.split(":");
//             const ip = parts[4];
//             if (ip) {
//               const link = `http://${ip}`;
//               console.log(`🌐 Device ${selectedDeviceId} webpage link:`, link);

//               await sendWhatsAppTemplateMessage(notifyNumber, {
//                 template_name: "bb_operation_get_link_v1",
//                 parameters: [link],
//               });
//             }
//           }
//         }

//         console.log(`📡 Processed ${selectedDeviceId}, ack=${ack}`);
//       } else {
//         console.warn("⚠️ No selectedDeviceId or action returned from WhatsApp response");
//       }


//     } catch (e) {
//       console.error(
//         "❌ Failure in command/notify flow:",
//         e?.response?.data || e?.message || e
//       );
//     }
//   });
// }


// if (require.main === module) {
//   startWatcher().catch((err) => {
//     console.error("❌ Failed to start watcher:", err);
//     process.exit(1);
//   });
// }

// module.exports = { startWatcher };




require("dotenv").config({ path: ".env.local" });
const { MongoClient } = require("mongodb");
const {
  sendDeviceCommandOnceAck,
} = require("./mqttCommand");
const { sendWhatsAppTemplateMessage } = require("./ws");

const uri = process.env.MONGO_URI_WS || process.env.MONGO_URI_WS;
const dbName = process.env.DB_NAME_WS || "chatbot";
const collectionName = "whatsappresponses";


const bbUri = process.env.MONGO_URI;
const bbDbName = "bb";
const mappingCollection = "customer-device-mapping";

async function findDevicesByPhone(phoneNumber) {
  if (!bbUri) {
    console.error("❌ Missing MONGO_URI for bb lookup");
    return [];
  }

  const normalizedNumber = phoneNumber.replace(/\D/g, "");
  const last10 = normalizedNumber.slice(-10);

  console.log("🔍 Lookup started:", { original: phoneNumber, normalizedNumber, last10 });

  const client = new MongoClient(bbUri);
  try {
    await client.connect();
    const db = client.db(bbDbName);

    const mappings = await db
      .collection(mappingCollection)
      .find({ phoneNumber: last10 })
      .toArray();

    if (mappings.length > 0) {
      console.log("✅ Mappings found:", mappings.map(m => ({
        deviceId: m.deviceId,
        deviceName: m.deviceName
      })));
    } else {
      console.warn("⚠️ No mappings found for:", last10);
    }

    return mappings.map(m => ({
      deviceId: m.deviceId,
      deviceName: m.deviceName
    }));
  } catch (err) {
    console.error("❌ Error finding devices:", err.message);
    return [];
  } finally {
    await client.close();
  }
}






function parseRaw(raw) {
  if (!raw) return null;
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}
const isFlowUnused = (o) => o && o.flow_token === "unused";

// ✅ Extract action and access point separately
const getSelectedAction = (o) => {
  return (
    o?.screen_0_Select_an_action_0 || // old format
    o?.screen_0_Select_an_Action_1 ||  // new format
    o?.screen_0_Select_an_Action_0
  );
};

const getSelectedAccessPoint = (o) => {
  return (
    o?.screen_0_Select_an_Access_Point_0 || null
  );
};

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

  const pipeline = [
    { $match: { operationType: { $in: ["insert", "update", "replace"] } } }
  ];
  const changeStream = coll.watch(pipeline, { fullDocument: "updateLookup" });

  changeStream.on("change", async (change) => {
    const doc = change.fullDocument;
    if (!doc) return;

    const rawObj = parseRaw(doc.raw_response_json);
    if (!isFlowUnused(rawObj)) return;

    const action = getSelectedAction(rawObj);
    const accessPoint = getSelectedAccessPoint(rawObj);
    if (!action) return;

    const rawNumber = doc.customer_number.replace(/^\+91/, "").trim();
    const notifyNumber = `+${doc.customer_number}`;

    console.log("📩 Matched flow:", {
      _id: doc._id?.toString?.(),
      customer_number: notifyNumber,
      action_selected: action,
      access_point: accessPoint,
      at: doc.timestamp,
    });

    try {
      const devices = await findDevicesByPhone(rawNumber);
      if (devices.length === 0) {
        console.warn("⚠️ No devices found for number:", rawNumber);
        return;
      }

      // 🔶 NEW: if user sent ONLY action (single-device flow, no access point)
      if (!accessPoint && rawObj?.screen_0_Select_an_Action_0) {
        const selectedAction = rawObj.screen_0_Select_an_Action_0;
        if (devices.length !== 1) {
          const deviceNames = devices.map(d => d.deviceName);
          const deviceIds   = devices.map(d => d.deviceId);
          
          console.warn("⚠️ Multiple devices mapped but no access point provided; skipping command.", {
            deviceCount: devices.length,
            deviceIds: devices.map(d => d.deviceId),
          });
          await sendWhatsAppTemplateMessage(notifyNumber, {
            parameters: [
              JSON.stringify({
                deviceNames,
                deviceIds,
                action: selectedAction,
                accessPoint: null, // explicit: no AP in reply
              }),
            ],
          });
          return;
        }

        const targetDeviceId = devices[0].deviceId;
        const targetDeviceName = devices[0].deviceName;

        console.log("🎯 Direct command path (no AP):", {
          targetDeviceId,
          selectedAction,
        });


        await sendWhatsAppTemplateMessage(notifyNumber, {
          // no template_name needed — it will infer ds_template_total_1 from 1 name
          deviceIds: [targetDeviceId],
          deviceNames: [targetDeviceName],
          action: selectedAction,
          // accessPoint intentionally omitted (null) — single-device flow
        });

        let ack = false;
        if (selectedAction === "0_Open") {
          ack = await sendDeviceCommandOnceAck(targetDeviceId, "start", 12000);
        } else if (selectedAction === "1_Close") {
          ack = await sendDeviceCommandOnceAck(targetDeviceId, "stop", 12000);
        } else if (selectedAction === "2_Get_Link") {
          const res = await sendDeviceCommandOnceAck(targetDeviceId, "getip", 12000);
          ack = !!res;
          if (typeof res === "string" && res.startsWith("ACK:")) {
            const parts = res.split(":");
            const ip = parts[4];
            if (ip) {
              const link = `http://${ip}`;
              console.log(`🌐 Device ${targetDeviceId} webpage link:`, link);
              await sendWhatsAppTemplateMessage(notifyNumber, {
                template_name: "bb_operation_get_link_v1",
                parameters: [link],
              });
            }
          }
        } else {
          console.warn("⚠️ Unknown action (no AP path):", selectedAction);
          return;
        }

        console.log(`📡 Processed (no AP) ${targetDeviceId}, ack=${ack}`);
        return; // ⬅️ stop here; do not fall through to the multi-device flow
      }

      // ⬇️ EXISTING multi-device flow (unchanged)
      const deviceNames = devices.map(d => d.deviceName);
      const deviceIds = devices.map(d => d.deviceId);

      console.log("📦 Devices linked:", { deviceNames, deviceIds });

      const { selectedDeviceId, action: selectedAction } =
        await sendWhatsAppTemplateMessage(notifyNumber, {
          parameters: [
            JSON.stringify({ deviceNames, deviceIds, action, accessPoint })
          ],
        });

      if (selectedDeviceId && selectedAction) {
        console.log(`🎯 Running command for selected device: ${selectedDeviceId} with action: ${selectedAction}`);
        let ack = false;

        if (selectedAction === "0_Open") {
          ack = await sendDeviceCommandOnceAck(selectedDeviceId, "start", 12000);
        } else if (selectedAction === "1_Close") {
          ack = await sendDeviceCommandOnceAck(selectedDeviceId, "stop", 12000);
        } else if (selectedAction === "2_Get_Link") {
          const res = await sendDeviceCommandOnceAck(selectedDeviceId, "getip", 12000);
          ack = !!res;
          if (typeof res === "string" && res.startsWith("ACK:")) {
            const parts = res.split(":");
            const ip = parts[4];
            if (ip) {
              const link = `http://${ip}`;
              console.log(`🌐 Device ${selectedDeviceId} webpage link:`, link);
              await sendWhatsAppTemplateMessage(notifyNumber, {
                template_name: "bb_operation_get_link_v1",
                parameters: [link],
              });
            }
          }
        }

        console.log(`📡 Processed ${selectedDeviceId}, ack=${ack}`);
      } else {
        console.warn("⚠️ No selectedDeviceId or action returned from WhatsApp response");
      }
    } catch (e) {
      console.error("❌ Failure in command/notify flow:", e?.response?.data || e?.message || e);
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



