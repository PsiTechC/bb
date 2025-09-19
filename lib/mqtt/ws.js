// const axios = require("axios");
// const { MongoClient } = require("mongodb");

// const mongoUri = process.env.MONGO_URI;
// const dbName = "bb";
// const wsCollection = "customer_send_ws_response";

// async function saveWsResponse(
//   toNumber,
//   templateName,
//   parameters,
//   wsResponse,
//   deviceIds,
//   deviceNames,
//   action,
//   accessPoint,
//   selectedDeviceId,
//   selectedDeviceName
// ) {
//   if (!mongoUri) {
//     console.error("❌ Missing MONGO_URI, skipping DB save");
//     return { wsResponse, selectedDeviceId, action };
//   }

//   const client = new MongoClient(mongoUri);
//   try {
//     await client.connect();
//     const db = client.db(dbName);

//     const doc = {
//       to_number: toNumber,
//       template_name: templateName,
//       parameters,
//       deviceIds: deviceIds || [],
//       deviceNames: deviceNames || [],
//       action: action || null,
//       accessPoint: accessPoint || null,
//       selectedDeviceId: selectedDeviceId || null,
//       selectedDeviceName: selectedDeviceName || null,
//       ws_response: wsResponse,
//       createdAt: new Date(),
//     };

//     await db.collection(wsCollection).insertOne(doc);
//     console.log("📦 WhatsApp response saved in DB with devices + action/accessPoint + selectedDeviceId/Name");

//     return { wsResponse, selectedDeviceId, action };
//   } catch (err) {
//     console.error("❌ Failed to save WhatsApp response from ws code:", err.message);
//     return { wsResponse, selectedDeviceId, action };
//   } finally {
//     await client.close();
//   }
// }

// async function sendWhatsAppTemplateMessage(toNumber, options = {}) {
//   let { template_name, parameters, deviceIds, deviceNames, action, accessPoint } = options;

//   deviceIds = deviceIds || [];
//   deviceNames = deviceNames || [];

//   // If deviceNames are inside JSON string in parameters
//   if (deviceNames.length === 0 && Array.isArray(parameters) && typeof parameters[0] === "string") {
//     try {
//       const parsed = JSON.parse(parameters[0]);
//       if (parsed.deviceNames && Array.isArray(parsed.deviceNames)) {
//         deviceNames = parsed.deviceNames;
//         deviceIds = parsed.deviceIds || [];
//         action = parsed.action || action;
//         accessPoint = parsed.accessPoint || accessPoint;
//       }
//     } catch {

//     }
//   }

//   if (deviceNames.length > 0) {
//     const count = deviceNames.length;
//     template_name = [5, 7, 8].includes(count)
//       ? `ds_template_total_${count}_`
//       : `ds_template_total_${count}`;
//     parameters = [...deviceNames];
//   } else {
//     template_name = template_name || "ds_template_total_1";
//     parameters = parameters || [];
//   }

//   let selectedDeviceId = null;
//   let selectedDeviceName = null;
//   if (accessPoint && deviceIds.length > 0 && deviceNames.length > 0) {
//     const index = parseInt(accessPoint.split("_")[0], 10);
//     if (!isNaN(index) && index < deviceIds.length) {
//       selectedDeviceId = deviceIds[index];
//       selectedDeviceName = deviceNames[index];
//     }
//   }

//   try {
//     console.log("📲 Preparing to send WhatsApp message...");
//     console.log("--------------------------------------------------");
//     console.log(`➡️ To Number: ${toNumber}`);
//     console.log(`➡️ Template Used: ${template_name}`);
//     console.log("➡️ Device Names:", JSON.stringify(deviceNames, null, 2));
//     console.log("➡️ Device IDs:", JSON.stringify(deviceIds, null, 2));
//     console.log(`➡️ Action: ${action || "N/A"}`);
//     console.log(`➡️ Access Point: ${accessPoint || "N/A"}`);
//     console.log(`➡️ Selected Device ID: ${selectedDeviceId || "N/A"}`);
//     console.log(`➡️ Selected Device Name: ${selectedDeviceName || "N/A"}`);
//     console.log("➡️ Parameters Sent:", JSON.stringify(parameters, null, 2));
//     console.log("--------------------------------------------------");

