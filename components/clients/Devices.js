"use client";
import { useEffect, useState } from "react";
import { FaPen, FaPlus, FaTrash } from "react-icons/fa";

export default function DevicesClient({ clientEmail }) {
  const [devices, setDevices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [editedName, setEditedName] = useState("");
  const [assignedCustomers, setAssignedCustomers] = useState([]); // customer IDs
  const [mappedCustomers, setMappedCustomers] = useState([]); // already mapped customers


// 🔹 Remove mapped customer
const handleRemoveMappedCustomer = async (customer) => {
  if (!customer.customerId) {
    alert("❌ Customer ID missing");
    return;
  }

  try {
    const res = await fetch("/api/clients/devices/get-customers-by-device", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "remove",
        _id: customer._id,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to remove customer");
    }

    console.log(`✅ Removed customer mapping for ${customer.customerName}`);
    // Refresh customers list after delete
    await openEditModal(editingDevice);
  } catch (err) {
    console.error("❌ Error removing customer:", err.message);
    alert(err.message || "Error removing customer");
  }
};

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
      setDevices(data.devices || []);
    } catch (err) {
      console.error("❌ Error fetching client devices:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Fetch customers
  const fetchCustomers = async () => {
    if (!clientEmail) return;
    try {
      const res = await fetch("/api/clients/customer/get-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: clientEmail }),
      });
      if (!res.ok) throw new Error("Failed to fetch customers");
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch (err) {
      console.error("❌ Error fetching customers:", err.message);
    }
  };

  useEffect(() => {
    fetchDevices();
    fetchCustomers();
  }, [clientEmail]);

  // 🔹 Open Modal and fetch mapped customers
  const openEditModal = async (device) => {
    setEditingDevice(device);
    setEditedName(device.deviceName);

    try {
      const res = await fetch("/api/clients/devices/get-customers-by-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({  action: "get", deviceId: device._id }),
      });

      if (!res.ok) throw new Error("Failed to fetch mapped customers");
      const data = await res.json();



      setMappedCustomers(data.customers || []);

      // For new assignment dropdowns
      setAssignedCustomers([""]);
    } catch (err) {
      console.error("❌ Error fetching mapped customers:", err.message);
      setMappedCustomers([]);
      setAssignedCustomers([""]);
    }

    setIsModalOpen(true);
  };

  // 🔹 Add another dropdown
  const addCustomerDropdown = () => {
    setAssignedCustomers([...assignedCustomers, ""]);
  };

  // 🔹 Update selected customer in dropdown
  const handleCustomerChange = (index, value) => {
    const updated = [...assignedCustomers];
    updated[index] = value;
    setAssignedCustomers(updated);
  };

  // 🔹 Save changes (uses single unified endpoint)
  const handleSave = async () => {
    if (!editingDevice) return;

    try {
      // collect what changed
      const payload = {
        deviceId: editingDevice.deviceId, // e.g. "NODE004"
        clientEmail,
      };

      // include new name only if changed
      if (editedName && editedName.trim() !== editingDevice.deviceName) {
        payload.newName = editedName.trim();
      }

      // include customers (as phone numbers) only if any selected
      const selectedPhones = assignedCustomers
        .filter(Boolean)
        .map((custId) => customers.find((c) => c._id === custId)?.phoneNumber)
        .filter(Boolean);

      if (selectedPhones.length > 0) {
        payload.customers = selectedPhones;
      }

      // if nothing to do, just close
      if (!payload.newName && !payload.customers) {
        setIsModalOpen(false);
        setEditingDevice(null);
        return;
      }

      const res = await fetch("/api/clients/devices/mapp-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to save changes");
      }

      // refresh + close
      await fetchDevices();
      setIsModalOpen(false);
      setEditingDevice(null);
    } catch (err) {
      console.error("❌ Error saving device changes:", err.message);
      alert(err.message || "Error saving device changes");
    }
  };


  // Remaining customers (not already mapped)
  const availableCustomers = customers.filter(
    (c) => !mappedCustomers.some((m) => m.phoneNumber === c.phoneNumber)
  );

  const noMoreCustomers = availableCustomers.length <= assignedCustomers.filter(Boolean).length;

  return (
    <div className="p-6 bg-white rounded-xl shadow-md">
      <h1 className="text-2xl font-bold text-indigo-600 mb-4">My Devices</h1>

      {loading ? (
        <p className="text-gray-500">Loading devices...</p>
      ) : devices.length === 0 ? (
        <p className="text-gray-500">No devices assigned to your account.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {devices.map((device) => (
            <div
              key={device._id}
              className="relative bg-gray-50 border rounded-lg shadow-sm p-3 flex flex-col items-center justify-center"
            >
              <p className="text-[15px] font-medium text-gray-800 text-center break-words max-w-full truncate">
                {device.deviceName}
              </p>
              <button
                onClick={() => openEditModal(device)}
                className="absolute top-2 right-2 text-gray-500 hover:text-indigo-600"
              >
                <FaPen size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-indigo-600">Edit Device</h2>

            <div className="space-y-4">
              {/* Device Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Device Name</label>
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              {/* Already mapped customers */}
              {mappedCustomers.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Already Assigned Customers
                  </label>
                  {mappedCustomers.length > 0 && (
                    <div>
                      {mappedCustomers.map((mc, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-sm text-gray-800 bg-gray-100 px-3 py-1 rounded mb-1"
                        >
                          <span>
                            {mc.customerName} ({mc.phoneNumber})
                          </span>
                          <button
                            onClick={() => handleRemoveMappedCustomer(mc)}
                            className="text-red-500 hover:text-red-700 ml-2"
                            title="Remove Customer"
                          >
                            <FaTrash size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* New Customer Dropdowns */}
              {availableCustomers.length > 0 &&
                assignedCustomers.map((cust, idx) => (
                  <select
                    key={idx}
                    value={cust}
                    onChange={(e) => handleCustomerChange(idx, e.target.value)}
                    className="w-full border px-3 py-2 rounded-lg mb-2"
                  >
                    <option value="">Select Customer</option>
                    {availableCustomers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.customerName} ({c.phoneNumber})
                      </option>
                    ))}
                  </select>
                ))}

              {/* Add Another Customer button */}
              <button
                onClick={!noMoreCustomers ? addCustomerDropdown : undefined}
                disabled={noMoreCustomers}
                className={`flex items-center text-sm mt-1 px-2 py-1 rounded ${noMoreCustomers
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-indigo-600 hover:text-indigo-800"
                  }`}
                title={noMoreCustomers ? "No more customers" : "Add another customer"}
              >
                <FaPlus className="mr-1" /> Add Another Customer
              </button>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
