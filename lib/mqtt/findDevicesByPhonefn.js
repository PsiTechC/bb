const { MongoClient } = require("mongodb");
const { sendWhatsAppTemplateMessage } = require("./ws");

const mongoUri = process.env.MONGO_URI;
const dbName = "bb";
const mappingCollection = "customer-device-mapping";

async function findDevicesByPhonefn(phoneNumber) {
  if (!mongoUri) {
    console.error("❌ Missing MONGO_URI for lookup");
    return [];
  }

  // Normalize: keep last 10 digits
  const normalized = phoneNumber.replace(/\D/g, "").slice(-10);

  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    const db = client.db(dbName);

    const devices = await db
      .collection(mappingCollection)
      .find({ phoneNumber: normalized })
      .toArray();

    const deviceIds = devices.map(d => d.deviceId);
    const deviceNames = devices.map(d => d.deviceName);

    console.log("//////////////////////// from findDevicesByPhonefn");
    console.log("📦 Devices found:", { deviceIds, deviceNames, phoneNumber });
    console.log("//////////////////////// from findDevicesByPhonefn");

    // 🔹 Pass to sendWhatsAppTemplateMessage
    if (deviceIds.length > 0) {
      try {
        const wsResponse = await sendWhatsAppTemplateMessage(phoneNumber, {
          deviceIds,
          deviceNames,
        });

        return wsResponse;
      } catch (err) {
        console.error("❌ Failed to send WhatsApp template message:", err.message);
        return [];
      }
    } else {
      console.warn("⚠️ No devices found to send WhatsApp message.");
      return [];
    }
  } catch (err) {
    console.error("❌ Error during device lookup:", err.message);
    return [];
  } finally {
    await client.close();
  }
}

module.exports = { findDevicesByPhonefn };
