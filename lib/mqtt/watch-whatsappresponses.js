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
//     o?.screen_0_Select_an_Action_1 ||  // new format
//     o?.screen_0_Select_an_Action_0
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

//       // 🔶 NEW: if user sent ONLY action (single-device flow, no access point)
//       if (!accessPoint && rawObj?.screen_0_Select_an_Action_0) {
//         const selectedAction = rawObj.screen_0_Select_an_Action_0;
//         if (devices.length !== 1) {
//           const deviceNames = devices.map(d => d.deviceName);
//           const deviceIds   = devices.map(d => d.deviceId);

//           console.warn("⚠️ Multiple devices mapped but no access point provided; skipping command.", {
//             deviceCount: devices.length,
//             deviceIds: devices.map(d => d.deviceId),
//           });
//           await sendWhatsAppTemplateMessage(notifyNumber, {
//             parameters: [
//               JSON.stringify({
//                 deviceNames,
//                 deviceIds,
//                 action: selectedAction,
//                 accessPoint: null, // explicit: no AP in reply
//               }),
//             ],
//           });
//           return;
//         }

//         const targetDeviceId = devices[0].deviceId;
//         const targetDeviceName = devices[0].deviceName;

//         console.log("🎯 Direct command path (no AP):", {
//           targetDeviceId,
//           selectedAction,
//         });


//         await sendWhatsAppTemplateMessage(notifyNumber, {
//           // no template_name needed — it will infer ds_template_total_1 from 1 name
//           deviceIds: [targetDeviceId],
//           deviceNames: [targetDeviceName],
//           action: selectedAction,
//           // accessPoint intentionally omitted (null) — single-device flow
//         });

//         let ack = false;
//         if (selectedAction === "0_Open") {
//           ack = await sendDeviceCommandOnceAck(targetDeviceId, "start", 12000);
//         } else if (selectedAction === "1_Close") {
//           ack = await sendDeviceCommandOnceAck(targetDeviceId, "stop", 12000);
//         } else if (selectedAction === "2_Get_Link") {
//           const res = await sendDeviceCommandOnceAck(targetDeviceId, "getip", 12000);
//           ack = !!res;
//           if (typeof res === "string" && res.startsWith("ACK:")) {
//             const parts = res.split(":");
//             const ip = parts[4];
//             if (ip) {
//               const link = `http://${ip}`;
//               console.log(`🌐 Device ${targetDeviceId} webpage link:`, link);
//               await sendWhatsAppTemplateMessage(notifyNumber, {
//                 template_name: "bb_operation_get_link_v1",
//                 parameters: [link],
//               });
//             }
//           }
//         } else {
//           console.warn("⚠️ Unknown action (no AP path):", selectedAction);
//           return;
//         }

//         console.log(`📡 Processed (no AP) ${targetDeviceId}, ack=${ack}`);
//         return; // ⬅️ stop here; do not fall through to the multi-device flow
//       }

//       // ⬇️ EXISTING multi-device flow (unchanged)
//       const deviceNames = devices.map(d => d.deviceName);
//       const deviceIds = devices.map(d => d.deviceId);

//       console.log("📦 Devices linked:", { deviceNames, deviceIds });

//       const { selectedDeviceId, action: selectedAction } =
//         await sendWhatsAppTemplateMessage(notifyNumber, {
//           parameters: [
//             JSON.stringify({ deviceNames, deviceIds, action, accessPoint })
//           ],
//         });

//       if (selectedDeviceId && selectedAction) {
//         console.log(`🎯 Running command for selected device: ${selectedDeviceId} with action: ${selectedAction}`);
//         let ack = false;

//         if (selectedAction === "0_Open") {
//           ack = await sendDeviceCommandOnceAck(selectedDeviceId, "start", 12000);
//         } else if (selectedAction === "1_Close") {
//           ack = await sendDeviceCommandOnceAck(selectedDeviceId, "stop", 12000);
//         } else if (selectedAction === "2_Get_Link") {
//           const res = await sendDeviceCommandOnceAck(selectedDeviceId, "getip", 12000);
//           ack = !!res;
//           if (typeof res === "string" && res.startsWith("ACK:")) {
//             const parts = res.split(":");
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
//       console.error("❌ Failure in command/notify flow:", e?.response?.data || e?.message || e);
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





// require("dotenv").config({ path: ".env.local" });
// const { MongoClient } = require("mongodb");
// const {
//   sendDeviceCommandOnceAck,
// } = require("./mqttCommand");
// const { sendWhatsAppTemplateMessage } = require("./ws");

