"use client";
import { useEffect, useState } from "react";
import Alert from "../utils/Alert";

export default function Dashboard() {
  const [clients, setClients] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedDevice, setSelectedDevice] = useState("");
  const [mappings, setMappings] = useState([]);
  const [alert, setAlert] = useState(null); // 🔹 for alert state

  // Fetch Clients
  const fetchClients = async () => {
    try {
      const res = await fetch("/api/admin/clients/get-clients");
      const data = await res.json();
      setClients(data.clients || []);
    } catch (err) {
      console.error("❌ Error fetching clients:", err);
    }
  };

  // Fetch Devices
  const fetchDevices = async () => {
    try {
      const res = await fetch("/api/admin/device/get-devices");
      const data = await res.json();
      setDevices(data.devices || []);
    } catch (err) {
      console.error("❌ Error fetching devices:", err);
    }
  };

  // Fetch existing mappings
  const fetchMappings = async () => {
    try {
      const res = await fetch("/api/admin/mapping/get-mappings");
      const data = await res.json();
      setMappings(data.mappings || []);
    } catch (err) {
      console.error("❌ Error fetching mappings:", err);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchDevices();
    fetchMappings();
  }, []);

  // Map Device to Client
  const handleMap = async () => {
    if (!selectedClient || !selectedDevice) {
      setAlert({
        type: "danger",
        message: "Please select both client and device",
      });
      return;
    }

    try {
      const res = await fetch("/api/admin/mapping/map-device-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientEmail: selectedClient, deviceId: selectedDevice }),
      });

      if (!res.ok) throw new Error("Failed to map device");

      setSelectedClient("");
      setSelectedDevice("");
      fetchMappings();
      fetchDevices();
      setAlert({ type: "success", message: "Device mapped successfully" });
    } catch (err) {
      console.error("❌ Error mapping device:", err);
      setAlert({ type: "danger", message: "Error mapping device" });
    }
  };

  // Delete Mapping → unassign-device.js
  const handleDelete = async (clientEmail, deviceId) => {
    try {
      const res = await fetch("/api/admin/mapping/unassign-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientEmail, deviceId }),
      });

      if (!res.ok) throw new Error("Failed to unassign device");

      fetchMappings();
      fetchDevices();
      setAlert({ type: "success", message: "Device unassigned successfully" });
    } catch (err) {
      console.error("❌ Error deleting mapping:", err);
      setAlert({ type: "danger", message: "Error unassigning device" });
    }
  };

  // Show confirmation alert before unassign
  const confirmUnassign = (clientEmail, deviceId) => {
    setAlert({
      type: "warning",
      message: `Are you sure you want to unassign ${deviceId} from ${clientEmail}?`,
      isConfirm: true,
      onConfirm: () => {
        handleDelete(clientEmail, deviceId);
        setAlert(null);
      },
      onCancel: () => setAlert(null),
    });
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-md">
      {/* Alert */}
      {alert && (
        <Alert
          {...alert}
          onClose={() => setAlert(null)}
          onConfirm={alert.onConfirm}
          onCancel={alert.onCancel}
        />
      )}

      {/* Selection Row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5 items-center">
        {/* Clients Dropdown */}
        <select
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
          className="w-full sm:w-1/3 border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">Select Client</option>
          {clients.map((c) => (
            <option key={c._id} value={c.email}>
              {c.name ? `${c.name} (${c.email})` : c.email}
            </option>
          ))}
        </select>

        {/* Devices Dropdown */}
        <select
          value={selectedDevice}
          onChange={(e) => setSelectedDevice(e.target.value)}
          className="w-full sm:w-1/3 border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">Select Device</option>
          {devices
            .filter((d) => !mappings.some((map) => map.deviceId === d.deviceId)) // hide mapped
            .sort((a, b) => {
              const numA = parseInt(a.deviceId.replace("NODE", ""), 10);
              const numB = parseInt(b.deviceId.replace("NODE", ""), 10);
              return numA - numB;
            })
            .map((d) => (
              <option key={d._id} value={d.deviceId}>
                {d.name} ({d.deviceId})
              </option>
            ))}
        </select>

        <button
          onClick={handleMap}
          disabled={!selectedClient || !selectedDevice}
          className={`px-4 py-1.5 rounded-md text-sm shadow-sm font-medium ${
            !selectedClient || !selectedDevice
              ? "bg-gray-300 text-gray-600 cursor-not-allowed"
              : "bg-yellow-400 hover:bg-yellow-500 text-black"
          }`}
        >
          Map
        </button>
      </div>

      {/* Mapped List */}
      <h2 className="text-base font-semibold text-gray-800 mb-3">
        Mapped Clients & Devices
      </h2>
      <div className="space-y-2">
        {mappings.length === 0 ? (
          <p className="text-gray-500 text-sm">No mappings found.</p>
        ) : (
          mappings.map((map, idx) => (
            <div
              key={idx}
              className="flex justify-between items-center bg-gray-50 border rounded-md px-3 py-2 text-sm"
            >
              <span>
                <strong>
                  {map.clientName
                    ? `${map.clientName} (${map.clientEmail})`
                    : map.clientEmail}
                </strong>{" "}
                →{" "}
                {map.deviceName
                  ? `${map.deviceName} (${map.deviceId})`
                  : map.deviceId}
              </span>
              <button
                onClick={() => confirmUnassign(map.clientEmail, map.deviceId)}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-xs"
              >
                Unassign
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
