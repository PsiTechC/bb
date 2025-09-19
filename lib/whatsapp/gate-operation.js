export async function sendWhatsAppInvitation(toNumber, name) {
  const url = "https://whatsapp-api-backend-production.up.railway.app/api/send-message";

  const headers = {
    "Content-Type": "application/json",
    "x-api-key": `${process.env.WHATSAPP_BEARER_TOKEN}`,
  };

  // 1️⃣ First send invitation_door_v1
  const invitationRes = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      to_number: toNumber,
      template_name: "invitation_door_v1",
      whatsapp_request_type: "TEMPLATE",
      parameters: [name, toNumber], 
    }),
  });

  if (!invitationRes.ok) {
    const text = await invitationRes.text().catch(() => "");
    throw new Error(
      `WhatsApp API (invitation_door_v1) error ${invitationRes.status}: ${
        text || invitationRes.statusText
      }`
    );
  }

  const invitationResult = await invitationRes.json();

  // 2️⃣ Then send bb_operation_v4
  const operationRes = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      to_number: toNumber,
      template_name: "_bb_operation_v4",
      whatsapp_request_type: "TEMPLATE",
      parameters: [],
    }),
  });

  if (!operationRes.ok) {
    const text = await operationRes.text().catch(() => "");
    throw new Error(
      `WhatsApp API (bb_operation_v4) error ${operationRes.status}: ${
        text || operationRes.statusText
      }`
    );
  }

  const operationResult = await operationRes.json();

  return {
    invitation: invitationResult,
    operation: operationResult,
  };
}
