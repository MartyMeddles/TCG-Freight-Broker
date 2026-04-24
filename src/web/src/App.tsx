import { useState, useCallback, useRef, useEffect } from "react";
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
import ClientImport from "./pages/ClientImport";
import Login from "./pages/Login";
import { systemApi } from "./services/api";
import { useLoadsHub } from "./hooks/useLoadsHub";
import "./index.css";

const MAIN_TABS = [
  { label: "Dashboard", path: "/" },
  { label: "Load Board", path: "/board" },
];

const ADMIN_TABS = [
  { label: "Contract Tracker", path: "/tracker" },
  { label: "Decisions Queue", path: "/decisions" },
  { label: "Parameters", path: "/parameters" },
  { label: "Integrations", path: "/integrations" },
  { label: "Users", path: "/users" },
  { label: "Client Import", path: "/import" },
];

function AppShell() {
  const location = useLocation();
  const qc = useQueryClient();
  const [adminOpen, setAdminOpen] = useState(false);
  const adminRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (adminRef.current && !adminRef.current.contains(e.target as Node)) {
        setAdminOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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
        {/* Main tabs */}
        {MAIN_TABS.map((t) => {
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

        {/* Admin dropdown — pushed to the right */}
        <div ref={adminRef} className="relative ml-auto">
          {(() => {
            const adminActive = ADMIN_TABS.some(t => location.pathname.startsWith(t.path));
            return (
              <button
                onClick={() => setAdminOpen(o => !o)}
                className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors"
                style={{
                  borderBottomColor: adminActive ? '#0369A1' : 'transparent',
                  color: adminActive ? '#0369A1' : '#6B7280',
                }}
              >
                🔧 Admin
                <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={adminOpen ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                </svg>
              </button>
            );
          })()}
          {adminOpen && (
            <div
              className="absolute right-0 top-full mt-0 w-48 rounded-b-lg shadow-lg z-50 py-1"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderTop: 'none' }}
            >
              {ADMIN_TABS.map((t) => {
                const active = location.pathname.startsWith(t.path);
                return (
                  <Link
                    key={t.path}
                    to={t.path}
                    onClick={() => setAdminOpen(false)}
                    className="block px-4 py-2.5 text-sm transition-colors"
                    style={{
                      backgroundColor: active ? '#EFF6FF' : 'transparent',
                      color: active ? '#1D4ED8' : '#374151',
                      fontWeight: active ? 600 : 400,
                    }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = '#F9FAFB'; }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                  >
                    {t.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
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
          <Route path="import" element={<ClientImport />} />
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
