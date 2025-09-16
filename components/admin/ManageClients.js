"use client";
import { useState, useEffect } from "react";
import UserCard from "./UserCard";

export default function ManageClientsAdmin() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [fetching, setFetching] = useState(false);

  // 🔹 Fetch clients from API
  const fetchClients = async () => {
    setFetching(true);
    try {
      const res = await fetch("/api/admin/clients/get-clients");
      if (!res.ok) throw new Error("Failed to fetch clients");
      const data = await res.json();
      setClients(data.clients || []);
    } catch (err) {
      console.error("❌ Error fetching clients:", err.message);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // 🔹 Add client
  const handleAddClient = async () => {
    if (!clientName || !clientEmail) {
      alert("Please fill all fields");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/clients/add-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: clientName, email: clientEmail }),
      });

      if (!res.ok) throw new Error("Failed to add client");

      // ✅ reset + close modal + refresh list
      setClientName("");
      setClientEmail("");
      setIsModalOpen(false);
      await fetchClients();
    } catch (err) {
      console.error("❌ Error adding client:", err.message);
      alert("Error adding client");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-md relative">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
        >
          + Add Client
        </button>
      </div>

      {/* Clients Grid */}
      {fetching ? (
        <p className="text-gray-500">Loading clients...</p>
      ) : clients.length === 0 ? (
        <p className="text-gray-500">No clients found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => (
            <UserCard key={client._id} data={client} type="client" />
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-indigo-600">
              Add New Client
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Name
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-400"
                  placeholder="Enter client name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Email
                </label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-400"
                  placeholder="Enter client email"
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
                onClick={handleAddClient}
                disabled={loading}
                className={`px-4 py-2 rounded-lg text-white ${
                  loading
                    ? "bg-indigo-400 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-500"
                }`}
              >
                {loading ? "Adding..." : "Add Client"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
