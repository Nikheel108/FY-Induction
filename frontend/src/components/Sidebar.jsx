import { Link, useNavigate } from "react-router-dom";
import { FaChartBar, FaSignOutAlt, FaUserGraduate, FaUsers } from "react-icons/fa";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const LINKS = [
  { to: "/admin/dashboard", label: "Dashboard", icon: FaChartBar },
  { to: "/admin/dashboard", label: "Students", icon: FaUserGraduate },
];

/**
 * Sidebar navigation used across the admin area. Responsive: collapses to a
 * top bar on small screens and toggles via the burger button.
 */
export default function Sidebar({ open, onClose }) {
  const { username, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.info("Logged out successfully.");
    navigate("/admin/login");
  };

  const content = (
    <>
      <div className="flex items-center gap-3 border-b border-slate-700/60 px-5 py-5">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary-600 text-white">
          <FaUsers />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-bold text-white">Admin Panel</p>
          <p className="text-xs text-slate-400">{username || "Administrator"}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {LINKS.map(({ to, label, icon: Icon }) => (
          <Link
            key={label}
            to={to}
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-700/50 hover:text-white"
          >
            <Icon /> {label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-slate-700/60 p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-red-600/20 hover:text-red-300"
        >
          <FaSignOutAlt /> Logout
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-slate-900 lg:flex">
        {content}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="w-64 bg-slate-900">{content}</div>
          <button
            type="button"
            className="flex-1 bg-slate-900/60"
            onClick={onClose}
            aria-label="Close sidebar"
          />
        </div>
      )}
    </>
  );
}
