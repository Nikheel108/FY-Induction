import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  FaChartBar,
  FaSignOutAlt,
  FaUsers,
  FaClipboardCheck,
  FaBullhorn,
  FaImage,
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaCommentDots,
} from "react-icons/fa";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const LINKS = [
  { to: "/admin/dashboard", label: "Dashboard", icon: FaChartBar },
  { to: "/admin/upload-students", label: "Upload Students", icon: FaUsers },
  { to: "/admin/attendance", label: "Attendance", icon: FaClipboardCheck },
  { to: "/admin/sessions", label: "Event Sessions", icon: FaCalendarAlt },
  // { to: "/admin/contact-queries", label: "Contact Queries", icon: FaCommentDots },
  { to: "/admin/highlights", label: "Highlights", icon: FaImage },
  { to: "/admin/broadcast", label: "Broadcast", icon: FaBullhorn },
  { to: "/admin/contact-queries", label: "Contact Queries", icon: FaCommentDots }
];

/**
 * Sidebar navigation used across the admin area.
 * Desktop view is minimizable (collapsible) with a toggle button at the bottom.
 * Mobile view collapses into a sliding drawer.
 */
export default function Sidebar({ open, onClose }) {
  const { username, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("admin_sidebar_collapsed") === "true";
  });

  useEffect(() => {
    localStorage.setItem("admin_sidebar_collapsed", isCollapsed ? "true" : "false");
  }, [isCollapsed]);

  const handleLogout = () => {
    logout();
    toast.info("Logged out successfully.");
    navigate("/admin/login");
  };

  const renderContent = (collapsed = false) => (
    <div className="flex h-full flex-col justify-between">
      <div>
        {/* Header */}
        <div className={`flex items-center border-b border-slate-800 py-4 transition-all duration-300 ${collapsed ? "justify-center px-2" : "gap-3 px-5"}`}>
          <img
            src="/logo.png"
            alt="MITAOE Logo"
            className="h-9 w-auto object-contain bg-white/10 p-1 rounded-lg flex-shrink-0"
          />
          {!collapsed && (
            <div className="leading-tight overflow-hidden whitespace-nowrap">
              <p className="text-sm font-bold text-white truncate">Admin Panel</p>
              <p className="text-xs text-slate-400 truncate">{username || "Administrator"}</p>
            </div>
          )}
        </div>

        {/* Links */}
        <nav className="flex-1 space-y-1.5 px-3 py-4">
          {LINKS.map(({ to, label, icon: Icon }) => {
            const isActive = location.pathname === to || (to !== "/admin/dashboard" && location.pathname.startsWith(to));
            return (
              <Link
                key={label}
                to={to}
                onClick={onClose}
                title={collapsed ? label : undefined}
                className={`flex items-center rounded-xl py-3 text-sm font-medium transition-all duration-200 ${
                  collapsed ? "justify-center px-0" : "gap-3 px-3.5"
                } ${
                  isActive
                    ? "bg-primary-600 text-white shadow-md shadow-primary-600/30"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className={`text-base flex-shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / Bottom Actions */}
      <div className="border-t border-slate-800 p-3 space-y-1.5">
        <button
          type="button"
          onClick={handleLogout}
          title={collapsed ? "Logout" : undefined}
          className={`flex w-full items-center rounded-xl py-2.5 text-sm font-medium text-slate-300 transition-all duration-200 hover:bg-red-600/20 hover:text-red-300 ${
            collapsed ? "justify-center px-0" : "gap-3 px-3.5"
          }`}
        >
          <FaSignOutAlt className="text-base flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>

        {/* Toggle Collapse/Expand Button (Desktop only) */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          className={`hidden lg:flex w-full items-center rounded-xl py-2.5 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition-all duration-200 ${
            collapsed ? "justify-center px-0" : "justify-between px-3.5"
          }`}
        >
          {!collapsed && <span>Collapse Menu</span>}
          {collapsed ? (
            <FaChevronRight className="text-sm" />
          ) : (
            <FaChevronLeft className="text-sm" />
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar (Minimizable / Expandable) */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col bg-slate-900 transition-all duration-300 lg:flex ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {renderContent(isCollapsed)}
      </aside>

      {/* Mobile drawer (Always full-width drawer when open) */}
      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="w-64 bg-slate-900 shadow-2xl animate-fade-in">
            {renderContent(false)}
          </div>
          <button
            type="button"
            className="flex-1 bg-slate-950/70 backdrop-blur-sm"
            onClick={onClose}
            aria-label="Close sidebar"
          />
        </div>
      )}
    </>
  );
}