//     const response = await axios.post(
//       "https://whatsapp-api-backend-production.up.railway.app/api/send-message",
//       {
//         to_number: toNumber,
//         template_name,
//         whatsapp_request_type: "TEMPLATE",
//         parameters,
//       },
//       {
//         headers: {
//           "Content-Type": "application/json",
//           "x-api-key": `${process.env.WHATSAPP_BEARER_TOKEN}`,
//         },
//       }
//     );

//     console.log(`✅ WhatsApp message sent successfully using [${template_name}]`);

//     return await saveWsResponse(
//       toNumber,
//       template_name,
//       parameters,
//       response.data,
//       deviceIds,
//       deviceNames,
//       action,
//       accessPoint,
//       selectedDeviceId,
//       selectedDeviceName
//     );
//   } catch (error) {
//     console.error("❌ Failed to send WhatsApp message");

//     const errorResponse = error.response?.data || {
//       message: error.message,
//       stack: error.stack,
//     };

//     return await saveWsResponse(
//       toNumber,
//       template_name,
//       parameters,
//       errorResponse,
//       deviceIds,
//       deviceNames,
//       action,
//       accessPoint,
//       selectedDeviceId,
//       selectedDeviceName
//     );
//   }
// }

// module.exports = { sendWhatsAppTemplateMessage };


const axios = require("axios");
const https = require("https");
const { MongoClient } = require("mongodb");

const HOST = "whatsapp-api-backend-production.up.railway.app";
// Allow override via env; default to the IP you provided
const RESOLVE_IP = process.env.WS_API_IP || "66.33.22.191";
// Toggle with env if you want to fall back easily
const USE_RESOLVE = (process.env.WS_USE_RESOLVE || "true").toLowerCase() === "true";

const mongoUri = process.env.MONGO_URI;
const dbName = "bb";
const wsCollection = "customer_send_ws_response";

async function saveWsResponse(
  toNumber,
  templateName,
  parameters,
  wsResponse,
  deviceIds,
  deviceNames,
  action,
  accessPoint,
  selectedDeviceId,
  selectedDeviceName
) {
  if (!mongoUri) {
    console.error("❌ Missing MONGO_URI, skipping DB save");
    return { wsResponse, selectedDeviceId, action };
  }

  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    const db = client.db(dbName);

    const doc = {
      to_number: toNumber,
      template_name: templateName,
      parameters,
      deviceIds: deviceIds || [],
      deviceNames: deviceNames || [],
      action: action || null,
      accessPoint: accessPoint || null,
      selectedDeviceId: selectedDeviceId || null,
      selectedDeviceName: selectedDeviceName || null,
      ws_response: wsResponse,
      createdAt: new Date(),
    };

    await db.collection(wsCollection).insertOne(doc);
    console.log("📦 WhatsApp response saved in DB with devices + action/accessPoint + selectedDeviceId/Name");

    return { wsResponse, selectedDeviceId, action };
  } catch (err) {
    console.error("❌ Failed to save WhatsApp response from ws code:", err.message);
    return { wsResponse, selectedDeviceId, action };
  } finally {
    await client.close();
  }
}

