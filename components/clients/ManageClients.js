"use client";
import { useState, useEffect, useRef } from "react";
import { FaTrash, FaInfoCircle } from "react-icons/fa";
import Alert from "../utils/Alert";

export default function ManageClientsClient({ clientEmail }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);

  // Devices + chosen deviceIds (multi-select)
  const [devices, setDevices] = useState([]);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState([]); // array of deviceId strings
  const [deviceDropdownOpen, setDeviceDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [customers, setCustomers] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [alert, setAlert] = useState(null);

  // close dropdown when clicking outside
  useEffect(() => {
    function onClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDeviceDropdownOpen(false);
      }
    }
    if (deviceDropdownOpen) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [deviceDropdownOpen]);

  // Fetch Customers
  const fetchCustomers = async () => {
    if (!clientEmail) return;
    setFetching(true);
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
    } finally {
      setFetching(false);
    }
  };

  // Fetch Devices
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

  useEffect(() => {
    fetchCustomers();
    fetchDevices();
  }, [clientEmail]);

  // Map customer to device (single device)
  const mapToOneDevice = async ({ deviceId, phone }) => {
    const payload = {
      deviceId,            // e.g. "NODE004"
      clientEmail,         // required by your endpoint
      customers: [phone],  // array of phone numbers
    };

    const res = await fetch("/api/clients/devices/mapp-device", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to map device");
    }
  };

