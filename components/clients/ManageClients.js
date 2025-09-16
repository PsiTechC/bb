"use client";
import { useState, useEffect } from "react";
import { FaTrash } from "react-icons/fa";
import Alert from "../utils/Alert";

export default function ManageClientsClient({ clientEmail }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [fetching, setFetching] = useState(false);

  const [alert, setAlert] = useState(null);

  // 🔹 Fetch Customers
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

  useEffect(() => {
    fetchCustomers();
  }, [clientEmail]);

  // 🔹 Add Customer
  const handleAddCustomer = async () => {
    if (!customerName || !phoneNumber) {
      alert("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/clients/customer/add-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          phoneNumber,
          clientEmail,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to add customer");
      }

      await fetchCustomers();

      setCustomerName("");
      setPhoneNumber("");
      setIsModalOpen(false);
    } catch (err) {
      console.error("❌ Error adding customer:", err.message);
      alert(err.message || "Error adding customer");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Delete Customer (with confirmation)
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
              {/* Delete button */}
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
