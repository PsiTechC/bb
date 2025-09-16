"use client";
import { useEffect, useState } from "react";
import { FaPen } from "react-icons/fa";

export default function DevicesClient({ clientEmail }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editedName, setEditedName] = useState("");

  // Fetch devices for this client
  const fetchDevices = async () => {
    if (!clientEmail) return;
    setLoading(true);
    try {
      const res = await fetch("/api/clients/devices/get-devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: clientEmail }),
      });

      if (!res.ok) throw new Error("Failed to fetch devices");

      const data = await res.json();
      setDevices(data.devices || []); // expecting array of { _id, deviceName }
    } catch (err) {
      console.error("❌ Error fetching client devices:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [clientEmail]);

  // Save on blur
  const handleSave = async (index) => {
    const device = devices[index];
    if (!device) return;

    try {
      const res = await fetch("/api/clients/devices/update-device-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: device._id,        // ✅ send _id
          newName: editedName,    // ✅ send updated name
        }),
      });

      if (!res.ok) throw new Error("Failed to update device name");

      // Update locally
      const updated = [...devices];
      updated[index].deviceName = editedName;
      setDevices(updated);
    } catch (err) {
      console.error("❌ Error updating device name:", err.message);
    } finally {
      setEditingIndex(null);
      setEditedName("");
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-md">
      <h1 className="text-2xl font-bold text-indigo-600 mb-4">My Devices</h1>

      {loading ? (
        <p className="text-gray-500">Loading devices...</p>
      ) : devices.length === 0 ? (
        <p className="text-gray-500">No devices assigned to your account.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {devices.map((device, idx) => (
            <div
              key={device._id} // ✅ use _id for key
              className="relative bg-gray-50 border rounded-lg shadow-sm p-3 flex flex-col items-center justify-center"
            >
              {editingIndex === idx ? (
                <input
                  type="text"
                  value={editedName}
                  autoFocus
                  onChange={(e) => setEditedName(e.target.value)}
                  onBlur={() => handleSave(idx)}
                  className="text-center border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-400 w-full"
                />
              ) : (
                <>
                  <p
                    className="text-[15px] font-medium text-gray-800 mb-1.5 mt-1 text-center break-words max-w-full truncate"
                    title={device.deviceName} 
                  >
                    {device.deviceName}
                  </p>


                  <button
                    onClick={() => {
                      setEditingIndex(idx);
                      setEditedName(device.deviceName);
                    }}
                    className="absolute top-2 right-2 text-gray-500 hover:text-indigo-600"
                  >
                    <FaPen size={12} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
