// services/sendMessage.js
const axios = require("axios");

async function sendWhatsAppTemplateMessage(toNumber) {
  try {
    const response = await axios.post(
      "https://whatsapp-api-backend-production.up.railway.app/api/send-message",
      {
        to_number: toNumber,                // e.g. "+919131296862"
        template_name: "bb_operation_v3",   // your template
        whatsapp_request_type: "TEMPLATE",
        parameters: [],                     // add template params if needed
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "ef99d3d2-e032-4c04-8e27-9313b2e6b172",
          Authorization: `Bearer ${process.env.WHATSAPP_BEARER_TOKEN}`,
        },
      }
    );

    console.log("✅ WhatsApp template sent:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Failed to send WhatsApp message:", error.response?.data || error.message);
    throw error;
  }
}

module.exports = { sendWhatsAppTemplateMessage };
