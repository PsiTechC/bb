"use client";
import { useState } from "react";
import Alert from "@/components/utils/Alert";

export default function UserCard({ data, type }) {
  // For clients → status = granted/restricted
  // For devices → status = active/inactive
  const initialEnabled =
    type === "client"
      ? data.status !== "restricted"
      : data.status === "active";

  const [enabled, setEnabled] = useState(initialEnabled);
  const [alert, setAlert] = useState(null);

  const requestStatusChange = () => {
    const newStatus =
      type === "client"
        ? enabled
          ? "restricted"
          : "granted"
        : enabled
        ? "inactive"
        : "active";

    setAlert({
      type: "warning",
      message: `Are you sure you want to ${
        type === "client"
          ? enabled
            ? "disable"
            : "enable"
          : enabled
          ? "mark as inactive"
          : "mark as active"
      } this ${type}?`,
      isConfirm: true,
      onConfirm: async () => {
        const endpoint =
          type === "client"
            ? "/api/admin/clients/update-client-access"
            : "/api/admin/device/update-device-status";

        const payload =
          type === "client"
            ? { email: data.email, status: newStatus }
            : { deviceId: data.deviceId, status: newStatus };

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          setEnabled(!enabled);
          setAlert({
            type: "success",
            message: `${type === "client" ? "User" : "Device"} ${
              type === "client"
                ? enabled
                  ? "disabled"
                  : "enabled"
                : enabled
                ? "marked inactive"
                : "marked active"
            } successfully.`,
          });
        } else {
          setAlert({
            type: "danger",
            message: `Failed to update ${type} access.`,
          });
        }
      },
      onCancel: () => null,
    });
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-4 mb-4 w-full max-w-md relative">
      {alert && (
        <div className="absolute top-2 right-2 z-50">
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
        </div>
      )}

      {type === "client" ? (
        <>
          <div className="text-md font-semibold text-gray-800 mb-1">
            {data.email}
          </div>
          <div className="text-sm text-gray-600 mb-1">
            <strong>Role:</strong> {data.role}
          </div>
          <div className="text-sm text-gray-600 mb-3">
            <strong>Created:</strong>{" "}
            {new Date(data.createdAt).toLocaleString()}
          </div>
        </>
      ) : (
        <>
          <div className="text-md font-semibold text-gray-800 mb-1">
            {data.name} ({data.deviceId})
          </div>
          {data.description && (
            <div className="text-sm text-gray-600 mb-3">
              <strong>Description:</strong> {data.description}
            </div>
          )}
          <div className="text-sm text-gray-600 mb-3">
            <strong>Created:</strong>{" "}
            {new Date(data.createdAt).toLocaleString()}
          </div>
        </>
      )}

      <div className="flex justify-end">
        <button
          onClick={requestStatusChange}
          className={`text-sm px-4 py-1 rounded ${
            enabled
              ? "bg-green-500 hover:bg-green-600"
              : "bg-gray-400 hover:bg-gray-500"
          } text-white`}
        >
          {type === "client"
            ? enabled
              ? "Disable"
              : "Enable"
            : enabled
            ? "Active"
            : "Inactive"}
        </button>
      </div>
    </div>
  );
}
