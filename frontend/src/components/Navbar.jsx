import { useState } from "react";
import { Link } from "react-router-dom";
import { FaGraduationCap, FaBars, FaTimes } from "react-icons/fa";

/**
 * Public site navigation bar shown on the non-admin pages.
 * Only includes the registration button – admin link is removed.
 */
export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

        {/* Desktop Nav */}
        <nav className="hidden sm:flex items-center gap-4">
          <Link to="/attendance" className="text-sm font-semibold text-slate-600 hover:text-primary-600 transition-colors">
            Attendance
          </Link>
          <Link to="/highlights" className="text-sm font-semibold text-slate-600 hover:text-primary-600 transition-colors">
            Highlights
          </Link>
          <Link to="/register" className="btn-primary !px-5 !py-2.5 !text-sm whitespace-nowrap ml-2">
            Register Now
          </Link>
        </nav>

        {/* Mobile Hamburger */}
        <button
          className="sm:hidden text-slate-600 hover:text-primary-600 p-2 text-xl"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <nav className="sm:hidden bg-white border-t border-slate-100 shadow-lg absolute w-full left-0 top-full flex flex-col p-4 gap-4 animate-fade-up">
          <Link 
            to="/attendance" 
            className="text-base font-semibold text-slate-700 hover:text-primary-600"
            onClick={() => setMobileMenuOpen(false)}
          >
            Attendance
          </Link>
          <Link 
            to="/highlights" 
            className="text-base font-semibold text-slate-700 hover:text-primary-600"
            onClick={() => setMobileMenuOpen(false)}
          >
            Highlights
          </Link>
          <Link 
            to="/register" 
            className="btn-primary w-full justify-center !py-3"
            onClick={() => setMobileMenuOpen(false)}
          >
            Register Now
          </Link>
        </nav>
      )}
    </header>
  );
}