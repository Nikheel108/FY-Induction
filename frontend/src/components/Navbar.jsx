import { Link } from "react-router-dom";
import { FaGraduationCap } from "react-icons/fa";

/**
 * Public site navigation bar shown on the non-admin pages.
 * Only includes the registration button – admin link is removed.
 */
export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 sm:gap-3">
          <img
            src="/logo.png"
            alt="MITAOE Logo"
            className="h-8 sm:h-10 w-auto object-contain flex-shrink-0"
          />
          <span className="leading-tight">
            <span className="block text-xs sm:text-sm font-extrabold text-slate-900 truncate max-w-[150px] sm:max-w-none">
              MIT Academy of Engineering
            </span>
            <span className="block text-[10px] sm:text-xs text-slate-500 truncate max-w-[150px] sm:max-w-none">
              First Year Induction Program
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          <Link to="/register" className="btn-primary !px-3 !py-2 !text-xs sm:!px-5 sm:!py-2.5 sm:!text-sm whitespace-nowrap">
            Register Now
          </Link>
          {/* Admin link removed */}
        </nav>
      </div>
    </header>
  );
}