// const {findDevicesByPhonefn} = require('./findDevicesByPhonefn')


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


//   const client = new MongoClient(bbUri);
//   try {
//     await client.connect();
//     const db = client.db(bbDbName);

//     const mappings = await db
//       .collection(mappingCollection)
//       .find({ phoneNumber: last10 })
//       .toArray();

//     if (mappings.length > 0) {

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
  
//     // 🔹 Parse the incoming WhatsApp response JSON
//     const rawObj = parseRaw(doc.raw_response_json);
//     const action = getSelectedAction(rawObj);
//     const accessPoint = getSelectedAccessPoint(rawObj);
  
//     if (doc.context_message_id) {
//       console.log("🆔 Context Message Info:", {
//         context_message_id: doc.context_message_id,
//         action,
//         access_point: accessPoint,
//       });
  
//       try {
//         // 🔹 Lookup in customer_send_ws_response using context_message_id
//         const client2 = new MongoClient(bbUri);
//         await client2.connect();
//         const db2 = client2.db(bbDbName);
  
//         const wsDoc = await db2
//           .collection("customer_send_ws_response")
//           .findOne({ whatsapp_message_id: doc.context_message_id });
  
//         if (wsDoc && wsDoc.deviceIds && wsDoc.deviceIds.length > 0) {
//           // Extract index from accessPoint (e.g., "1_Access_Point_2" -> 1)
//           const idx = parseInt(accessPoint.split("_")[0], 10);
//           const selectedDeviceId =
//             !isNaN(idx) && idx < wsDoc.deviceIds.length
//               ? wsDoc.deviceIds[idx]
//               : null;
  
//           console.log("📦 Matched Device from ws_response DB:", {
//             selectedDeviceId,
//             allDeviceIds: wsDoc.deviceIds,
//           });
  
//           // 🔹 Log phoneNumber from wsDoc
//           if (wsDoc.phoneNumber) {
//             console.log("📞 Phone number from ws_response DB:", wsDoc.phoneNumber);
  
//             // 🔹 Pass phoneNumber to findDevicesByPhonefn
//             try {
//               const devicesFromFn = await findDevicesByPhonefn(wsDoc.phoneNumber);
//               console.log("🔄 Devices fetched via findDevicesByPhonefn:", devicesFromFn);
//             } catch (err) {
//               console.error("❌ Error in findDevicesByPhonefn:", err.message);
//             }
//           } else {
//             console.warn("⚠️ No phoneNumber found in wsDoc");
//           }
//         } else {
//           console.warn("⚠️ No matching wsDoc or empty deviceIds found");
//         }
  
//         await client2.close();
//       } catch (err) {
//         console.error(
//           "❌ Error fetching from customer_send_ws_response:",
//           err.message
//         );
//       }
//     }
  
//     // 🔹 Stop early if flow is not "unused"
//     if (!isFlowUnused(rawObj)) return;
//     if (!action) return;
  
//     const rawNumber = doc.customer_number.replace(/^\+91/, "").trim();
//     const notifyNumber = `+${doc.customer_number}`;
  
//     try {
//       const devices = await findDevicesByPhone(rawNumber);
//       if (devices.length === 0) {
//         console.warn("⚠️ No devices found for number:", rawNumber);
//         return;
//       }
  
//       // Extract arrays of names + ids
//       const deviceNames = devices.map((d) => d.deviceName);
//       const deviceIds = devices.map((d) => d.deviceId);
  
//       console.log("📦 Devices linked:", { deviceNames, deviceIds });
  
//       // 🔹 Send them to WhatsApp and capture the chosen device + action
//       const { selectedDeviceId, action: selectedAction } =
//         await sendWhatsAppTemplateMessage(notifyNumber, {
//           parameters: [
//             JSON.stringify({ deviceNames, deviceIds, action, accessPoint }),
//           ],
//         });
  
//       if (selectedDeviceId && selectedAction) {
//         console.log(
//           `🎯 Running command for selected device: ${selectedDeviceId} with action: ${selectedAction}`
//         );
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
//         console.warn(
//           "⚠️ No selectedDeviceId or action returned from WhatsApp response"
//         );
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
  o?.screen_0_Select_an_action_0 || o?.screen_0_Select_an_Action_1;

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
        const idx = parseInt(accessPoint.split("_")[0], 10);
        const selectedDeviceId =
          !isNaN(idx) && idx < wsDoc.deviceIds.length
            ? wsDoc.deviceIds[idx]
            : null;

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
                    await sendWhatsAppGetLink(ip);
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
