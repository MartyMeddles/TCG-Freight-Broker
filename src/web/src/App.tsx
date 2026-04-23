import { useState, useCallback } from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "./components/Header";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import LoadBoard from "./pages/LoadBoard";
import ContractTracker from "./pages/ContractTracker";
import LaneDrilldown from "./pages/LaneDrilldown";
import Decisions from "./pages/Decisions";
import Parameters from "./pages/Parameters";
import Integrations from "./pages/Integrations";
import Users from "./pages/Users";
import Login from "./pages/Login";
import { systemApi } from "./services/api";
import { useLoadsHub } from "./hooks/useLoadsHub";
import "./index.css";

const TABS = [
  { label: "Dashboard", path: "/" },
  { label: "Load Board", path: "/board" },
  { label: "Contract Tracker", path: "/tracker" },
  { label: "Decisions Queue", path: "/decisions" },
  { label: "Parameters", path: "/parameters" },
  { label: "Integrations", path: "/integrations" },
  { label: "Users", path: "/users" },
];

function AppShell() {
  const location = useLocation();
  const qc = useQueryClient();

  const { data: sysStatus } = useQuery({
    queryKey: ["system", "auto-booking"],
    queryFn: () => systemApi.getAutoBookingStatus(),
  });

  const [autoMode, setAutoMode] = useState<boolean | null>(null);
  const effectiveAuto = autoMode ?? sysStatus?.isEnabled ?? false;

  const toggleMutation = useMutation({
    mutationFn: () => systemApi.toggleAutoBooking(),
    onSuccess: (result) => {
      setAutoMode(result?.isEnabled ?? false);
      qc.invalidateQueries({ queryKey: ["system", "auto-booking"] });
    },
  });

  const handleAutoModeChanged = useCallback((enabled: boolean) => {
    setAutoMode(enabled);
  }, []);

  useLoadsHub({ onAutoModeChanged: handleAutoModeChanged });

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F3F4F6', color: '#1F2937' }}>
      <Header autoMode={effectiveAuto} onAutoToggle={() => toggleMutation.mutate()} />
      <nav
        className="flex items-center gap-0 px-6 shrink-0"
        style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E5E7EB' }}
      >
        {TABS.map((t) => {
          const active = t.path === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(t.path);
          return (
            <Link
              key={t.path}
              to={t.path}
              className="px-5 py-3 text-sm font-medium border-b-2 transition-colors"
              style={{
                borderBottomColor: active ? '#1D4ED8' : 'transparent',
                color: active ? '#1D4ED8' : '#6B7280',
              }}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="board" element={<LoadBoard />} />
          <Route path="tracker" element={<ContractTracker />} />
          <Route path="tracker/:id" element={<LaneDrilldown />} />
          <Route path="decisions" element={<Decisions />} />
          <Route path="parameters" element={<Parameters />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="users" element={<Users />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/*" element={<AppShell />} />
      </Route>
    </Routes>
  );
}