// Add Customer, then (optionally) map to selected devices
const handleAddCustomer = async () => {
  if (!customerName || !phoneNumber) {
    alert("Please fill in all fields");
    return;
  }

  setLoading(true);
  try {
    // 👉 Build array of { deviceId, deviceName } from selectedDeviceIds
    const selectedDevices = selectedDeviceIds
      .map(id => {
        const d = devices.find(dev => dev.deviceId === id);
        return d ? { deviceId: d.deviceId, deviceName: d.deviceName } : null;
      })
      .filter(Boolean);

    // 1) Add customer (now sending device objects instead of just names)
    const res = await fetch("/api/clients/customer/add-customer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add",
        customerName,
        phoneNumber,
        clientEmail,
        devices: selectedDevices,   // 👈 send deviceId + deviceName array
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || "Failed to add customer");
    }

    // 2) If devices were chosen, map customer to each device
    if (selectedDeviceIds.length > 0) {
      const results = await Promise.allSettled(
        selectedDeviceIds.map(deviceId =>
          mapToOneDevice({ deviceId, phone: phoneNumber })
        )
      );
      const failures = results.filter(r => r.status === "rejected");
      if (failures.length > 0) {
        console.error(
          "⚠️ Some mappings failed:",
          failures.map(f => f.reason?.message || f.reason)
        );
        alert("Customer added, but mapping to one or more devices failed.");
      }
    }

    await fetchCustomers();

    setCustomerName("");
    setPhoneNumber("");
    setSelectedDeviceIds([]);
    setDeviceDropdownOpen(false);
    setIsModalOpen(false);
  } catch (err) {
    console.error("❌ Error adding customer:", err.message);
    alert(err.message || "Error adding customer");
  } finally {
    setLoading(false);
  }
};


  // Delete Customer (with confirmation)
  const confirmDelete = (customerId, customerName) => {
    setAlert({
      type: "warning",
      message: `Are you sure you want to delete ${customerName}?`,
      isConfirm: true,
      onConfirm: async () => {
        try {
          const res = await fetch("/api/clients/customer/delete-customer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ _id: customerId }),
          });

        if (!res.ok) throw new Error("Failed to delete customer");

          await fetchCustomers();
          setAlert({
            type: "success",
            message: "Customer deleted successfully",
          });
        } catch (err) {
          console.error("❌ Error deleting customer:", err.message);
          setAlert({
            type: "danger",
            message: "Error deleting customer",
          });
        }
      },
      onCancel: () => null,
    });
  };

  // Helpers for multiselect UI
  const isChecked = (deviceId) => selectedDeviceIds.includes(deviceId);
  const toggleDevice = (deviceId) => {
    setSelectedDeviceIds((prev) =>
      prev.includes(deviceId)
        ? prev.filter((id) => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const selectedLabel =
    selectedDeviceIds.length === 0
      ? "-- Choose devices --"
      : selectedDeviceIds
          .map(id => devices.find(d => d.deviceId === id)?.deviceName || id)
          .join(", ");

  return (
    <div className="p-6 bg-white rounded-xl shadow-md">
      {alert && (
        <Alert
          {...alert}
          onClose={() => setAlert(null)}
          onConfirm={() => {
            alert.onConfirm?.();
            setAlert(null);
          }}
          onCancel={() => {
            alert.onCancel?.();
            setAlert(null);
          }}
        />
      )}

      <div className="mt-4 mb-6">
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
        >
          + Add Customer
        </button>
      </div>

      {/* Customers List */}
      {fetching ? (
        <p className="text-gray-500">Loading customers...</p>
      ) : customers.length === 0 ? (
        <p className="text-gray-500">No customers found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {customers.map((cust) => (
            <div
              key={cust._id}
              className="relative bg-gray-50 border rounded-lg shadow-sm p-4 flex flex-col"
            >
              <button
                onClick={() => confirmDelete(cust._id, cust.customerName)}
                className="absolute top-2 right-2 text-red-500 hover:text-red-700"
              >
                <FaTrash size={14} />
              </button>

              <p className="text-sm font-semibold text-gray-800 mb-2">
                {cust.customerName}
              </p>
              <p className="text-sm text-gray-600">📞 {cust.phoneNumber}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-indigo-600">
              Add New Customer
            </h2>

            <div className="space-y-4">
              <div className="flex items-start gap-2 text-sm text-yellow-600 bg-yellow-50 border border-yellow-200 p-2 rounded">
                <FaInfoCircle className="mt-0.5 flex-shrink-0" />
                <p>
                  The user will receive a WhatsApp message with this name.
                  Please make sure the name is correct before saving.
                </p>
              </div>

              {/* Custom dropdown with checkboxes (stores deviceId) */}
              <div className="relative" ref={dropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Devices (optional)
                </label>

                <button
                  type="button"
                  onClick={() => setDeviceDropdownOpen((s) => !s)}
                  className="w-full px-3 py-2 border rounded-lg text-left focus:ring-2 focus:ring-indigo-400"
                >
                  <span className={selectedDeviceIds.length === 0 ? "text-gray-400" : ""}>
                    {selectedLabel}
                  </span>
                </button>

                {deviceDropdownOpen && (
                  <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-56 overflow-auto">
                    {devices.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-500">No devices</div>
                    ) : (
                      devices.map((d) => (
                        <label
                          key={d._id}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked(d.deviceId)}
                            onChange={() => toggleDevice(d.deviceId)}
                          />
                          <span className="text-sm text-gray-800">{d.deviceName}</span>
                        </label>
                      ))
                    )}
                    {devices.length > 0 && (
                      <div className="flex items-center justify-between px-3 py-2 border-t bg-gray-50">
                        <button
                          type="button"
                          className="text-xs text-indigo-600 hover:text-indigo-800"
                          onClick={() => setSelectedDeviceIds(devices.map(d => d.deviceId))}
                        >
                          Select all
                        </button>
                        <button
                          type="button"
                          className="text-xs text-gray-600 hover:text-gray-800"
                          onClick={() => setSelectedDeviceIds([])}
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-400"
                  placeholder="Enter customer name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-400"
                  placeholder="Enter phone number"
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
                onClick={handleAddCustomer}
                disabled={loading}
                className={`px-4 py-2 rounded-lg text-white ${
                  loading
                    ? "bg-indigo-400 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-500"
                }`}
              >
                {loading ? "Adding..." : "Add Customer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
