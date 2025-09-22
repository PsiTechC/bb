"use client";
import { useState, useEffect } from "react";
import UserCard from "./UserCard";

export default function DevicesControl() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState([]);
  const [fetching, setFetching] = useState(false);

  // 🔹 Fetch devices
  const fetchDevices = async () => {
    setFetching(true);
    try {
      const res = await fetch("/api/admin/device/get-devices");
      if (!res.ok) throw new Error("Failed to fetch devices");
      const data = await res.json();
      setDevices(data.devices || []);
    } catch (err) {
      console.error("❌ Error fetching devices:", err.message);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  // 🔹 Open modal and prefill ID/Name
  const openModal = () => {
    const nextNumber = devices.length + 1;
    const formattedNumber = String(nextNumber).padStart(3, "0"); // 001, 002...
    setDeviceId(`DS00${formattedNumber}`);
    setDeviceName(`DS00${formattedNumber}`);
    setDescription("");
    setIsModalOpen(true);
  };

  // 🔹 Add device
  const handleAddDevice = async () => {
    if (!deviceId || !deviceName) {
      alert("Please enter device ID and name");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/device/add-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, name: deviceName, description }),
      });

      if (!res.ok) throw new Error("Failed to add device");

      // ✅ reset + close modal + refresh list
      setDeviceId("");
      setDeviceName("");
      setDescription("");
      setIsModalOpen(false);
      await fetchDevices();
    } catch (err) {
      console.error("❌ Error adding device:", err.message);
      alert("Error adding device");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-md relative">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={openModal}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
        >
          + Add Device
        </button>
      </div>

      {/* Devices Grid */}
      {fetching ? (
        <p className="text-gray-500">Loading devices...</p>
      ) : devices.length === 0 ? (
        <p className="text-gray-500">No devices found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices
            .sort((a, b) => {
              // Extract number from deviceId like NODE001 → 1
              const numA = parseInt(a.deviceId.replace("DS00", ""), 10);
              const numB = parseInt(b.deviceId.replace("DS00", ""), 10);
              return numA - numB;
            })
            .map((device) => (
              <UserCard key={device._id} data={device} type="device" />
            ))}
        </div>
      )}


      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-indigo-600">
              Add New Device
            </h2>

            <div className="space-y-4">
              {/* <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device ID
                </label>
                <input
                  type="text"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-400"
                  placeholder="Enter unique device ID"
                />
              </div> */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device Name
                </label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-400"
                  placeholder="Enter device name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-400"
                  placeholder="Enter description (optional)"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDevice}
                disabled={loading}
                className={`px-4 py-2 rounded-lg text-white ${
                  loading
                    ? "bg-indigo-400 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-500"
                }`}
              >
                {loading ? "Adding..." : "Add Device"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
