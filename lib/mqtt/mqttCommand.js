// lib/mqttCommand.js
const mqtt = require("mqtt");

const BROKER_URL  = process.env.MQTT_URL  || "mqtt://connection.eulerianbots.com";
const BROKER_PORT = Number(process.env.MQTT_PORT || 1883);
const KEEPALIVE   = Number(process.env.MQTT_KEEPALIVE || 60);
const CMD_TOPIC   = (id) => `devices/${id}/cmd`;
const RESP_TOPIC  = (id) => `devices/${id}/resp`;

let client;
let ready;
const waitersByTopic = new Map();

function getClient() {
  if (client) return client;
  client = mqtt.connect(BROKER_URL, {
    port: BROKER_PORT,
    keepalive: KEEPALIVE,
    clientId: `NodeCmdPublisher_${Math.random().toString(16).slice(2)}`,
    clean: true,
    reconnectPeriod: 1000,
  });
  ready = new Promise((resolve) => {
    if (client.connected) return resolve();
    client.once("connect", () => {
      console.log("✅ MQTT publisher connected");
      resolve();
    });
  });
  client.on("message", (topic, payloadBuf) => {
    const payload = payloadBuf.toString("utf8");
    const list = waitersByTopic.get(topic);
    if (list && list.length) {
      while (list.length) list.shift()({ topic, payload });
    }
  });
  client.on("error", (e) => console.error("❌ MQTT error:", e.message));
  client.on("reconnect", () => console.log("… MQTT reconnecting"));
  process.on("SIGINT", () => client.end(true, () => process.exit(0)));
  process.on("SIGTERM", () => client.end(true, () => process.exit(0)));
  return client;
}

async function subscribeIfNeeded(topic) {
  await ready;
  return new Promise((res, rej) => {
    client.subscribe(topic, { qos: 0 }, (err) => (err ? rej(err) : res()));
  });
}

function waitForResponseOnce(topic, timeoutMs = 120000) {
  return new Promise((resolve) => {
    const list = waitersByTopic.get(topic) || [];
    waitersByTopic.set(topic, list);
    list.push(resolve);

    const t = setTimeout(() => {
      const arr = waitersByTopic.get(topic);
      if (arr) {
        const idx = arr.indexOf(resolve);
        if (idx >= 0) arr.splice(idx, 1);
      }
      resolve(null);
    }, timeoutMs);

    const originalResolve = resolve;
    list[list.length - 1] = (msg) => {
      clearTimeout(t);
      originalResolve(msg);
    };
  });
}

function publishOnce(deviceId, command) {
  const topic = CMD_TOPIC(deviceId);
  return new Promise((res, rej) => {
    client.publish(topic, String(command), { qos: 0, retain: false }, (err) => {
      if (err) return rej(err);
      console.log(`➡️  Sent '${command}' to ${topic}`);
      res();
    });
  });
}

/** Publish once, then wait for /resp; returns response text or null */
async function sendDeviceCommandOnceAck(deviceId, command, timeoutMs = 120000) {
  if (!deviceId || !command) throw new Error("deviceId and command are required");
  getClient(); await ready;

  const respTopic = RESP_TOPIC(deviceId);
  await subscribeIfNeeded(respTopic);

  await publishOnce(deviceId, command);
  const msg = await waitForResponseOnce(respTopic, timeoutMs);
  if (msg) console.log(`💬 got response on ${respTopic}: ${msg.payload}`);
  else console.log(`⏳ no response before timeout on ${respTopic}`);
  return msg?.payload ?? null;
}

/** Publish -> wait -> publish again -> wait again; returns the SECOND response text or null */
async function sendDeviceCommandDoubleAck(deviceId, command, timeoutMs = 120000) {
  if (!deviceId || !command) throw new Error("deviceId and command are required");
  getClient(); await ready;

  const respTopic = RESP_TOPIC(deviceId);
  await subscribeIfNeeded(respTopic);

  await publishOnce(deviceId, command);
  await waitForResponseOnce(respTopic, timeoutMs);       // first ACK (ignored for callback)
  await publishOnce(deviceId, command);
  const second = await waitForResponseOnce(respTopic, timeoutMs);
  if (second) console.log(`💬 got 2nd response on ${respTopic}: ${second.payload}`);
  else console.log(`⏳ no 2nd response before timeout on ${respTopic}`);
  return second?.payload ?? null;
}

module.exports = {
  sendDeviceCommandOnceAck,
  sendDeviceCommandDoubleAck,
};
