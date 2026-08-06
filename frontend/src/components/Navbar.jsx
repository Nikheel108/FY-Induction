import { Link } from "react-router-dom";
import { FaGraduationCap, FaUserShield } from "react-icons/fa";

/**
 * Public site navigation bar shown on the non-admin pages.
 */
export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary-700 text-white">
            <FaGraduationCap className="text-xl" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-extrabold text-slate-900">
              MIT Academy of Engineering
            </span>
            <span className="block text-xs text-slate-500">
              First Year Induction Program
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-3">
          <Link to="/register" className="btn-primary">
            Register Now
          </Link>
          <Link
            to="/admin/login"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            <FaUserShield /> Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