async function sendWhatsAppTemplateMessage(toNumber, options = {}) {
  let { template_name, parameters, deviceIds, deviceNames, action, accessPoint } = options;

  deviceIds = deviceIds || [];
  deviceNames = deviceNames || [];

  // If deviceNames are inside JSON string in parameters
  if (deviceNames.length === 0 && Array.isArray(parameters) && typeof parameters[0] === "string") {
    try {
      const parsed = JSON.parse(parameters[0]);
      if (parsed.deviceNames && Array.isArray(parsed.deviceNames)) {
        deviceNames = parsed.deviceNames;
        deviceIds = parsed.deviceIds || [];
        action = parsed.action || action;
        accessPoint = parsed.accessPoint || accessPoint;
      }
    } catch {
      // ignore
    }
  }

  if (deviceNames.length > 0) {
    const count = deviceNames.length;
    template_name = [5, 7, 8].includes(count)
      ? `ds_template_total_${count}_`
      : `ds_template_total_${count}`;
    parameters = [...deviceNames];
  } else {
    template_name = template_name || "ds_template_total_1";
    parameters = parameters || [];
  }

  let selectedDeviceId = null;
  let selectedDeviceName = null;
  if (accessPoint && deviceIds.length > 0 && deviceNames.length > 0) {
    const index = parseInt(accessPoint.split("_")[0], 10);
    if (!isNaN(index) && index < deviceIds.length) {
      selectedDeviceId = deviceIds[index];
      selectedDeviceName = deviceNames[index];
    }
  }

  // ---------- emulate `curl --resolve host:443:IP` ----------
  // Connect to https://<IP>/..., with Host header set to the original hostname
  // and SNI set via https.Agent({ servername: HOST }).
  const url = USE_RESOLVE
    ? `https://${RESOLVE_IP}/api/send-message`
    : `https://${HOST}/api/send-message`;

  const httpsAgent = USE_RESOLVE
    ? new https.Agent({
        // IMPORTANT: present the hostname for TLS/SNI so the cert matches
        servername: HOST,
        // keep default certificate validation behavior
        rejectUnauthorized: true,
      })
    : undefined;

  const headers = {
    "Content-Type": "application/json",
    "x-api-key": `${process.env.WHATSAPP_BEARER_TOKEN}`,
    // When hitting the IP, set Host header to the real hostname (like curl --resolve)
    ...(USE_RESOLVE ? { Host: HOST } : {}),
  };
  // ---------------------------------------------------------

  try {
    console.log("📲 Preparing to send WhatsApp message...");
    console.log("--------------------------------------------------");
    console.log(`➡️ To Number: ${toNumber}`);
    console.log(`➡️ Template Used: ${template_name}`);
    console.log("➡️ Device Names:", JSON.stringify(deviceNames, null, 2));
    console.log("➡️ Device IDs:", JSON.stringify(deviceIds, null, 2));
    console.log(`➡️ Action: ${action || "N/A"}`);
    console.log(`➡️ Access Point: ${accessPoint || "N/A"}`);
    console.log(`➡️ Selected Device ID: ${selectedDeviceId || "N/A"}`);
    console.log(`➡️ Selected Device Name: ${selectedDeviceName || "N/A"}`);
    console.log("➡️ Parameters Sent:", JSON.stringify(parameters, null, 2));
    console.log(`➡️ Resolve via IP: ${USE_RESOLVE ? RESOLVE_IP : "disabled"}`);
    console.log("--------------------------------------------------");

    const response = await axios.post(
      url,
      {
        to_number: toNumber,
        template_name,
        whatsapp_request_type: "TEMPLATE",
        parameters,
      },
      {
        headers,
        httpsAgent, // only used when resolving via IP
        // avoid corporate proxies etc. interfering with direct-IP requests
        proxy: false,
      }
    );

    console.log(`✅ WhatsApp message sent successfully using [${template_name}]`);

    return await saveWsResponse(
      toNumber,
      template_name,
      parameters,
      response.data,
      deviceIds,
      deviceNames,
      action,
      accessPoint,
      selectedDeviceId,
      selectedDeviceName
    );
  } catch (error) {
    console.error("❌ Failed to send WhatsApp message");

    const errorResponse = error.response?.data || {
      message: error.message,
      stack: error.stack,
    };

    return await saveWsResponse(
      toNumber,
      template_name,
      parameters,
      errorResponse,
      deviceIds,
      deviceNames,
      action,
      accessPoint,
      selectedDeviceId,
      selectedDeviceName
    );
  }
}

module.exports = { sendWhatsAppTemplateMessage };
