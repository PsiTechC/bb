"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Sidebar from "@/components/utils/Sidebar";
import Topbar from "@/components/utils/Topbar";

import Dashboard from "@/components/admin/Dashboard";
import DevicesControl from "@/components/admin/DevicesControl";
import ManageClientsAdmin from "@/components/admin/ManageClients";
import DeviceClientMapping from "@/components/admin/DeviceClientMapping";

import DevicesClient from "@/components/clients/Devices";
import ManageClientsClient from "@/components/clients/ManageClients";

export default function DashboardPage() {
  const [role, setRole] = useState(null);
  const [selectedTab, setSelectedTab] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const router = useRouter();
  const [email, setEmail] = useState("");

  useEffect(() => {
    fetch("/api/auth/verify-token")
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        setRole(data.role);
        setEmail(data.email);

        if (data.role === "admin") {
          setSelectedTab("Dashboard");
        } else if (data.role === "client") {
          setSelectedTab("Devices");
        }
      })
      .catch(() => {
        router.push("/");
      });
  }, [router]);

  const renderContent = () => {
    if (role === "admin") {
      switch (selectedTab) {
        case "Dashboard":
          return <Dashboard />;
        case "Devices Control":
          return <DevicesControl />;
        case "Manage Clients":
          return <ManageClientsAdmin />;
        case "Client Device Mapping":
          return <DeviceClientMapping />;
        default:
          return null;
      }
    }

    if (role === "client") {
      switch (selectedTab) {
        case "Devices":
          return <DevicesClient clientEmail={email} />;
        case "Manage Customer":
          return <ManageClientsClient clientEmail={email} />;
        default:
          return null;
      }
    }
    return null;
  };

  if (role === null) return null;

  return (
    <div className="flex min-h-screen bg-[#fff] text-[#333]">
      <Sidebar
        role={role}
        onTabSelect={setSelectedTab}
        selectedTab={selectedTab}
        sidebarOpen={sidebarOpen}
      />

      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarOpen ? "ml-60" : "ml-0"
        }`}
      >
        <Topbar
          title={selectedTab}
          toggleSidebar={() => setSidebarOpen((prev) => !prev)}
          sidebarOpen={sidebarOpen}
          email={email}
          role={role}
        />

        <div className="p-6 pt-16 overflow-y-auto h-[calc(100vh-64px)] w-full overflow-x-hidden">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
