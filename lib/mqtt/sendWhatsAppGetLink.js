const axios = require("axios");
const https = require("https");

const HOST = "whatsapp-api-backend-production.up.railway.app";
const RESOLVE_IP = "66.33.22.191"; // same as your curl
const API_KEY = process.env.WHATSAPP_BEARER_TOKEN

/**
 * Send WhatsApp Get-Link Template
 * @param {string} ipAddress - The device IP, e.g. "192.168.1.69"
 */
async function sendWhatsAppGetLink(ipAddress, phoneNumber) {
  const url = `https://${RESOLVE_IP}/api/send-message`;

  const httpsAgent = new https.Agent({
    servername: HOST,       // important for TLS cert validation
    rejectUnauthorized: true,
  });

  const headers = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY,
    Host: HOST, // emulate --resolve
  };

  const payload = {
    to_number: phoneNumber, 
    template_name: "bb_operation_get_link_v1",
    whatsapp_request_type: "TEMPLATE",
    parameters: [`http://${ipAddress}`],
  };

  try {
    console.log("📲 Sending WhatsApp Get-Link message...");
    const response = await axios.post(url, payload, {
      headers,
      httpsAgent,
      proxy: false, // avoid proxy interference
    });

    console.log("✅ Message sent successfully:", response.data);
  } catch (err) {
    console.error("❌ Failed to send WhatsApp message:", err.response?.data || err.message);
  }
}

module.exports = { sendWhatsAppGetLink };
